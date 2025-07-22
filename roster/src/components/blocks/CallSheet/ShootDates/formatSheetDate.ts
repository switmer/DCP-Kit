import { format, parse } from "date-fns";

export const formatSheetDate = (date: string) => {
  try {
    const inputDate = parse(date, "MM/dd/yy", new Date());

    if (isNaN(inputDate.getTime())) return date;

    return format(inputDate, "EEE, MMM d");
  } catch {
    return date;
  }
};
