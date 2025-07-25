import {
  ComprehendClient,
  DetectDominantLanguageCommand,
  LanguageCode,
  DetectEntitiesCommand,
  Entity,
  EntityType,
} from "@aws-sdk/client-comprehend";

export const processWithComprehend = async (text: string): Promise<string> => {
  const comprehendClient = new ComprehendClient({
    region: process.env.AWS_REGION ?? "",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    },
  });

  const detectDominantLanguageCommand = new DetectDominantLanguageCommand({
    Text: text,
  });

  const { Languages } = await comprehendClient.send(
    detectDominantLanguageCommand
  );

  const languageCode = Languages?.[0]?.LanguageCode;

  const detectEntitiesCommand = new DetectEntitiesCommand({
    Text: text,
    LanguageCode: languageCode as LanguageCode,
  });

  const { Entities } = await comprehendClient.send(detectEntitiesCommand);

  return [
    ...new Set(
      (Entities ?? [])
        .filter((e: Entity) => e.Type === EntityType.PERSON)
        .filter((e) => e.Score && e.Score >= 0.6)
        .filter((e) => e.Text && e.Text.trim().split(/\s+/).length > 1)
        .map((e) => e.Text)
    ),
  ].join(", ");
};
