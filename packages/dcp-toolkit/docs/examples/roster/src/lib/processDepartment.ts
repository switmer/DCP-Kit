import { inngest } from "@/inngest/inngest.client";
import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import { parsePhoneNumber } from "libphonenumber-js";
import { makeName } from "./utils";
import { processRole } from "./processRole";
import * as Sentry from "@sentry/nextjs";

interface Member {
  call_time: string;
  email: string;
  location: string;
  name: string;
  phone: string;
  title: string;
  department: string;
}

async function findOrCreateProjectPosition(
  member: Member,
  projectMemberId: number,
  projectId: string,
  supabase: SupabaseClient<Database>
) {
  const { data: existingPosition } = await supabase
    .from("project_position")
    .select("*, project_member(*)")
    .eq("project", projectId)
    .eq("project_member", projectMemberId)
    .eq("title", member.title)
    .single();

  if (existingPosition) {
    return existingPosition;
  }

  const { data: newPosition, error: insertError } = await supabase
    .from("project_position")
    .insert({
      title: member.title,
      department: member.department,
      project_member: projectMemberId,
      project: projectId,
    })
    .select("*, project_member(*)")
    .single();

  if (insertError) {
    Sentry.captureException(insertError);
  }

  return newPosition;
}

async function processProjectMembersAndPositions(
  people: Member[],
  projectId: string,
  supabase: SupabaseClient<Database>
) {
  const { data: existingMembers } = await supabase
    .from("project_member")
    .select("id, name, email, phone")
    .eq("project", projectId);

  const newProjectMembers = people
    .filter((member) => {
      const email = member?.email?.trim();
      let phone = null;

      try {
        phone = member?.phone?.trim()
          ? parsePhoneNumber(member.phone.trim(), "US")?.formatInternational()
          : null;
      } catch (error) {
        phone = null;
      }

      const shouldCreate = !existingMembers?.some(
        (existing) =>
          (email && existing.email === email) ||
          (phone && existing.phone === phone) ||
          existing.name === member.name
      );

      return shouldCreate;
    })
    .map((member) => {
      let phone = null;

      try {
        phone = member?.phone?.trim()
          ? parsePhoneNumber(member.phone.trim(), "US")?.formatInternational()
          : null;
      } catch (error) {
        phone = null;
      }

      return {
        name: member?.name,
        email: member?.email?.trim() || null,
        phone,
        project: projectId,
      };
    });

  const { data: insertedMembers, error: insertError } = await supabase
    .from("project_member")
    .insert(newProjectMembers)
    .select("*");

  if (insertError) {
    Sentry.captureException(insertError);
  }

  const allMembers = [...(insertedMembers || []), ...(existingMembers || [])];

  const projectPositions = await Promise.all(
    people.map(async (person) => {
      const matchingMember = allMembers.find((m) => {
        return person.name === m.name;
      });

      if (!matchingMember) {
        return;
      }

      return findOrCreateProjectPosition(
        person,
        matchingMember.id,
        projectId,
        supabase
      );
    })
  );

  const memberPositionMap = new Map();

  projectPositions.forEach((position) => {
    if (!position) return;

    const member = position.project_member;

    if (member?.name)
      memberPositionMap.set(
        `name:${member.name}:title:${position.title}`,
        position
      );
  });

  return memberPositionMap;
}

export async function processDepartment(
  data: any,
  company: string,
  body: any,
  supabase: SupabaseClient<Database>
) {
  const members = [];
  const people: Member[] = data?.result?.json?.people || [];

  const memberPositionMap = await processProjectMembersAndPositions(
    people,
    body.project,
    supabase
  );

  for (const member of people) {
    let phone;

    try {
      phone = member?.phone?.trim()
        ? parsePhoneNumber(member.phone.trim(), "US")?.formatInternational()
        : null;
    } catch (error) {
      phone = null;
    }

    const existingProjectPosition = memberPositionMap.get(
      `name:${member.name}:title:${member.title}`
    );

    const department = data?.result?.json?.departments?.find(
      (d: any) => d.name === member?.department
    );

    members.push({
      call_time: member?.call_time ?? department?.default_call_time,
      company,
      call_sheet: body.id,
      project: body.project,
      project_position: existingProjectPosition?.id || null,
    });
  }

  const { data: existing_call_sheet_members } = await supabase
    .from("call_sheet_member")
    .select("id, project_position")
    .eq("company", company)
    .eq("call_sheet", body.id);

  const newMembers = members.filter(
    (member) =>
      !existing_call_sheet_members?.some(
        (existing) => existing.project_position === member.project_position
      )
  );

  const { data: insertedMembers } = await supabase
    .from("call_sheet_member")
    .insert(
      newMembers.map((member, index) => {
        return {
          ...member,
          order: index + 1,
        };
      })
    )
    .select("*, project_position(*, project_member(*))");

  await Promise.all(
    insertedMembers?.map(async (inserted) => {
      try {
        const phone = inserted?.project_position?.project_member?.phone;
        const email = inserted?.project_position?.project_member?.email;
        const member = {
          /* @ts-ignore */
          ...(inserted?.project_position?.project_member || {}),
          title: inserted?.project_position?.title,
        };
        const department = inserted?.project_position?.department;
        const call_sheet_member = inserted.id;

        /* Find crew member */
        const { data: found_crew_members } = await supabase
          .from("company_crew_member")
          .select()
          .eq("company", company)
          .or(`phone.eq.${phone},email.eq.${email}`);

        let crew_member = (found_crew_members ?? [])?.[0];

        if (!crew_member && (email || phone)) {
          const [first_name, last_name] = makeName(
            /* @ts-ignore */
            member?.name
          );

          const newCrewMemberData = await supabase
            .from("company_crew_member")
            .insert({
              company,
              email: email ? email : null,
              phone: phone ? phone : null,
              /* @ts-ignore */
              name: member?.name,
              first_name,
              last_name,
            })
            .select();

          if (newCrewMemberData?.data?.[0]) {
            crew_member = newCrewMemberData?.data?.[0];
          }
        }

        if (crew_member) {
          /* Update call sheet member with crew */
          await supabase
            .from("call_sheet_member")
            .update({ crew_member: crew_member?.id })
            .eq("id", call_sheet_member);

          await supabase
            .from("project_member")
            .update({ crew: crew_member?.id })
            .eq("id", inserted?.project_position?.project_member?.id as number);

          /* Process role */
          await processRole(
            /* @ts-ignore */
            member,
            crew_member,
            [department ?? ""].flat(),
            supabase
          );
        }
      } catch (e) {
        Sentry.captureException(e);
      }
    }) ?? []
  );
}
