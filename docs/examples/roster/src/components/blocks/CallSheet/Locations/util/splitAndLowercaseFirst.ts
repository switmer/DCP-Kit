export const splitAndLowercaseFirst = (str: string): string => {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toLowerCase() + word.slice(1))
    .join(" ");
};
