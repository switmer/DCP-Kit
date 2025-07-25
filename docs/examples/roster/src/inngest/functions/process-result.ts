import { createClient } from "@supabase/supabase-js";
import { inngest } from "../inngest.client";
import { NonRetriableError } from "inngest";
import { processDepartment } from "@/lib/processDepartment";
import { sendSlackAlert } from "@/lib/slack";
import { ProjectType } from "@/types/type";
import { getGooglePlaceDetailsServerSide } from "@/lib/google-places-api/getGooglePlaceDetailsServerSide";

let callSheetId: string;

export const processCallSheet = inngest.createFunction(
  {
    id: "process-call-sheet",
    retries: 2,
    throttle: { limit: 5, period: "30s" },
    onFailure: async ({ error, event }) => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE!
      );

      await supabase.from("call_sheet").upsert({
        id: callSheetId,
        status: "error",
      });

      if (
        !process.env.SLACK_TOKEN ||
        !process.env.SLACK_ALERT_CHANNEL ||
        process.env.NODE_ENV !== "production"
      )
        return;
      const originalEvent = event.data.event;

      const msg = originalEvent.data.id
        ? `:x: *Process call sheet failed*\n• ID: \`${
            originalEvent.data.id
          }\`\n• Error: \`${error.toString()}\``
        : `:x: *Process call sheet failed*\n• Type: Internally parsed sheet\n• Error: \`${error.toString()}\``;

      const result = await sendSlackAlert(msg);

      return result;
    },
  },
  { event: "callsheet/process" },
  async ({ event, step }) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    if (!event.data.result) {
      throw new NonRetriableError("No json result.");
    }

    const shouldUpdateProjectDates = !!event.data.result?.full_date;

    const { data: csData, error: csError } = await step.run(
      "Fetch call sheet",
      async () => {
        return await supabase
          .from("call_sheet")
          .update({
            status: "processing",
          })
          .eq("id", event.data.id)
          .select(
            `
              id,
              company,
              project(id, name, dates)
            `
          )
          .single();
      }
    );

    callSheetId = csData?.id;

    if (csError || !csData) {
      throw new NonRetriableError(
        csError?.message ?? "Failed to get call sheet data."
      );
    }

    const targetProject: ProjectType = await step.run(
      "Get project",
      async () => {
        // 1. If csData.project exists, use that
        let result = csData.project as unknown as ProjectType;

        if (!result) {
          // 2. Try to find a project by name, if exists use that
          const { data: projects } = await supabase
            .from("project")
            .select()
            .eq("company", csData.company)
            .eq("name", event.data.result?.job_name);

          result = projects?.[0];
        }

        if (!result) {
          // 3. If it does not exist, create a new one
          const { data: projects } = await supabase
            .from("project")
            .insert({
              company: csData.company,
              name: event.data.result?.job_name,
            })
            .select();

          result = projects?.[0];
        }

        return result;
      }
    );

    await step.run("Process/create notes", async () => {
      return await supabase
        .from("note")
        .insert(
          event?.data?.result?.notes_and_instructions?.map(
            (n: { title: string; body: string }) => ({
              note: n.body,
              title: n.title,
              project: targetProject?.id,
              call_sheet: csData.id,
            })
          )
        )
        .select();
    });

    await step.run("Process locations", async () => {
      const locations =
        event?.data?.result?.locations?.filter((l: any) => !!l) || [];

      const { data: existingLocations } = await supabase
        .from("location")
        .select("*")
        .eq("company", csData.company)
        .in(
          "address",
          Array.from(new Set(locations.map((l: any) => l.address)))
        );

      const addressToIdMap = new Map<string, string>();

      existingLocations?.forEach((loc) => {
        addressToIdMap.set(loc.address, loc.id);
      });

      const newLocations = locations.filter(
        (l: any) => !addressToIdMap.has(l.address)
      );

      //— fetch detailed place data for new locations
      const placesDataPromises = newLocations.map(async (location: any) => {
        const placeDetails = location.address
          ? await getGooglePlaceDetailsServerSide(location.address)
          : null;

        return {
          company: csData.company,
          address: location?.address,
          places_json: JSON.stringify(placeDetails?.result || {}), //-- store the place data as json.
          // description: location.description,
          // name: location.name,
          // instructions: location.instructions_or_notes,
          // type: location.type,
        };
      });

      const locationsWithPlacesData = await Promise.all(placesDataPromises);

      const { data: insertedLocations, error: insertError } = await supabase
        .from("location")
        .insert(locationsWithPlacesData)
        .select("*");

      if (insertError) {
        throw new NonRetriableError(
          `Failed to insert new locations: ${insertError.message}`
        );
      }

      insertedLocations.forEach((loc) => {
        addressToIdMap.set(loc.address, loc.id);
      });

      const allLocationIds = locations
        .map((l: any) => addressToIdMap.get(l.address))
        .filter(Boolean) as string[];

      const { data: existingProjectLocations } = await supabase
        .from("call_sheet_location")
        .select("location, project, call_sheet")
        .eq("project", targetProject?.id)
        .eq("call_sheet", csData.id)
        .in("location", allLocationIds);

      const existingProjLocSet = new Set(
        existingProjectLocations?.map(
          (pl) => `${pl.location}-${pl.project}-${pl.call_sheet}`
        ) ?? []
      );

      const newProjectLocations = allLocationIds
        .map((locId) => {
          const originalLocation = locations.find(
            (l: any) => addressToIdMap.get(l.address) === locId
          );

          return {
            location: locId,
            project: targetProject?.id,
            call_sheet: csData.id,
            description: originalLocation.description,
            name: originalLocation.name,
            instructions: originalLocation.instructions_or_notes,
            type: originalLocation.type,
          };
        })
        .filter(
          (pl) =>
            !existingProjLocSet.has(
              `${pl.location}-${pl.project}-${pl.call_sheet}`
            )
        );

      if (newProjectLocations.length > 0) {
        return await supabase
          .from("call_sheet_location")
          .insert(newProjectLocations);
      }

      return {};
    });

    await step.run("Process crew and meta", async () => {
      await Promise.all([
        await processDepartment(
          {
            result: {
              json: event.data.result,
            },
          },
          csData.company,
          { id: csData.id, project: targetProject?.id },
          supabase
        ),
        shouldUpdateProjectDates
          ? await supabase
              .from("project")
              .update({
                dates: [
                  /* @ts-ignore */
                  ...new Set([
                    ...(targetProject?.dates ?? []),
                    event.data.result?.full_date,
                  ]),
                ],
              })
              .eq("id", targetProject.id)
          : Promise.resolve(),
        await supabase
          .from("call_sheet")
          .update({
            status: "ready",
            date: event.data.result?.full_date,
            project: targetProject?.id,
            raw_json: event.data.result ?? {},
          })
          .eq("id", csData.id),
      ]);
    });

    return { event };
  }
);
