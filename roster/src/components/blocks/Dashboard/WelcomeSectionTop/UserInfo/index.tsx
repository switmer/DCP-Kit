import { FC, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { capitalizeString, cn, getGreeting, makeInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { useQuery } from "@tanstack/react-query";
import { getUser } from "@/queries/get-user";

type Props = {
  mobile: boolean;
};

export const UserInfo: FC<Props> = (props) => {
  const supabase = createClient();

  const {
    /* @ts-ignore */
    data: { user } = {},
  } = useQuery({ queryKey: ["user"], queryFn: () => getUser(supabase) });

  const initials = useMemo(() => {
    if (!user?.user_metadata?.name) return "-";

    return makeInitials(user?.user_metadata?.name);
  }, [user?.user_metadata?.name]);

  if (!user) return <></>;

  return (
    <div
      className={cn(
        "z-10 flex items-center gap-3 pb-6",
        props.mobile && "flex-col",
        !props.mobile && "pb-0"
      )}
    >
      <Avatar>
        <AvatarFallback className="text-xl">{initials}</AvatarFallback>
      </Avatar>

      <div
        className={cn("font-medium text-2xl", !props.mobile && "text-3xl")}
      >{`${
        user?.user_metadata?.name
          ? getGreeting() +
            ", " +
            capitalizeString(user?.user_metadata?.name) +
            "!"
          : getGreeting() + "!"
      }`}</div>
    </div>
  );
};
