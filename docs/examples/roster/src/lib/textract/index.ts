import {
  TextractClient,
  StartDocumentAnalysisCommand,
  GetDocumentAnalysisCommand,
  GetDocumentAnalysisResponse,
} from "@aws-sdk/client-textract";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  ApiAnalyzeDocumentResponse,
  TextractDocument,
} from "amazon-textract-response-parser";

const POLLING_INTERVAL = 1000;
const MAX_POLLING_ATTEMPTS = 300;

export const startTextractJob = async (
  pdfBuffer: Buffer,
  jobId: string
): Promise<string> => {
  const s3Bucket = process.env.AWS_S3_BUCKET!;
  const s3Key = `textract-input/${jobId}.pdf`;

  const credentials = {
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  };

  try {
    const s3Client = new S3Client(credentials);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: s3Bucket,
        Key: s3Key,
        Body: pdfBuffer,
      })
    );

    const textractClient = new TextractClient(credentials);

    const startCommand = new StartDocumentAnalysisCommand({
      DocumentLocation: {
        S3Object: {
          Bucket: s3Bucket,
          Name: s3Key,
        },
      },
      FeatureTypes: ["TABLES", "LAYOUT"],
      JobTag: jobId,
    });

    const startResponse = await textractClient.send(startCommand);
    const analysisJobId = startResponse.JobId;

    if (!analysisJobId) {
      throw new Error("Failed to start Textract job: No JobId returned");
    }

    return analysisJobId;
  } catch (error) {
    throw error;
  }
};

export const pollTextractJob = async (jobId: string) => {
  const textractClient = new TextractClient({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  let attempts = 0;
  let jobStatus = "";
  let nextToken: string | undefined;
  let completeResponse: GetDocumentAnalysisResponse = {};

  while (attempts < MAX_POLLING_ATTEMPTS) {
    const response = await textractClient.send(
      new GetDocumentAnalysisCommand({
        JobId: jobId,
        NextToken: nextToken,
      })
    );

    jobStatus = response.JobStatus ?? "";

    if (jobStatus === "SUCCEEDED") {
      completeResponse = {
        ...completeResponse,
        ...response,
        Blocks: [
          ...(completeResponse.Blocks || []),
          ...(response.Blocks || []),
        ],
        Warnings: [
          ...(completeResponse.Warnings || []),
          ...(response.Warnings || []),
        ],
      };

      if (response.NextToken) {
        nextToken = response.NextToken;
        continue;
      }

      return completeResponse;
    } else if (jobStatus === "FAILED") {
      throw new Error(`Textract job failed: ${response.StatusMessage}`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
    attempts += 1;
  }

  throw new Error("Textract job polling exceeded maximum attempts.");
};

export const processWithTextract = async (
  pdfBuffer: Buffer
): Promise<{ html: string; text: string }> => {
  const textractJobId = await startTextractJob(pdfBuffer, `job-${Date.now()}`);

  const analysisResponse = await pollTextractJob(textractJobId);

  const document = new TextractDocument(
    analysisResponse as unknown as ApiAnalyzeDocumentResponse
  );

  const allPagesHtml =
    document
      .html()
      ?.replace(/\t/g, " ")
      .replace(/\n{2,}/g, "\n") || "";

  const allPagesText = document.text;

  return { html: allPagesHtml, text: allPagesText };
};
