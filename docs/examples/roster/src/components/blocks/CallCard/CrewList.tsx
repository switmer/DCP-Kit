import React, { FC, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { createClient } from "@/lib/supabase/client";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import _ from "lodash";
import {
  CallSheetMemberType,
  CallSheetType,
  CompanyType,
  MemberType,
} from "@/types/type";
import { capitalizeString, normalizeCallSheetMember } from "@/lib/utils";
import {
  isMemberType,
  MemberProfile,
} from "@/components/blocks/CallCard/MemberProfile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { toast } from "sonner";

type Props = {
  user: any;
  member: CallSheetMemberType;
  sheet: CallSheetType;
  company: CompanyType;
  date: any;
  callback: (view: "call" | "crew" | "profile") => void;
  view: "call" | "crew" | "profile";
  contactInfoVisible: boolean;
};

export const CrewList: FC<Props> = (props) => {
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [user, setUser] = useState<MemberType>();
  const [refreshKey, setRefreshKey] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    if (!props.user) return;

    const fetchUser = async () => {
      const { data: userReq, error: userReqError } = await supabase
        .from("member")
        .select()
        .eq("id", props.user.id);

      if (!userReq || userReqError) {
        //-- REMARK: if no member data should be create a record using user -> profile info?
        console.error("Error: ", userReqError);
        toast.error("Something went wrong member information.");

        return;
      }

      setUser(userReq[0]);

      if (selectedMember && isMemberType(selectedMember)) {
        setSelectedMember(userReq[0]);
      }
    };

    fetchUser();
  }, [props.user, refreshKey]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      //-- if we're in profile view, prevent default behavior and close the sidebar.
      if (props.view === "profile") {
        event.preventDefault();
        setSelectedMember(null);
        props.callback("crew");
      }

      if (props.view === "crew") {
        event.preventDefault();
        props.callback("call");
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, [props.view]);

  useMemo(() => {
    setIsLoading(true);

    supabase
      .from("call_sheet_member")
      .select(
        `
        *,
        project_position(*, project_member(*))
      `
      )
      .eq("call_sheet", props.sheet.id)
      .order("order")
      .then(({ data }) => {
        if (!data) {
          setIsLoading(false);

          return;
        }

        const updatedMembers = data.map((m) =>
          normalizeCallSheetMember(m as any)
        );

        //-- fetch member record for each call_sheet_member.
        const memberDetailPromises = updatedMembers.map(
          async (callSheetMember) => {
            if (!callSheetMember.owner) {
              return { ...callSheetMember };
            }

            const { data: memberData } = await supabase
              .from("member")
              .select("avatar")
              .eq("id", callSheetMember.owner)
              .single();

            return {
              ...callSheetMember,
              avatar: memberData?.avatar || null,
            };
          }
        );

        Promise.all(memberDetailPromises)
          .then((enrichedMembers) => {
            setMembers(enrichedMembers);
            setIsLoading(false);
          })
          .catch((error) => {
            console.error("Error:", error);
            toast.error(
              "Something went wrong fetching member record. Please try again."
            );

            setIsLoading(false);
          });
      });
  }, [props.sheet.id, supabase]);

  let depts = (
    props.sheet.raw_json as {
      departments:
        | Array<{ name: string; default_call_time: string }>
        | string[];
    }
  ).departments;

  if (!Array.isArray(depts)) {
    console.error("Expected departments to be an array of objects.");
    // REMARK: should add error reporting here
    depts = [];
  }

  const membersByDepartment = Object.entries(
    _.groupBy(members, (member) => member.department)
  );

  const membersByCallsheetOrder = depts.flatMap((department) => {
    //-- check if `department` is an object with a `name` property...
    if (typeof department === "object" && "name" in department) {
      const matchingDept = membersByDepartment.find(([depName]) => {
        return depName?.toLowerCase() === department?.name?.toLowerCase();
      });

      return matchingDept ? [matchingDept] : [];
    } else {
      //-- ...else `department` is a string.
      const matchingDept = membersByDepartment.find(([depName]) => {
        return depName?.toLowerCase() === department.toLowerCase();
      });

      return matchingDept ? [matchingDept] : [];
    }
  });

  //-- find any departments that weren't in the original depts array.
  const remainingDepartments = membersByDepartment.filter(([depName]) => {
    //-- check if this department is already included in membersByCallsheetOrder.
    return !membersByCallsheetOrder.some(
      ([orderedDepName]) =>
        orderedDepName?.toLowerCase() === depName?.toLowerCase()
    );
  });

  //-- new array with departments and members by call sheet order first, then the remaining departments.
  const allDepartments = [...membersByCallsheetOrder, ...remainingDepartments];

  const handleMemberClick = (member: any) => {
    //-- push new history state here that we can catch when we go "back" on the browser.
    window.history.pushState({ view: "profile" }, "", "");

    setSelectedMember(null);
    setSelectedMember(member);
    props.callback("profile");
  };

  return (
    <>
      {isLoading ? (
        <LoadingIndicator />
      ) : props.view === "crew" ? (
        <div className="max-sm:mt-[75px]">
          <div className="flex flex-col text-[20px]">
            <div className="flex justify-between gap-3 w-full mb-2">
              <div className="flex items-center justify-center h-[26px] text-[22px] font-medium">
                {props.date}
              </div>

              <div className="flex items-center justify-center h-[26px] px-[10px] bg-foreground bg-opacity-5 rounded text-xs font-bold">
                {/* @ts-ignore */}
                {props.sheet?.raw_json?.day_of_days}
              </div>
            </div>

            <div className="text-[38px] mb-2">
              {/* @ts-ignore */}
              {capitalizeString(props.sheet?.raw_json?.job_name)}
            </div>
          </div>

          {props.user.id === props.member.owner && (
            <div
              onClick={() => handleMemberClick(user)}
              className="group flex gap-4 px-5 py-3 my-3 rounded-[22px] bg-card-gradient cursor-pointer"
            >
              <Avatar className="w-12 h-12 rounded-full">
                <AvatarImage
                  src={user?.avatar ?? undefined}
                  alt="Avatar"
                  onError={(e) => {
                    //-- if image fails to load.
                    e.currentTarget.style.display = "none";
                  }}
                />

                <AvatarFallback className="w-12 h-12 flex items-center justify-center rounded-full">
                  <span className="text-lg font-medium leading-none">
                    {user?.name
                      ? user?.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()
                      : props.member.name
                      ? props.member?.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()
                      : "--"}
                  </span>
                </AvatarFallback>
              </Avatar>

              <div className="flex justify-between w-[100%]">
                <div className="flex flex-col items-start">
                  <div className="text-white/85 text-lg leading-snug font-medium">
                    {user?.name
                      ? capitalizeString(user.name)
                      : props.member.name
                      ? capitalizeString(props.member.name)
                      : "--"}
                  </div>

                  <div className="text-stone-300/60 text-sm leading-snug font-medium">
                    {user?.title
                      ? capitalizeString(user.title)
                      : props.member.title
                      ? capitalizeString(props.member.title)
                      : "--"}

                    {(user?.title || props.member?.title) && " - "}

                    {user?.department
                      ? capitalizeString(user.department)
                      : props.member.department
                      ? capitalizeString(props.member.department)
                      : null}
                  </div>
                </div>

                <div className="flex items-center">
                  <Icon
                    name="chevron"
                    className="w-[10px] h-5 text-white/25 group-hover:text-white/80 duration-100"
                  />
                </div>
              </div>
            </div>
          )}

          {allDepartments.map(([department, members]) => {
            return (
              <Card
                key={department}
                className="px-5 py-3 my-3 rounded-[22px] bg-card-gradient"
              >
                <CardContent className="p-0 flex flex-col">
                  <div className="items-center justify-between">
                    <div className="text-[18px]">{department}</div>

                    <div>
                      {members.map((member: any) => {
                        const [firstName, lastName] = (
                          member?.name || ""
                        )?.split(" ");

                        const initials = member?.name
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .join("");

                        return (
                          <div
                            key={member.id}
                            onClick={() => handleMemberClick(member)}
                            className="flex w-[100%] group my-4 cursor-pointer"
                          >
                            <Avatar className="w-12 h-12 rounded-full">
                              <AvatarImage
                                src={member.avatar ?? undefined}
                                alt="Avatar"
                                onError={(e) => {
                                  //-- if image fails to load.
                                  e.currentTarget.style.display = "none";
                                }}
                              />

                              <AvatarFallback className="w-12 h-12 flex items-center justify-center rounded-full">
                                <span className="text-lg font-medium leading-none">
                                  {initials}
                                </span>
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex w-[100%] justify-between ml-4">
                              <div className="leading-3">
                                <span className="text-white/85 text-lg leading-snug font-medium">
                                  {firstName + " " + (lastName ? lastName : "")}
                                  <br />
                                </span>

                                <span className="text-stone-300/60 text-md leading-snug font-medium">
                                  {member.title}
                                </span>
                              </div>

                              <div className="flex items-center">
                                <Icon
                                  key={member.id}
                                  name="chevron"
                                  className="w-[10px] h-5 text-white/25 group-hover:text-white/80 duration-100"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/*<Button*/}
                  {/*  className="justify-center flex gap-1 w-full text-[15px] font-500"*/}
                  {/*  variant={"outline"}*/}
                  {/*  size={"compact"}*/}
                  {/*>*/}
                  {/*  Get Directions*/}
                  {/*</Button>*/}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <MemberProfile
          member={props.member}
          selectedMember={selectedMember}
          contactInfoVisible={
            selectedMember?.contact_info_visible !== null
              ? selectedMember?.contact_info_visible
              : props.contactInfoVisible ?? true
          }
          setRefreshKey={setRefreshKey}
        />
      )}
    </>
  );
};
