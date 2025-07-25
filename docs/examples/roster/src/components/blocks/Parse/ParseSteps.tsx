"use client";

import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/shadcn/label";
import { Textarea } from "@/components/ui/shadcn/textarea";
import { CallSheetType } from "@/types/type";
import axios from "axios";
import { useRouter } from "next-nprogress-bar";
import { useState } from "react";

const callSheetPromptBase = `
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
    - If the time is something OTHER than a time, ie: O/C (on call) - use that (but only it's explicitly stated). If there ARE no call times for anyone - fallback to the general crew call time.
  3. **Phone Numbers:** "(555) 555-5555".

  ### **Additional Instructions:**
  - Ensure notes are appropriately categorized and titled, avoiding overly broad groupings.
  - Highlight any specific logistics, parking, travel, or safety-related instructions.

  ### **Markdown to analyze:**
`;

const peoplePromptBase = `
 Please aim to get all the contacts listed on the call sheet document into the your response.
  Extract all the people of all departments from the provided call sheet markdown. Exclude vendors, talent, cast and other non-crew members.
  If a person is listed under multiple departments, create an a record for each instance.
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
    - If the time is something OTHER than a time, ie: O/C (on call) - use that (but only it's explicitly stated). If there ARE no call times for anyone - fallback to the general crew call time.
    2. Phone numbers: (555) 555-5555
    3. Department names and titles: Match industry standards, use title case


    ### **Markdown:**
`;

export const ParseSteps = ({ data }: { data: CallSheetType }) => {
  const [peoplePrompt, setPeoplePrompt] = useState(peoplePromptBase);
  const [callSheetPrompt, setCallSheetPrompt] = useState(callSheetPromptBase);
  const [gptResponse, setGptResponse] = useState("");

  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const router = useRouter();

  const handleSubmit = async () => {
    setLoading(true);
    await axios
      .post("/parse/process", {
        callSheetPrompt,
        peoplePrompt,
      })
      .then((res) => {
        setGptResponse(JSON.stringify(res.data.data, null, 2));
      })
      .catch(() => {
        setLoading(false);
      });

    setLoading(false);
  };

  const handleComplete = async () => {
    setProcessing(true);
    await axios
      .post("/parse/complete", {
        id: data.id,
        result: JSON.parse(gptResponse),
      })
      .then(() => {
        router.push(`/sheet/${data.short_id}`);
      })
      .catch(() => {
        setProcessing(false);
      });
  };

  return (
    <div className="flex flex-col gap-10 w-full p-6">
      <div className="space-y-2">
        <Label htmlFor="prompt-callsheet" className="flex items-center gap-2">
          Call sheet prompt (remember to include the markdown)
        </Label>
        <Textarea
          id="prompt-callsheet"
          className="h-[600px]"
          value={callSheetPrompt}
          onChange={(e) => setCallSheetPrompt(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="prompt-people" className="flex items-center gap-2">
          People prompt (remember to include the markdown)
        </Label>
        <Textarea
          id="prompt-people"
          className="h-[600px]"
          value={peoplePrompt}
          onChange={(e) => setPeoplePrompt(e.target.value)}
        />
      </div>

      <div className="flex gap-4">
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Parsing..." : "Parse with LLM"}
        </Button>
      </div>

      {gptResponse && (
        <div className="space-y-2">
          <Label htmlFor="result" className="flex items-center gap-2">
            LLM result
          </Label>
          <Textarea
            id="result"
            className="h-[600px]"
            value={gptResponse}
            onChange={(e) => setGptResponse(e.target.value)}
          />
        </div>
      )}

      {gptResponse && (
        <div className="flex gap-4">
          <Button onClick={handleComplete} disabled={processing}>
            {processing
              ? "Processing..."
              : "Create call cards and save results"}
          </Button>
        </div>
      )}
    </div>
  );
};
