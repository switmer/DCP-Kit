import { xior } from "xior";

export const sendSlackAlert = async (msg: string, channel?: string) => {
  if (!msg || process.env.NODE_ENV !== "production") return;

  const axios = xior.create();

  return await axios.post(
    "https://slack.com/api/chat.postMessage",
    {
      channel: channel || process.env.SLACK_ALERT_CHANNEL,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: msg,
          },
        },
      ],
    },
    {
      headers: {
        ContentType: "application/json",
        Authorization: `Bearer ${process.env.SLACK_TOKEN}`,
      },
    }
  );
};
