import { format } from "date-fns";

export const formatDatesForInput = (dates: string[]) => {
  if (dates.length === 0) return;

  if (dates.length > 1) {
    dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const endsOfRange = [dates[0], dates[dates.length - 1]];
    const formattedRange = [
      format(endsOfRange[0], "MMM dd"),
      format(endsOfRange[1], "MMM dd, yyyy"),
    ];

    return formattedRange[0] + " - " + formattedRange[1];
  }

  return format(dates[0], "MMM dd, yyyy");
};
