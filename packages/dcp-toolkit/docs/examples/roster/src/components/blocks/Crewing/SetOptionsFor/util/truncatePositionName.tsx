export const truncatePositionName = (position: string) => {
  if (position.length < 12) {
    return position;
  }

  let newPositionName = "";
  const words = position.split(/[/;& ]+/);

  words.map((el) => (newPositionName += el[0][0]));

  return newPositionName;
};
