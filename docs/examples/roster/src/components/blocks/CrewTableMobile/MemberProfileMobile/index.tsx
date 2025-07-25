import { CompanyCrewMemberType, PositionType } from "@/types/type";
import React, { useEffect, useState } from "react";
import { Avatar } from "@radix-ui/react-avatar";
import { AvatarFallback } from "@/components/ui/Avatar";
import { format } from "date-fns";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { parsePhoneNumber } from "react-phone-number-input/min";
import { useCrewStore } from "@/store/crew";

export const MemberProfileMobile: React.FC = () => {
  const { selected, setSelected, crew } = useCrewStore();

  const [currentMember, setCurrentMember] = useState<
    (CompanyCrewMemberType & { position: PositionType[] }) | null
  >(null);

  const initials = currentMember?.name
    ? currentMember.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
    : "";

  useEffect(() => {
    const found = crew.find((c) => c.id === selected) || null;

    if (!found) {
      setSelected(null);

      return;
    }

    setCurrentMember(found);
  }, [selected, crew]);

  const renderProfileDetails = (member: CompanyCrewMemberType) => {
    if (!member) return;

    const renderBubble = (title: string, type?: string) => {
      return (
        <div className="flex flex-col items-center cursor-pointer">
          <a
            href={
              title === "email"
                ? `mailto:${member.email}`
                : title === "text"
                ? `sms:${member.phone}`
                : `tel:${member.phone}`
            }
            className="flex justify-center items-center w-[50px] h-[50px] mb-1 rounded-full backdrop-blur-sm"
            style={{
              backgroundColor:
                type === "green"
                  ? "rgb(214 254 80 / 0.8)"
                  : "rgba(255,255,255,0.1)",
            }}
          >
            <div className="text-sm text-white">
              {title === "text" && (
                <Icon
                  name="chat-bubble"
                  className="h-[20px] w-[20px] text-white/80"
                />
              )}

              {title === "call" && (
                <Icon
                  name="phone"
                  className="h-[20px] w-[20px] text-white/80"
                />
              )}

              {title === "email" && (
                <Icon
                  name="email"
                  className="h-[20px] w-[20px] text-white/80"
                />
              )}
            </div>
          </a>

          <div className="text-sm">{title}</div>
        </div>
      );
    };

    const parsedPhone = !!member?.phone
      ? parsePhoneNumber(member.phone as string, "US")?.formatNational()
      : null;

    return (
      <>
        <div className="flex items-center justify-center w-full py-0 px-5 gap-4">
          {member.phone && renderBubble("text", "grey")}
          {member.phone && renderBubble("call", "grey")}
          {member.email && renderBubble("email", "grey")}
        </div>

        {member.phone && (
          <div className="flex justify-between w-full py-2 px-5 rounded-xl backdrop-blur-sm bg-stone-700/35">
            <a href={`tel:${member.phone}`}>
              <div className="font-bold text-sm">phone</div>

              <div className="font-medium text-lime-300">{parsedPhone}</div>
            </a>

            <div className="flex place-items-center gap-4 text-lime-300"></div>
          </div>
        )}

        {member.email && (
          <div className="flex justify-between w-full py-2 px-5 rounded-xl backdrop-blur-sm bg-stone-700/35">
            <a href={`mailto:${member.email}`}>
              <div className="font-bold text-sm">email</div>

              <div className="font-medium text-lime-300">{member.email}</div>
            </a>
          </div>
        )}
      </>
    );
  };

  if (!selected || !currentMember) return null;

  return (
    <div className="fixed top-0 flex flex-col justify-center items-center w-screen h-screen max-w-screen p-3 backdrop-blur-xl">
      <Card className="flex flex-col w-full h-full gap-6 p-5 rounded-3xl overflow-y-auto backdrop-blur-xl bg-member-profile-mobile-gradient hide-scrollbars">
        <div className="flex justify-center pt-9">
          <div
            onClick={() => setSelected(null)}
            className="hidden fixed left-3 top-3 w-[40px] max-sm:flex"
          >
            <Icon
              name="arrow-left"
              className="h-12 w-12 text-white/80 font-bold"
            />
          </div>

          <div className="flex flex-col gap-6 justify-center items-center">
            <Avatar className="w-32 h-32 bg-lime-500/20 rounded-full">
              <AvatarFallback className="flex items-center justify-center w-32 h-32">
                <span className="text-[98px] font-medium leading-none">
                  {initials[0]}
                </span>
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col justify-center items-center gap-3">
              <div className="text-stone-300/80 text-[13px] font-bold leading-[1] tracking-[1px]">
                {/*{currentMember?.department?.toUpperCase()}*/}
              </div>

              <div className="text-white text-[34px] max-sm:text-center max-sm:text-[30px] font-bold leading-[1]">
                {currentMember?.name}
              </div>

              <div className="text-white text-[17px] font-medium leading-[1]">
                {/*{currentMember?.title}*/}
              </div>
            </div>
          </div>
        </div>

        {currentMember && renderProfileDetails(currentMember)}

        {currentMember?.created_at && (
          <div className="opacity-40 text-white text-xs text-center font-medium pt-3 mb-[100px]">
            <div className="tracking-[1px] font-medium text-[12px] mb-2">
              ON ROSTER SINCE
            </div>

            <div className="font-bold text-[24px]">
              {currentMember && format(currentMember.created_at, "MMM yyyy")}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
