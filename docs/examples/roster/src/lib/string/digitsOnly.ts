/**
 * Remove any non-numeric characters
 */
export const digitsOnly = (str: string) => str.replaceAll(/\D/g, "");
