import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

export const getUser = async (client: SupabaseClient<Database>) => {
  const { data, error } = await client.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("User not found");
  }

  return data;
};
