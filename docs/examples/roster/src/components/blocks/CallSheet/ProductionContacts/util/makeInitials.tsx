export const makeInitials = (name: string) => {
  const words = name.split(" ");

  let initials = "";

  for (const word of words) {
    if (word.length > 0) {
      initials += word[0]?.toUpperCase();
    }
  }

  return initials;
};
