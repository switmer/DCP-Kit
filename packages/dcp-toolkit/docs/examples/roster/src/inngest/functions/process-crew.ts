import { createClient } from "@supabase/supabase-js";
import { inngest } from "../inngest.client";
import * as Sentry from "@sentry/nextjs";
import { makeName } from "@/lib/utils";
import { processRole } from "@/lib/processRole";

export const processCrew = inngest.createFunction(
  {
    id: "process-crew",
    retries: 0,
    throttle: {
      limit: 1,
      period: "1s",
    },
  },
  { event: "callsheet/crew" },
  async ({ event, step }) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    const { company, phone, email, member, department, call_sheet_member } =
      event.data;

    const { data: found_crew_members } = await step.run(
      "Find crew member",
      async () => {
        return await supabase
          .from("company_crew_member")
          .select()
          .eq("company", company)
          .or(`phone.eq.${phone},email.eq.${email}`);
      }
    );

    let crew_member = (found_crew_members ?? [])?.[0];

    if (!crew_member) {
      const newCrewMemberData = await step.run(
        "Crew member not found, check if we can create a new one",
        async () => {
          if (!email && !phone) {
            return null;
          }

          const [first_name, last_name] = makeName(member?.name);

          return await supabase
            .from("company_crew_member")
            .insert({
              company,
              email: email ? email : null,
              phone: phone ? phone : null,
              name: member?.name,
              first_name,
              last_name,
            })
            .select();
        }
      );

      crew_member = newCrewMemberData?.data?.[0];

      if (!crew_member) {
        return {
          success: true,
          message: "No email or phone, not creating crew member",
        };
      }
    } else {
      await step.run("Crew member found, run updates", async () => {
        const shouldUpdateAliases =
          !crew_member?.aliases?.includes(member?.name) &&
          crew_member?.name?.trim() !== member?.name?.trim();

        const updates: Record<string, string[]> = {};

        if (shouldUpdateAliases) {
          updates.aliases = [
            ...(crew_member?.aliases ?? []),
            member?.name?.trim(),
          ];
        }

        if (Object.keys(updates).length > 0) {
          await supabase
            .from("company_crew_member")
            .update(updates)
            .eq("id", crew_member?.id);
        }
      });
    }

    await step.run("Update call sheet member with crew", async () => {
      return await supabase
        .from("call_sheet_member")
        .update({ crew_member: crew_member?.id })
        .eq("id", call_sheet_member);
    });

    await step.run("Process role", async () => {
      try {
        return await processRole(
          member,
          crew_member,
          [department]?.flat(),
          supabase
        );
      } catch (e) {
        Sentry.captureException(e);
      }
    });

    return { success: true };
  }
);
