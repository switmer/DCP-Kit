import { capitalize } from "lodash";

export const formatLocationName = (str: string) =>
  str
    //-- strip non-alphanumeric. allow single quotes.
    .replace(/[^a-zA-Z0-9\s']/g, "")

    //-- trim whitespace...
    .trim()

    //-- split by space...
    .split(" ")

    //--- ...capitalize each element...
    // .map((el) => capitalize(el))

    //-- join the elements with a space.
    .join(" ");
