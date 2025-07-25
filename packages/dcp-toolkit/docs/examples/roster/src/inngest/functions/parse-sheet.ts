import { createClient } from "@supabase/supabase-js";
import { inngest } from "../inngest.client";
import xior from "xior";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { sendSlackAlert } from "@/lib/slack";
import { CallsheetSchema, PeopleSchema } from "@/lib/schemas/callsheet";
import _ from "lodash";
import { NonRetriableError } from "inngest";
import { llamaParser } from "@/lib/llamaparser";

const openai = new OpenAI();

const axios = xior.create();

let callSheetId: string;

export const parseCallSheet = inngest.createFunction(
  {
    id: "parse-call-sheet",
    retries: 0,
    concurrency: 3,
    throttle: {
      limit: 5,
      period: "30s",
    },
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

      const result = await sendSlackAlert(
        [
          "*⚠️ Call Sheet Parse Failed*",
          "",
          `*Company:* \`${originalEvent.data.company}\``,
          `*Project:* ${
            originalEvent.data.project || "_No project specified_"
          }`,
          `*File:* \`${originalEvent.data.path}\``,
          "",
          "*Error:*",
          "```",
          error.toString(),
          "```",
        ].join("\n")
      );

      return result;
    },
  },
  { event: "callsheet/parse" },
  async ({ event, step }) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    const { data } = await step.run(
      "Insert call sheet into database",
      async () => {
        return await supabase
          .from("call_sheet")
          .insert({
            src: event.data.path,
            company: event.data.company,
            historical: event.data.historical,
            status: "parsing",
            project: event.data.project ?? null,
            bulk_upload: event.data.bulkJobId ?? null,
          })
          .select()
          .single();
      }
    );

    callSheetId = data?.id;

    const md = await step.run("Download PDF and extract text", async () => {
      const { data: src, error } = await supabase.storage
        .from("call-sheets")
        .createSignedUrl(event.data.path ?? "", 60 * 60 * 24);

      if (!src || !src.signedUrl) {
        throw new NonRetriableError(
          error?.message ?? "Failed to get signed URL for the callsheet."
        );
      }

      const { response } = await axios.get(src.signedUrl, {
        responseType: "stream",
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      const blob = new Blob([buffer], { type: "application/pdf" });

      const markdown = await llamaParser(
        blob,
        event.data.path?.split("/")?.[1]
      );

      return markdown;
    });

    const result = await step.run("Process with gpt-4o", async () => {
      return parseCallSheetPart(md);
    });

    await step.run("Process parsed callsheet", async () => {
      return await inngest.send({
        name: "callsheet/process",
        data: {
          id: data.id,
          result,
        },
      });
    });

    return { success: true };
  }
);

export const parseCallSheetPart = async (md: string) => {
  const callSheetPrompt = `
  You are a helpful assistant with extensive background in Film & Commercial Production. You know all about call sheets, industry lingo, terminology & code words. You use plain language & get right to the point. Your task is to extract specific information from the provided call sheet markdown and organize it into the structured data.

  ### **Key Information to Extract:**
  1. **Basic Details:** "day_of_days", "full_date", "job_name", and "general_crew_call".
  2. **Locations:** Extract and categorize each location with relevant details like "description", "name", "address", and "type". Include any specific instructions or notes for each location.
  3. **Notes & Instructions:** Capture all relevant notes or instructions in a structured manner. Group similar information together (within reason) and create distinct notes where needed. Ie: Could be notes/details on the call sheet re: parking instructions, general production notes, safety notes, set conditions (ie: animals or water on set, etc), did I mention parking instructions?, etc.
  4. **Schedule:** Include "crew_call", "department_calls", "meal_times", and scene details.
  5. **Weather Information:** Extract and format weather data including condition, humidity, sunrise/sunset, and temperature.
  6. **Departments:** List all departments and output results in the order they appear in the document please!
  7. **Key Contacts:** Extract roles, names, and phone numbers for key contacts. Focus on the primary points of contact listed at the very top or header of the call sheet. These are the key individuals that crew members should contact for critical information about the production. Do not include the general crew list here.
  8. Output things in the order they appear in the document please!

  ### **Formatting Rules:**
  1. **Dates:** "MM/dd/yy" (e.g., 09/20/24).
  2. **Times:** 
    - Use 12-hour format with "AM" or "PM" (e.g., 7:00 AM) when possible.
    - If the time is something OTHER than a time, ie: O/C (on call) - use that (but only it's explicitly stated). If there ARE no call times for someone - do not hallucinate one.
  3. **Phone Numbers:** "(555) 555-5555".

  ### **Additional Instructions:**
  - Ensure notes are appropriately categorized and titled, avoiding overly broad groupings.
  - Highlight any specific logistics, parking, travel, or safety-related instructions.

  ### **Markdown to analyze:**
    ${md}
  `;

  const peoplePrompt = (chunk: string) => `
  Please aim to get ALL contacts listed on the call sheet document into your response, including both CREW and CAST members.
  Extract all the people from the provided call sheet markdown, including:
  - All department crew members
  - Main cast/talent
  - Extra talent/background actors
  - Any other listed personnel

  If a person is listed under multiple departments or roles (e.g., both as Director and Actor), create a record for each instance.
  Never hallucinate emails or phone numbers or call times(unless falling back to a department default call time). Only represent the data for each contact that is available on the call sheet. If no phone or email is found, leave it blank.
  Output things in the order they appear in the document please!

  ### **Important Considerations:** 
  The Markdown provided is generated from a PDF using OCR. This process can introduce inaccuracies and formatting issues. For example:
    - Multiple people's information might be combined into a single table row
    - Multiple contacts might be merged into a single table row or misaligned within the markdown structure.
    - Text might be misaligned or split across unexpected elements
    - Some characters or words might be misinterpreted
  Please use your judgment and common sense to accurately interpret and structure the data despite these potential inconsistencies. You should use your understanding of call sheet structures to interpret this imperfect markdown text as a human would, making reasonable inferences where necessary.

    *Strict Formatting Rules:*
    1. Times: 
    - Use 12-hour format with "AM" or "PM" (e.g., 7:00 AM) when possible.
    - If the time is something OTHER than a time, i.e., O/C (on call) - use that (but only if it's explicitly stated). If there ARE no call times for someone - do not hallucinate one.
    2. Phone numbers: 
    - Use E.164 format if possible (e.g., +15555555555).
    - If E.164 format is not possible, retain the original format as seen.
    3. Department names and titles: Match industry standards, use title case

    ### **Markdown:**
    ${md}
  `;

  const [callSheetResponse, ...peopleResponses] = await Promise.all([
    openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: callSheetPrompt }],
        },
      ],
      temperature: 0,
      response_format: zodResponseFormat(CallsheetSchema, "callsheet"),
    }),
    ...[md].map((chunk) =>
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: peoplePrompt(chunk) }],
        temperature: 0,
        max_tokens: 16300,
        response_format: zodResponseFormat(PeopleSchema, "people"),
      })
    ),
  ]);

  const callSheetContent =
    callSheetResponse.choices[0]?.message?.content ?? "{}";
  const callSheetResult = JSON.parse(
    callSheetContent.replace(/```json|```/g, "").trim()
  );

  let allPeople: any[] = [];

  for (const response of peopleResponses) {
    const peopleContent = response.choices[0]?.message?.content ?? "{}";
    const parsedContent = JSON.parse(
      peopleContent.replace(/```json|```/g, "").trim()
    );

    if (parsedContent.people && Array.isArray(parsedContent.people)) {
      allPeople = allPeople.concat(parsedContent.people);
    }
  }

  const uniquePeople = _.uniqBy(
    allPeople,
    (person) =>
      `${person.name.trim()?.toLowerCase()}|${
        person.phone?.trim()?.toLowerCase() || ""
      }|${person.email?.trim()?.toLowerCase() || ""}|${
        person.department?.trim()?.toLowerCase() || ""
      }|${person.title?.trim()?.toLowerCase() || ""}`
  );

  callSheetResult.people = uniquePeople;

  return callSheetResult;
};
