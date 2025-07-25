"use client";
import { CompanyType } from "@/types/type";
import { Breadcrumbs } from "./Breadcrumbs";
import { createClient } from "@/lib/supabase/client";
import { useCompanyStore } from "@/store/company";
import { useEffect, useMemo, useState } from "react";
import { User } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { UserInviteDialog } from "./UserInviteDialog";
import { AlertDialog } from "@/components/ui/AlertDialog";

export const Users = ({
  company,
  user,
}: {
  company?: CompanyType | null;
  user: User;
}) => {
  const [removing, setRemoving] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [users, setUsers] = useState<
    {
      company: string | null;
      created_at: string;
      id: number;
      role: Database["public"]["Enums"]["role"] | null;
      user: string | null;
      profile: {
        email: string | null;
        id: string;
        name: string | null;
        phone: string | null;
        picture: string | null;
      } | null;
    }[]
  >([]);
  const [invites, setInvites] = useState<
    {
      company: string | null;
      created_at: string | null;
      email: string;
      expires_at: string;
      id: string;
      role: Database["public"]["Enums"]["role"] | null;
      token: string;
      used: boolean | null;
    }[]
  >([]);

  const supabase = createClient();
  const { activeCompany } = useCompanyStore();
  const getCompanyUsers = async () => {
    if (!activeCompany) return;

    const { data, error } = await supabase
      .from("company_user")
      .select(
        `
      *,
      profile (
        *
      )
  `
      )
      .eq("company", activeCompany);

    if (error) {
      console.error("Error fetching users:", error);
      return;
    }

    if (!data?.length) return;

    setUsers(data as any);
  };

  const getCompanyInvites = async () => {
    if (!activeCompany) return;

    const { data, error } = await supabase
      .from("company_user_invite")
      .select(
        `
      *
    `
      )
      .eq("company", activeCompany)
      .not("used", "is", true);

    if (!data?.length) return;

    setInvites(data);

    if (error) {
      console.error("Error fetching invites:", error);
    }
  };

  useEffect(() => {
    getCompanyUsers();
    getCompanyInvites();
  }, [activeCompany, supabase]);

  const isCurrentUserAdmin = useMemo(() => {
    return users.find((u) => u.user === user.id && u.role === "admin");
  }, [users, user]);

  return (
    <>
      <UserInviteDialog
        open={inviteOpen}
        close={() => {
          setInviteOpen(false);
          getCompanyInvites();
        }}
      />
      <div className="flex flex-1 flex-col gap-6 py-10 max-w-[1100px] pr-6">
        {company && <Breadcrumbs company={company} page="Users" />}

        <div className="text-white text-[38px] font-normal flex items-center justify-between">
          Users
          <Button
            variant={"accent"}
            size={"compact"}
            className="px-4 text-xs gap-1.5"
            onClick={() => setInviteOpen(true)}
          >
            <Icon name="invite" className="w-5 h-5" />
            Invite Users
          </Button>
        </div>

        <div className="flex flex-col w-full">
          {users
            .filter((u) => !invites.find((i) => i.email === u.profile?.email))
            .map((u) => {
              const you = u.user === user.id;
              return (
                <div
                  key={u.id}
                  className="h-[58px] flex items-center px-3 border-b border-white/5 "
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="w-9 h-9 rounded-full">
                      <AvatarFallback className="w-9 h-9 flex items-center justify-center rounded-full border border-white/10 bg-transparent">
                        <span className="text-base font-normal leading-none text-white">
                          {u?.profile?.name?.[0] ??
                            u?.profile?.email?.[0] ??
                            "?"}
                        </span>
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <div className="text-white text-sm font-semibold leading-none flex items-center gap-2">
                        {u?.profile?.name ?? u?.profile?.email}

                        {you && (
                          <div className="text-center text-lime-300 text-[10px] font-normal h-[18px] flex items-center justify-center px-2 rounded-lg bg-lime-300/10">
                            You
                          </div>
                        )}
                      </div>
                      {u?.profile?.name && (
                        <div className="text-[#8a8a8a] text-[10px] font-normal leading-3">
                          {u?.profile?.email}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-1 items-center">
                    {!isCurrentUserAdmin || you ? (
                      <div className="text-[#8a8a8a] text-[13px] font-normal leading-[13px] capitalize">
                        {u.role}
                      </div>
                    ) : (
                      <></>
                    )}
                  </div>

                  <div className="flex items-center justify-end min-w-[100px]">
                    {isCurrentUserAdmin && !you && (
                      <AlertDialog
                        onConfirm={async () => {
                          await supabase
                            .from("company_user")
                            .delete()
                            .eq("id", u.id);
                          setUsers(users.filter((us) => us.id !== u.id));
                        }}
                        onCancel={() => {}}
                        title="Are you sure you want to remove this user?"
                        description=""
                        isDelete
                      >
                        <Button
                          variant={"secondary"}
                          size={"compact"}
                          className="text-sm px-3 font-normal text-white h-[38px]"
                        >
                          Remove
                        </Button>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              );
            })}
          {invites.map((i) => {
            return (
              <div
                key={i.id}
                className="h-[58px] flex items-center px-3 border-b border-white/5 "
              >
                <div className="flex items-center gap-3 flex-1">
                  <Avatar className="w-9 h-9 rounded-full">
                    <AvatarFallback className="w-9 h-9 flex items-center justify-center rounded-full border border-white/10 bg-transparent">
                      <span className="text-base font-normal leading-none text-white">
                        {i?.email?.[0] ?? "?"}
                      </span>
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <div className="text-white text-sm font-semibold leading-none flex items-center gap-2">
                      {i?.email}
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 items-center">
                  {(() => {
                    const expirationDate = new Date(i.expires_at);
                    const isExpired = expirationDate < new Date();

                    return (
                      <div className="text-[#8a8a8a] text-[13px] font-normal leading-[13px] capitalize">
                        {isExpired ? "Invite expired" : "Invite sent"}
                      </div>
                    );
                  })()}
                </div>

                <div className="flex items-center justify-end min-w-[100px]">
                  {isCurrentUserAdmin && (
                    <AlertDialog
                      onConfirm={async () => {
                        setRemoving(i.id);
                        await supabase
                          .from("company_user_invite")
                          .delete()
                          .eq("id", i.id);
                        setInvites(
                          invites.filter((invite) => invite.id !== i.id)
                        );
                        const userId = users.find(
                          (u) => u.profile?.email === i.email
                        )?.id;

                        if (userId && activeCompany) {
                          await supabase
                            .from("company_user")
                            .delete()
                            .eq("user", userId)
                            .eq("company", activeCompany);
                          setUsers(users.filter((us) => us.id !== userId));
                        }
                        setRemoving(null);
                      }}
                      onCancel={() => {}}
                      title="Are you sure you want to delete this invite?"
                      description=""
                      isDelete
                    >
                      <Button
                        variant={"secondary"}
                        size={"compact"}
                        className="text-sm px-3 font-normal text-white h-[38px]"
                        disabled={removing === i.id}
                      >
                        Remove
                      </Button>
                    </AlertDialog>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
