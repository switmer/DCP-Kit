import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { capitalizeString, cn } from "@/lib/utils";
import {
  CallSheetMemberType,
  CompanyCrewMemberType,
  CrewingContactAttempt,
} from "@/types/type";
import { RelatedJobs } from "@/components/blocks/CrewTable/Preview/RelatedJobs";
import { useCrewingStore } from "@/store/crewing";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import {
  addHours,
  compareDesc,
  formatDistanceStrict,
  parseISO,
} from "date-fns";

export const HoverCrewCard: React.FC<{
  crewMember: CompanyCrewMemberType;
  crewWorkedWith: CompanyCrewMemberType[] | null;
  setCrewWorkedWith: (arg: any) => void;
  crewMemberCounts: { [key: number]: number };
  setCardIsHovered: (b: boolean) => void;
  setHoveredCrew: (c: CompanyCrewMemberType | null) => void;
  cursorCoords: { x: number; y: number };
  isLoading: boolean;
  setOptionsForOpen?: boolean;
  handleCrewClick?: (c: CompanyCrewMemberType) => void;
  selected?: CompanyCrewMemberType[];
  positionTitle?: string;
  onModal?: boolean;
}> = ({
  crewMember,
  crewWorkedWith,
  setCrewWorkedWith,
  crewMemberCounts,
  setCardIsHovered,
  setHoveredCrew,
  cursorCoords,
  isLoading,
  setOptionsForOpen,
  handleCrewClick,
  selected,
  positionTitle,
  onModal,
}) => {
  const hoverCardRef = useRef<HTMLDivElement>(null);
  const [callSheetMember, setCallSheetMember] =
    useState<CallSheetMemberType[]>();
  const [hiredAsTitleCount, setHiredAsTitleCount] = useState(0);
  const [contactAttempts, setContactAttempts] =
    useState<CrewingContactAttempt[]>();
  const [positionTitleWithId, setPositionTitleWithId] = useState<{
    [key: string]: number;
  }>();
  const [relatedProjectPositions, setRelatedProjectPositions] = useState<
    {
      created_at: string;
      hiring_status: "open" | "in_progress" | "closed" | "completed" | null;
      id: number;
      position: string | null;
      project: string | null;
      quantity: number | null;
    }[]
  >();

  const { settingCrewFor, project } = useCrewingStore();

  const supabase = createClient();

  useEffect(() => {
    if (!crewMember) return;

    const fetch = async () => {
      const { data, error } = await supabase
        .from("call_sheet_member")
        .select()
        .eq("crew_member", crewMember.id)
        .limit(1);

      if (!data) return;

      if (!!error) {
        console.error("Error fetching call_sheet_member data: ", error);
        toast.error("Something went wrong.");
      }

      setCallSheetMember(data);
    };

    fetch();
  }, [crewMember]);

  useEffect(() => {
    if (!crewMember) return;

    const fetchContactAttempts = async () => {
      const { data: relatedPositions, error: fetchRelatedPositionsError } =
        await supabase
          .from("crewing_position_crew")
          .select()
          .eq("crew", crewMember.id);

      if (!relatedPositions || fetchRelatedPositionsError) {
        console.error("Error: ", fetchRelatedPositionsError);
        toast.error("Something went wrong.");
      }

      if (relatedPositions === null) return;

      const positionIds = relatedPositions.map((p) => p.crewing_position);

      if (!project) return;

      const {
        data: relatedProjectPositionsData,
        error: fetchRelatedProjectPositionsError,
      } = await supabase
        .from("crewing_position")
        .select()
        .in("id", positionIds)
        .eq("project", project);

      if (!relatedProjectPositionsData || fetchRelatedProjectPositionsError) {
        console.error("Error: ", fetchRelatedProjectPositionsError);
        toast.error("Something went wrong.");
      }

      if (relatedProjectPositionsData === null) {
        return;
      }

      setRelatedProjectPositions(relatedProjectPositionsData);

      const relatedPositionIds = relatedProjectPositionsData.map((p) => p.id);

      const {
        data: crewingPositionCrew,
        error: fetchCrewingPositionCrewError,
      } = await supabase
        .from("crewing_position_crew")
        .select()
        .in("crewing_position", relatedPositionIds)
        .eq("crew", crewMember.id);

      if (!crewingPositionCrew || fetchCrewingPositionCrewError) {
        console.error("Error: ", fetchCrewingPositionCrewError);
        toast.error("Something went wrong.");
      }

      if (crewingPositionCrew === null || !crewingPositionCrew[0]) {
        return;
      }

      const { data: positionStatuses, error: fetchPositionStatusesError } =
        await supabase
          .from("crewing_contact_attempt")
          .select()
          // .in("position", relatedPositionIds)
          .eq("crew_member_id", crewMember.id);

      if (!positionStatuses || fetchPositionStatusesError) {
        console.error("Error: ", fetchPositionStatusesError);
        toast.error("Something went wrong.");
      }

      if (positionStatuses === null) {
        return;
      }

      setContactAttempts(positionStatuses);
    };

    fetchContactAttempts();
  }, [crewMember]);

  useEffect(() => {
    if (!contactAttempts) return;

    const positionIds = contactAttempts.map((a) => a.position);

    const fetchHiredAsPositionCount = async () => {
      const { data: hiredPositions, error } = await supabase
        .from("crewing_position")
        .select()
        .in("id", positionIds);

      if (!hiredPositions || error) {
        console.error("Error: ", error);
        toast.error("Something went wrong.");

        return;
      }

      for (const position of hiredPositions) {
        if (position.position === callSheetMember?.[0]?.title) {
          setHiredAsTitleCount((prev) => prev + 1);
        }
      }
    };

    fetchHiredAsPositionCount();
  }, [contactAttempts]);

  useEffect(() => {
    if (!callSheetMember) return;
    if (!callSheetMember[0]?.title) return;

    const title = positionTitle ?? callSheetMember[0].title;

    if (!relatedProjectPositions) return;

    for (const position of relatedProjectPositions) {
      if (position.position === title) {
        setPositionTitleWithId({ [title as string]: position.id });
      }
    }
  }, [relatedProjectPositions]);

  const initials = useMemo(() => {
    let initials = "";

    if (crewMember.first_name)
      initials += crewMember.first_name[0].toUpperCase();
    if (crewMember.last_name) initials += crewMember.last_name[0].toUpperCase();

    return initials;
  }, [crewMember]);

  const parseTFS = (input: any) => {
    const result: { [key: string]: string } = {};
    const regex = /\{([^}]+)}\s*([^{]*)/g;
    let match;

    while ((match = regex.exec(input)) !== null) {
      const department = match[1].trim();

      //-- assign position.
      result[department] = match[2].trim();
    }

    return result;
  };

  const renderName = () => {
    let name = "";

    if (crewMember.first_name) name += crewMember.first_name;
    if (crewMember.last_name) name += " " + crewMember.last_name;

    return name;
  };

  const HiredStats = () => {
    if (!contactAttempts) {
      return (
        <div
          className={cn("flex items-center justify-between w-full px-6 pt-4")}
        >
          <div className="flex flex-col items-center w-[115px]">
            <div className="text-sm text-white/50">Prev. Hired</div>
            <div className="text-[18px] font-medium text-white/80">{"--"}</div>
          </div>

          <div className="flex flex-col items-center w-[115px]">
            <div className="text-sm text-white/50">First Hired</div>
            <div className="text-[18px] font-medium text-white/80">{"--"}</div>
          </div>

          <div className="flex flex-col items-center w-[115px]">
            <div className="text-sm text-white/50">Last Hired</div>
            <div className="text-[18px] font-medium text-white/90">{"--"}</div>
          </div>
        </div>
      );
    }

    const confirmedAttempts = contactAttempts.filter(
      (a) => a.status === "confirmed"
    );

    const updatedAtDesc = confirmedAttempts.sort((a, b) => {
      if (a.updated_at && b.updated_at) {
        return compareDesc(parseISO(a.updated_at), parseISO(b.updated_at));
      } else if (a.updated_at) {
        return -1; //-- a comes before b.
      } else if (b.updated_at) {
        return 1; //-- b comes before a.
      } else {
        return 0; //-- keep original order if both are null.
      }
    });

    const now = addHours(new Date(), 7);
    let firstHired = "";
    let lastHired = "";

    const abbreviateTimeUnit = (s: string) =>
      //-- incoming string should be from date-fns' formatDistanceStrict.
      //-- e.g., "6 days ago".
      s
        .replace(/seconds?/g, "s")
        .replace(/minutes?/g, "m")
        .replace(/hour/g, "hr")
        .replace(/days?/g, "d")
        .replace(/weeks?/g, "w")
        .replace(/month/g, "mo")
        .replace(/years?/g, "y")
        .replace(" ", "");

    if (updatedAtDesc.length > 0) {
      firstHired += abbreviateTimeUnit(
        formatDistanceStrict(
          updatedAtDesc[updatedAtDesc.length - 1].updated_at as string,
          now,
          { addSuffix: true }
        )
      );

      lastHired += abbreviateTimeUnit(
        formatDistanceStrict(updatedAtDesc[0].updated_at as string, now, {
          addSuffix: true,
        })
      );
    }

    return (
      <div
        className={cn(
          "flex items-center justify-between w-full px-6 pt-4",
          setOptionsForOpen && "pb-6"
        )}
      >
        <div className="flex flex-col items-center w-[115px]">
          <div className="text-sm text-white/50">Prev. Hired</div>
          {confirmedAttempts.length > 0 ? (
            <div className="text-[18px] font-medium text-white/80">
              {`${confirmedAttempts.length} time` +
                (confirmedAttempts.length > 1 ? "s" : "")}
            </div>
          ) : (
            <div className="text-[18px] font-medium text-white/80">{"--"}</div>
          )}
        </div>

        <div className="flex flex-col items-center w-[115px]">
          <div className="text-sm text-white/50">First Hired</div>
          <div className="text-[18px] font-medium text-white/80">
            {firstHired ? firstHired : "--"}
          </div>
        </div>

        <div className="flex flex-col items-center w-[115px]">
          <div className="text-sm text-white/50">Last Hired</div>
          <div className="text-[18px] font-medium text-white/80">
            {lastHired ? lastHired : "--"}
          </div>
        </div>
      </div>
    );
  };

  const LastHired = () => {
    if (!callSheetMember) return;
    if (!callSheetMember?.[0]?.title) return;

    const title = positionTitle ?? callSheetMember[0].title;

    return (
      <>
        <div className="flex flex-col w-full px-8 pt-6">
          <div className="text-[22px] font-medium text-white/100">{title}</div>
        </div>

        <div className="flex flex-col items-start w-full gap-2 text-sm text-white/70 px-8 pb-2">
          {hiredAsTitleCount !== 0 && (
            <div>
              {`Hired ${hiredAsTitleCount} time` +
                (hiredAsTitleCount > 1 ? "s." : ".")}
            </div>
          )}

          {title && hiredAsTitleCount === 0 && (
            <div>You have not hired this person before.</div>
          )}
        </div>
      </>
    );
  };

  const HasWorkedWith = () => {
    if (!crewWorkedWith || crewWorkedWith.length === 0) return null;

    if (isLoading) {
      return (
        <div className="flex flex-col w-full px-8 pt-4">
          <div className="text-[18px] font-bold text-white/90 pb-2">
            Has worked with:
          </div>

          {[...new Array(3)].map((_, i) => (
            <div className="flex flex-col w-full gap-3 p-2" key={i}>
              <div className="relative top-[5px]">
                <Skeleton className="w-[80px] h-[10px]"></Skeleton>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-1 items-center gap-2">
                  <Skeleton className="w-8 h-8 rounded-full"></Skeleton>
                  <Skeleton className="w-48 h-6"></Skeleton>
                </div>
                e
                <Skeleton className="px-[9px] h-[20px] min-w-8 rounded-[38px]" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="flex flex-col w-full px-8 pt-4">
        <div className="text-[18px] font-bold text-white/90 pb-2">
          Has worked with:
        </div>

        {crewWorkedWith.length === 0 && (
          <div className="relative top-[-6px] pl-4 text-sm text-white/70">
            No related crew found.
          </div>
        )}

        {crewWorkedWith.map((crew, i) => {
          const parsedTFS = parseTFS(crewWorkedWith[i].tfs);
          const positions = Object.values(parsedTFS);

          let initials = "";

          if (crew.first_name) initials += crew.first_name[0];
          if (crew.last_name) initials += crew.last_name[0];

          return (
            <div key={crew.id} className="pl-2 pb-3">
              <div className="text-sm text-white/100">
                {positions.map((p) => capitalizeString(p)).join(", ")}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8 rounded-full">
                    <AvatarFallback className="w-8 h-8 flex items-center justify-center">
                      <span className="text-[16px] font-medium leading-none">
                        {initials}
                      </span>
                    </AvatarFallback>
                  </Avatar>

                  <div className="text-[20px] text-white font-bold">
                    {crew.first_name + " " + crew.last_name}
                  </div>
                </div>

                <div className="flex items-center justify-center w-[35px] h-[20px] bg-stone-850/100 rounded-2xl">
                  <div className="text-[12px] text-white/60 pr-[3px]">x</div>
                  <div className="text-[14px] text-white font-bold">
                    {crewMemberCounts[crew.id]}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const ContactInfo: React.FC = () => {
    const [expanded, setExpanded] = useState(false);

    useLayoutEffect(() => {
      if (expanded && hoverCardRef.current) {
        hoverCardRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, [expanded]);

    // if (!crewMember.phone && !crewMember.email) return;

    return (
      <div
        ref={hoverCardRef}
        className="flex flex-col w-full pt-4 pr-10 pb-6 pl-8"
      >
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpanded((prev) => !prev)}
        >
          <div className="text-[17px] font-bold text-white/85">
            Contact info
          </div>

          <div>
            <Icon
              name="chevron"
              className={cn(
                "w-[14px] h-[14px] text-white/90 hover:text-white/100",
                expanded && "rotate-90"
              )}
            />
          </div>
        </div>

        {expanded && (
          <div className="flex flex-col pl-2 pt-2">
            <a
              href={crewMember.phone ? `tel:${crewMember.phone}` : "#"}
              className="flex items-center"
            >
              <div className="flex items-center justify-center w-[40px] h-[40px] bg-stone-800/85 rounded-2xl">
                <Icon name="phone" className="w-5 h-5 text-lime-300/85" />
              </div>

              <div className="flex flex-col px-2 py-1">
                <div className="text-sm text-white/70">phone</div>
                <div className="">
                  {crewMember.phone ? crewMember.phone : "--"}
                </div>
              </div>
            </a>

            <a
              href={crewMember.email ? `mailto:${crewMember.email}` : "#"}
              className="flex items-center"
            >
              <div className="flex items-center justify-center w-[40px] h-[40px] bg-stone-800/85 rounded-2xl">
                <Icon name="email" className="w-5 h-5 text-lime-300/85" />
              </div>

              <div className="flex flex-col px-2 py-1">
                <div className="text-sm text-white/70">email</div>
                <div className="">
                  {crewMember.email ? crewMember.email : "--"}
                </div>
              </div>
            </a>
          </div>
        )}
      </div>
    );
  };

  const renderLocation = () => {
    let location = "";

    if (crewMember.city) location = crewMember.city;
    if (crewMember.state) location += `, ${crewMember.state}`;

    return location;
  };

  return (
    <div
      onMouseEnter={() => {
        // setCardIsHovered(true);
        setHoveredCrew(crewMember);
      }}
      onMouseLeave={() => {
        // setCardIsHovered(false);
        setHoveredCrew(null);
        setCrewWorkedWith(null);
      }}
      onClick={(e) => e.stopPropagation()}
      className="flex flex-col items-center w-[380px] h-[650px] backdrop-blur-xl rounded-xl cursor-default !overflow-y-scroll hide-scrollbars"
      style={{
        position: "fixed",
        ...(!onModal && cursorCoords.y < innerHeight - 325
          ? {
              top: cursorCoords
                ? `${Math.min(
                    Math.max(cursorCoords.y - 325, 0),
                    innerHeight - 650
                  )}px`
                : "50px",
            }
          : { bottom: "50px" }),
        ...(!onModal
          ? {
              left: cursorCoords
                ? `${Math.min(cursorCoords.x + 15, innerWidth - 380)}px`
                : "50px",
            }
          : { left: cursorCoords.x - 90 }),
        border: "1px solid #dddddd19",
        background:
          "radial-gradient(circle at 50% 10%, #6C48EA77 5%, rgba(15, 15, 16, 1) 35%)",
        // transition: "right 0.2232s ease-out",
        pointerEvents: "auto",
        zIndex: 1000,
      }}
    >
      <div className="pt-7 pb-2">
        <Avatar className="w-24 h-24 rounded-full">
          <AvatarFallback className="w-24 h-24 flex items-center justify-center">
            <span className="text-[40px] font-medium leading-none">
              {initials}
            </span>
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="text-[34px] font-bold">{renderName()}</div>

      <div className="flex items-center pb-4">
        {(crewMember.city || crewMember.state) && (
          <Icon name="pin" className="w-6 h-6 pr-1 text-white/50" />
        )}

        <div className="text-[17px] text-white/70">{renderLocation()}</div>
      </div>

      <HiredStats />

      {setOptionsForOpen && (
        <div
          onClick={() => (handleCrewClick ? handleCrewClick(crewMember) : null)}
          className={cn(
            "flex items-center justify-between gap-2 w-[230px] px-4 py-2 mt-3 mb-2 bg-stone-800/50 rounded-lg hover:bg-stone-800/80 cursor-pointer",
            selected?.filter((el) => el.id === crewMember?.id).length &&
              "bg-lime-300/20 hover:bg-lime-300/40"
          )}
        >
          {/* selected.filter() */}
          {/*{selected?.[0]?.id === crewMember?.id ? (*/}
          {selected?.filter((el) => el.id === crewMember?.id).length ? (
            <div className="flex items-center justify-evenly w-full">
              <Icon name="check" className="w-6 h-6 text-lime-300/100" />
              <div className="text-sm font-medium text-lime-300/100">
                Crew member selected
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-evenly w-full">
              <Icon name="plus" className="w-6 h-6 text-lime-300/100" />
              <div className="text-sm font-medium text-white/100">
                Add as crew option
              </div>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <LoadingIndicator />
      ) : (
        <>
          <LastHired />

          <HasWorkedWith />

          <ContactInfo />

          <RelatedJobs
            id={crewMember.id}
            expanding={true}
            scrollCallback={() =>
              hoverCardRef.current &&
              hoverCardRef.current.scrollIntoView({ behavior: "smooth" })
            }
          />
        </>
      )}
    </div>
  );
};
