import { NextResponse } from "next/server";
import OpenAI from "openai";
import { sendSlackAlert } from "@/lib/slack";

const openai = new OpenAI();

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const payload = body.payload || body;

    if (
      payload.ref !== "refs/heads/main" &&
      payload.ref !== "refs/heads/master"
    ) {
      return NextResponse.json({ message: "Ignored non-main branch push" });
    }

    const commits = payload.commits;
    const repository = payload.repository.full_name;
    const branch = payload.ref.replace("refs/heads/", "");

    if (!commits || commits.length === 0) {
      return NextResponse.json({ message: "No commits found in payload" });
    }

    const commitMessages = commits
      .map((commit: any) => `- ${commit.message}`)
      .join("\n");

    const completion = await openai.chat.completions.create({
      model: "o3-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that summarizes code releases in a clear, concise way for Slack notifications.",
        },
        {
          role: "user",
          content: `Please create a brief, friendly summary of the following release changes for a Slack message. Focus on user-facing changes and group similar changes together:\n\n${commitMessages}`,
        },
      ],
    });

    const summary = completion.choices[0]?.message?.content;

    const slackMessage = `
🚀 *New Release Deployed*
*Repository:* \`${repository}\`
*Branch:* \`${branch}\`

${summary}

<${payload.compare}|View Changes>`;

    await sendSlackAlert(slackMessage, process.env.SLACK_RELEASE_ALERT_CHANNEL);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Release webhook error:", error);
    return NextResponse.json(
      { error: "Failed to process release webhook" },
      { status: 500 }
    );
  }
}
