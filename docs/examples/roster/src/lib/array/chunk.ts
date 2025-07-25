//-- split, or "chunk", an array into multiple arrays of the indicated size.
export const chunk = (array: any[], size: number) => {
  const chunked = [];

  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }

  return chunked;
};
