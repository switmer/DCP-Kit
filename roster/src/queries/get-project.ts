import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import { validate } from "uuid";

export const getProject = (
  client: SupabaseClient<Database>,
  slugOrId?: string
) => {
  if (!slugOrId) throw new Error("No project id or slug provided");

  const query = client.from("project").select(`
  *,
  company (
    name,
    id
  )
`);

  if (validate(slugOrId)) {
    query.eq("id", slugOrId);
  } else {
    query.eq("slug", slugOrId);
  }

  return query.throwOnError().single();
};
