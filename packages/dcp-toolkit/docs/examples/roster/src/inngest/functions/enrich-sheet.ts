import { createClient } from "@supabase/supabase-js";
import { inngest } from "../inngest.client";
import xior from "xior";
import OpenAI from "openai";
import _ from "lodash";
import { NonRetriableError } from "inngest";
import { llamaParser } from "@/lib/llamaparser";
import { ChatCompletionTool } from "openai/resources/index.mjs";
import { formatPhoneNumber } from "@/lib/phone";

const openai = new OpenAI();

const axios = xior.create();

export const enrichSheet = inngest.createFunction(
  {
    id: "enrich-sheet",
    retries: 0,
    throttle: {
      limit: 5,
      period: "30s",
    },
    onFailure: async ({ error, event }) => {
      //
    },
  },
  { event: "callsheet/enrich" },
  async ({ event, step }) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    const { data } = await step.run("Get crew contact list", async () => {
      return await supabase
        .from("project_contact_list")
        .select()
        .eq("id", event.data.contact_list_id)
        .single();
    });

    if (!data.src) {
      throw new NonRetriableError("Failed to get crew contact list.");
    }

    const { data: crew } = await step.run("Get current crew", async () => {
      return await supabase
        .from("project_member")
        .select(
          `
              id,
              name
        `
        )
        .eq("project", event.data.project_id);
    });

    let md: string | null = data.md;

    if (!md) {
      md = await step.run("Download PDF and extract text", async () => {
        const { data: src, error } = await supabase.storage
          .from("call-sheets")
          .createSignedUrl(data?.src ?? "", 60 * 60 * 24);

        if (!src || !src.signedUrl) {
          throw new NonRetriableError(
            error?.message ?? "Failed to get signed URL."
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

        await supabase
          .from("project_contact_list")
          .update({
            md,
          })
          .eq("id", event.data.contact_list_id);

        return markdown;
      });
    }

    await step.run("Process with gpt-4o", async () => {
      const updateCrewMemberContactDetails = async (
        id: string,
        phone?: string | null,
        email?: string | null
      ) => {
        if (!event.data.sheet_id) {
          return;
        }

        const updateData: Record<string, string | null> = {};

        if (phone) {
          const { formattedPhone } = formatPhoneNumber(phone);
          updateData.phone = formattedPhone || phone;
        }

        if (email) {
          updateData.email = email;
        }

        await supabase.from("project_member").update(updateData).eq("id", id);
      };

      const tools = [
        {
          type: "function",
          function: {
            name: "update_crew_member_contact_details",
            description:
              "Update the contact details for a crew member using their ID.",
            parameters: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description: "The ID of the crew member.",
                },
                phone: {
                  type: "string",
                  description: "The phone number of the crew member.",
                },
                email: {
                  type: "string",
                  description: "The email address of the crew member.",
                },
              },
              required: ["id"],
              additionalProperties: false,
            },
          },
        },
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: `
**Goal:**  
Update the contact details for all members in the call sheet using the provided contact list.

**Instructions:**  
1. **Mapping Relationships:**
   - A single contact in the contact list can correspond to one or multiple members in the call sheet.
   - Each member must be uniquely identified by their **ID**.
   
2. **Update Procedure:**
   - For each member, match their **name** with the **NAME** field in the contact list.
   - Use the **ID** to ensure accurate updates.
   - Update the member's **phone** and **email** based on the contact list.
   - If a contact's **phone** or **email** is missing, skip updating that field for the corresponding member.
   
3. **Data Integrity:**
   - Ensure that every member listed in the current data is processed.
   - Avoid duplicate updates by strictly using unique **IDs**.

**Contact List:**
\`\`\`markdown
${md}
\`\`\`

**Data to Update:**
\`\`\`json
${JSON.stringify(crew, null, 2)}
\`\`\`

**Example Mapping:**
- A contact named "Jane Doe" can be linked to multiple crew members such as "Jane Smith" (ID: 123) and "Jane Johnson" (ID: 456).
- For each crew member, use their unique ID to update their phone and email.

**Please provide a detailed list of updates using the above information, ensuring that all eligible crew members are processed.**
            `,
          },
        ],
        temperature: 0,
        max_tokens: 16384,
        tools: tools as ChatCompletionTool[],
      });

      if (response.choices[0]?.message?.tool_calls) {
        const toolCalls = response.choices[0]?.message?.tool_calls;
        const availableFunctions = {
          update_crew_member_contact_details: updateCrewMemberContactDetails,
        };

        await Promise.all(
          toolCalls.map(async (toolCall) => {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);
            const functionToCall =
              availableFunctions[
                functionName as keyof typeof availableFunctions
              ];
            const functionResponse = await functionToCall(
              functionArgs.id,
              functionArgs.phone,
              functionArgs.email
            );
            return {
              tool_call_id: toolCall.id,
              role: "tool",
              name: functionName,
              content: functionResponse,
            };
          })
        );
      }
    });

    return { success: true };
  }
);
