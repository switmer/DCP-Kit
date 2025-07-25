import { NextResponse } from "next/server";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { CallsheetSchema, PeopleSchema } from "@/lib/schemas/callsheet";
import xior from "xior";
import _ from "lodash";
import { inngest } from "@/inngest/inngest.client";

export const maxDuration = 300;

const axios = xior.create();
const openai = new OpenAI();

const parseCallSheetPart = async (
  callSheetPrompt: string,
  peoplePrompt: string
) => {
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

    openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: peoplePrompt }],
      temperature: 0,
      max_tokens: 16300,
      response_format: zodResponseFormat(PeopleSchema, "people"),
    }),
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

export async function POST(request: Request) {
  const body = await request.json();

  const result = await parseCallSheetPart(
    body.callSheetPrompt,
    body.peoplePrompt
  );

  return NextResponse.json({ data: result });
}
