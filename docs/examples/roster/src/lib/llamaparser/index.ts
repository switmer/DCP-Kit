import { xior } from "xior";
import FormData from "form-data";

const axios = xior.create({
  headers: {
    Authorization: `Bearer ${process.env.LLAMA_CLOUD_API_KEY}`,
  },
  baseURL: "https://api.cloud.llamaindex.ai/api/parsing",
});

enum JobStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
  CANCELED = "CANCELED",
}

export const llamaParser = async (pdf: Blob, name: string): Promise<string> => {
  const formData = new FormData();
  formData.append("file", pdf, name);
/*   formData.append(
    "parsing_instruction",
    `
      You are parsing a film production call sheet document that contains several sections laid out in separate blocks.
      While these sections might appear as part of a single table, they contain different types of information, each in its own structured layout.
      Make sure to maintain the structure of the data as separate tables for each section when outputting the parsed information. 
      Ensure that data appears in the same order as they are in the document.
    `
  ); */
  formData.append("is_formatting_instruction", true);

  formData.append("premium_mode", true);

  const { data } = await axios.post("/upload", formData);

  const jobId = data.id;

  const checkJobStatus = async (): Promise<JobStatus> => {
    const { data: jobData } = await axios.get(`/job/${jobId}`);
    return jobData.status as JobStatus;
  };

  let status: JobStatus;
  const startTime = Date.now();
  const timeoutDuration = 40 * 60 * 1000;

  do {
    status = await checkJobStatus();
    if (status === JobStatus.ERROR || status === JobStatus.CANCELED) {
      throw new Error(`Job failed with status: ${status}`);
    }
    if (status === JobStatus.PENDING) {
      if (Date.now() - startTime > timeoutDuration) {
        throw new Error("Job timed out after 10 minutes");
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } while (status === JobStatus.PENDING);

  const {
    data: { markdown },
  } = await axios.get(`/job/${jobId}/result/markdown`);

  return markdown;
};
