import axios from "axios";

export const startProcess = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  return await axios
    .post(
      `https://jsonify.co/api/v1/document/9aab0083-99c8-4034-9dc3-4052275df469/start?token=${process.env.NEXT_PUBLIC_JSONIFY_TOKEN}&model=large`,
      formData
    )
    .then((res) => {
      if (res.status != 200) {
        throw new Error();
      }
      return res.data;
    })
    .catch((err) => console.log(err));
};

export const getResult = async (id: string) => {
  return await axios
    .get(
      `https://jsonify.co/api/v1/result/${id}?token=${process.env.NEXT_PUBLIC_JSONIFY_TOKEN}&model=large`
    )
    .then((res) => {
      if (res.status != 200) {
        throw new Error();
      }
      return res.data;
    })
    .catch((err) => console.log(err));
};

export const reformatResult = async (jobId: string) => {
  return await axios.post(
    `https://jsonify.co/api/v2/result/${jobId}/extract_data?token=${
      process.env.NEXT_PUBLIC_JSONIFY_TOKEN
    }&directive=${encodeURI(
      "Parse all document data again and aim for a more complete response"
    )}&model=large`
  );
};
