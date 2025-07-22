import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { ActivityItem } from "./ActivityItem";

export const Activity: React.FC = async () => {
  const supabase = createClient();
  const activeCompany = cookies().get("activeCompany")?.value;

  if (!activeCompany) return null;

  const { data } = await supabase
    .from("notification_log")
    .select(
      `
    id,
    type,
    is_read,
    created_date,
    call_sheet (
        raw_json
    ),
    call_sheet_member (
        name
    )
  `
    )
    .eq("company", activeCompany)
    .order("created_date", { ascending: false });

  const notifications = data?.filter((n) => !n.is_read);

  return (
    <div className="flex gap-6 flex-col">
      <div className="z-10 text-white text-3xl sticky top-0 pt-12 px-2 backdrop-blur-sm">
        Activity
      </div>
      <div className="grid gap-3">
        {notifications?.length ? (
          <>
            {notifications?.map((notification) => {
              return <ActivityItem key={notification.id} {...notification} />;
            })}
          </>
        ) : (
          <div className="px-3 py-2.5 bg-white bg-opacity-5 rounded-lg flex items-center justify-between">
            <p className="text-white text-sm font-medium">No activity yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
