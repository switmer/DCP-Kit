import { parsePhoneNumber } from "libphonenumber-js";

export const formatPhoneNumber = (
  phone: string
): { formattedPhone: string | null; error: string | null } => {
  try {
    const phoneNumber = parsePhoneNumber(phone, "US");
    if (!phoneNumber) {
      return {
        formattedPhone: null,
        error: "Invalid phone number format",
      };
    }

    return {
      formattedPhone: phoneNumber.format("E.164"),
      error: null,
    };
  } catch (e) {
    return {
      formattedPhone: null,
      error: "Invalid phone number format",
    };
  }
};
