export const convertUnixTimeToAmPm = (
  unixTimestamp: number,
  timezoneOffset: number = 0
): string => {
  //-- apply timezone offset to the timestamp.
  const adjustedTimestamp = unixTimestamp + timezoneOffset;

  //-- create a new date object using the adjusted timestamp.
  const date = new Date(adjustedTimestamp * 1000);

  //-- get hours and minutes from the date object.
  let hours = date.getHours();
  const minutes = date.getMinutes();

  //-- determine if it's am or pm.
  const amPm = hours >= 12 ? "PM" : "AM";

  //-- convert hours to 12-hour format.
  hours = hours % 12;

  //-- handle midnight (0 hours) as 12.
  hours = hours === 0 ? 12 : hours;

  //-- pad minutes with leading zero if needed.
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

  //-- return the formatted time string.
  return `${hours}:${formattedMinutes} ${amPm}`;
};
