"use client";

import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Header } from "@/components/ui/Header";
import { Card, CardContent } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { capitalizeString, cn, getGreeting } from "@/lib/utils";
import Link from "next/link";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { addHours, addMinutes, format, parse } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import axios from "axios";
import { toast } from "sonner";
import {
  CallSheetLocationType,
  CallSheetMemberType,
  CallSheetType,
  CompanyType,
  FileAttachment,
  LocationType,
  NoteType,
} from "@/types/type";
import { CrewList } from "@/components/blocks/CallCard/CrewList";
import { TabCallCard } from "@/components/ui/TabCallCard";
import { Notes } from "@/components/blocks/CallCard/Notes";
import { User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import { useCallSheetStore } from "@/store/callsheet";
import { CallCardContent } from "./CallCardContent";
import { Files } from "./Files";
import { ViewPdf } from "./ViewPdf";
import { useRouter } from "next-nprogress-bar";

interface Props {
  member: CallSheetMemberType;
  sheet: CallSheetType;
  company: CompanyType;
  user: User;
  contactInfoVisible: boolean;
}

export type View = "call" | "crew" | "profile";

const priorityOrder = ["shoot", "shoot location", "parking", "hospital"];

export const CallCard: React.FC<Props> = ({
  member,
  sheet,
  company,
  user,
  contactInfoVisible,
}) => {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<View>("call");
  const [submitted, setSubmitted] = useState(member.status === "confirmed");
  const [loading, setLoading] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [notes, setNotes] = useState<{
    before_details: NoteType[];
    on_page: NoteType[];
  }>({ before_details: [], on_page: [] });
  const [showNotes, setShowNotes] = useState(false);
  const [showNotesType, setShowNotesType] = useState<
    "before_details" | "on_page" | "all"
  >("before_details");
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [locations, setLocations] = useState<CallSheetLocationType[]>([]);

  const { fetchCallPushes, callPush } = useCallSheetStore();
  const [files, setFiles] = useState<
    (FileAttachment & { signedUrl?: string | null })[]
  >([]);
  const [filesLoading, setFilesLoading] = useState(false);

  const signedUrlCacheRef = useRef<{
    [key: string]: { url: string; expiry: number };
  }>({});

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (mounted) return;
    setMounted(true);

    supabase
      .from("notification_log")
      .insert({
        type: "call_card_opened",
        call_sheet: sheet?.id,
        call_sheet_member: member?.id,
        company: company.id,
      })
      .then(() => {});
  }, [mounted]);

  const handleSubmit = async () => {
    setLoading(true);

    ("use server");
    await supabase
      .from("call_sheet_member")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("id", member.id);

    await axios.get(`/sms/confirm-call/${member.id}`).catch(() => {
      setLoading(false);
      toast.error("Something went wrong.");
    });

    setSubmitted(true);
    setLoading(false);
  };

  const [initials, firstName] = useMemo(() => {
    if (!member?.name) {
      return ["", "", ""];
    }

    const [firstName] = member?.name?.split(" ");

    const initials = member?.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("");

    return [initials, firstName];
  }, [member.name]);

  useEffect(() => {
    fetchCallPushes(sheet?.id);
  }, [fetchCallPushes, sheet?.id]);

  const date = useMemo(() => {
    try {
      /* @ts-ignore */
      const d = parse(sheet?.raw_json?.full_date, "MM/dd/yy", new Date());

      /* @ts-ignore */
      if (isNaN(d.getTime())) return sheet?.raw_json?.full_date;

      return format(d, "EEE, MMM d");
    } catch {
      /* @ts-ignore */
      return sheet?.raw_json?.full_date;
    }
    /* @ts-ignore */
  }, [sheet?.raw_json?.full_date]);

  const [month, day] = useMemo(() => {
    try {
      const d = new Date(date);

      return [format(d, "MMM"), format(d, "d")];
    } catch {
      return ["", ""];
    }
  }, [date]);

  const time = useMemo(() => {
    try {
      const parsedTime = parse(
        !!member.call_time
          ? member.call_time
          : /* @ts-ignore */
            sheet?.raw_json?.general_crew_call ?? "",
        "h:mm a",
        new Date()
      );

      const formattedTime = format(parsedTime, "h:mmaaaaa");

      return formattedTime;
    } catch {
      return member.call_time;
    }
    /* @ts-ignore */
  }, [member.call_time, sheet?.raw_json?.general_crew_call]);

  const callTime = useMemo(() => {
    if (!time || !callPush) return time;

    try {
      const originalTime = parse(time, "h:mmaaaaa", new Date());

      let newTime = addHours(originalTime, callPush.hours ?? 0);
      newTime = addMinutes(newTime, callPush.minutes ?? 0);

      return format(newTime, "h:mmaaaaa");
    } catch (error) {
      return time;
    }
  }, [time, callPush]);

  const fetchLocations = useCallback(async () => {
    const { data } = await supabase
      .from("call_sheet_location")
      .select("*, location (*)")
      .eq("call_sheet", sheet?.id);

    setLocations(data ?? []);
  }, [sheet?.id, supabase]);

  const fetchNotes = useCallback(async () => {
    setLoadingNotes(true);

    const { data: companySettings } = await supabase
      .from("company_setting")
      .select()
      .eq("company", company?.id);

    const { data, error: fetchNotesError } = await supabase
      .from("note")
      .select()
      .eq("call_sheet", sheet?.id)
      .order("priority", { ascending: true });

    const { data: companyNotices } = await supabase
      .from("company_policy")
      .select()
      .eq("company", company?.id)
      .order("priority", { ascending: true });

    if (!data || fetchNotesError) {
      return;
    }

    const { data: acknowledgedNotes } = await supabase
      .from("note_acknowledge")
      .select()
      .eq("member", user?.id);

    const noticesFirst =
      companySettings?.[0]?.company_notice_priority !== "below";

    const notices = {
      before_details:
        companyNotices?.filter(
          (n) =>
            n.type === "before_details" &&
            !acknowledgedNotes?.map((n) => n.notice)?.includes(n.id)
        ) ?? [],
      on_page: companyNotices?.filter((n) => n.type === "on_page") ?? [],
    };

    const notes = {
      before_details:
        data.filter(
          (n) =>
            n.type === "before_details" &&
            !acknowledgedNotes?.map((n) => n.note)?.includes(n.id)
        ) ?? [],
      on_page: data.filter((n) => n.type === "on_page") ?? [],
    };

    setNotes({
      before_details: noticesFirst
        ? ([...notices.before_details, ...notes.before_details] as NoteType[])
        : ([...notes.before_details, ...notices.before_details] as NoteType[]),
      on_page: noticesFirst
        ? ([...notices.on_page, ...notes.on_page] as NoteType[])
        : ([...notes.on_page, ...notices.on_page] as NoteType[]),
    });

    setLoadingNotes(false);

    if (
      !!data.filter(
        (n) =>
          n.type === "before_details" &&
          !acknowledgedNotes?.map((n) => n.note)?.includes(n.id)
      ).length ||
      !!companyNotices?.filter(
        (n) =>
          n.type === "before_details" &&
          !acknowledgedNotes?.map((n) => n.notice)?.includes(n.id)
      ).length
    ) {
      setShowNotesType("before_details");
      setShowNotes(true);
    }
  }, [sheet?.id, supabase, user?.id]);

  useEffect(() => {
    fetchNotes();
    fetchLocations();
  }, []);

  const getSignedUrl = useCallback(
    async (file: FileAttachment) => {
      if (!file.src) return null;

      const cacheKey = file.src;
      const cachedItem = signedUrlCacheRef.current[cacheKey];

      if (cachedItem && cachedItem.expiry > Date.now()) {
        return cachedItem.url;
      }

      try {
        const { data } = await supabase.storage
          .from("attachments")
          .createSignedUrl(file.src, 86400);

        if (data?.signedUrl) {
          signedUrlCacheRef.current[cacheKey] = {
            url: data.signedUrl,
            expiry: Date.now() + 86400000, // 24 hours in milliseconds
          };
          return data.signedUrl;
        }
      } catch (error) {
        console.error("Error creating signed URL:", error);
      }

      return null;
    },
    [supabase]
  );

  const fetchFiles = useCallback(() => {
    setFilesLoading(true);
    supabase
      .from("file")
      .select()
      .eq("call_sheet", sheet?.id)
      .then(async ({ data }) => {
        if (!data) {
          setFilesLoading(false);
          return;
        }

        const updatedFiles = await Promise.all(
          data.map(async (file) => ({
            ...file,
            signedUrl: await getSignedUrl(file),
          }))
        );

        setFiles(updatedFiles);
        setFilesLoading(false);
      });
  }, [getSignedUrl, sheet?.id, supabase]);

  useEffect(() => {
    fetchFiles();
  }, []);

  const setViewCallback = (view: View) => {
    setView(view);
  };

  const sortedLocations = useMemo(() => {
    return [...locations].sort((a, b) => {
      const aIndex = priorityOrder.indexOf(a.type?.toLowerCase() ?? "");
      const bIndex = priorityOrder.indexOf(b.type?.toLowerCase() ?? "");

      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    });
  }, [locations]);

  if (loadingNotes) return <LoadingIndicator />;

  return (
    <>
      <AnimatePresence>
        {showNotes && (
          <motion.div
            className="fixed inset-0 bg-black z-50"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <Notes
              company={company.name ?? ""}
              // @ts-ignore
              project={sheet?.raw_json?.job_name}
              notes={
                showNotesType === "all"
                  ? [
                      ...(notes?.before_details ?? []),
                      ...(notes?.on_page ?? []),
                    ]
                  : notes[showNotesType]
              }
              setShowNotes={(v) => {
                setShowNotes(v);
                setSelectedNoteId(null);
              }}
              user={user}
              selectedNoteId={selectedNoteId}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!showNotes && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {view !== "profile" ? (
              <Header
                callback={setViewCallback}
                view={view}
                action={
                  <Avatar className="sm:hidden">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                }
              />
            ) : (
              <div
                onClick={() =>
                  setViewCallback(view === "profile" ? "crew" : "call")
                }
                className="flex items-center group absolute top-[31px] sm:top-12 z-10 cursor-pointer"
              >
                <Icon
                  name="chevron"
                  className="w-5 h-5 ml-2 text-zinc-600 rotate-180 group-hover:text-white duration-100"
                />
                <div className="text-lg ml-3">Back</div>
              </div>
            )}

            <div className="max-w-[480px] mx-auto w-full sm:mt-12 mb-16 sm:mb-10">
              {view === "call" ? (
                <div className="max-w-[480px] mx-auto w-full max-sm:mt-[75px]">
                  <div
                    className="group flex items-center cursor-pointer gap-2 mb-5"
                    onClick={() =>
                      router.push(`../project/portal/${member.project}`)
                    }
                  >
                    <Icon
                      name="chevron"
                      className="w-3 h-3 rotate-180 text-white text-opacity-70 group-hover:text-opacity-90"
                    />

                    <div className="text-white text-opacity-70 group-hover:text-opacity-90">
                      Back to Project Home
                    </div>
                  </div>

                  <div className="sm:px-[30px]">
                    <Avatar className="hidden sm:block mb-5" size="large">
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>

                    <h3 className="mb-3 text-2xl sm:text-[28px] font-medium text-white sm:mb-8 flex items-center justify-between">
                      <span>
                        {getGreeting()}, <strong>{firstName}</strong>!
                      </span>

                      <div className="sm:hidden flex flex-col uppercase text-xs text-center leading-none">
                        {month}
                        <span className="text-2xl leading-none">{day}</span>
                      </div>
                    </h3>
                  </div>

                  <div className="flex flex-col gap-4">
                    <CallCardContent
                      sheet={sheet}
                      member={member}
                      date={date}
                      time={time}
                      callTime={callTime ?? undefined}
                      callPush={callPush}
                      onConfirm={handleSubmit}
                      loading={loading}
                      submitted={submitted}
                      company={company}
                    />

                    {locations.length > 0 && (
                      <>
                        <div className="text-white text-base font-medium leading-tight">
                          Locations
                        </div>

                        {sortedLocations.map((l) => {
                          const location =
                            l.location as unknown as LocationType;
                          return (
                            <Link
                              key={l.id}
                              href={`https://www.google.com/maps?daddr=${encodeURI(
                                location.address || location.name || ""
                              )}`}
                              target="_blank"
                            >
                              <Card className="px-8 py-6 group rounded-[10px] bg-card-gradient">
                                <CardContent className="p-0 flex flex-col gap-4">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-bold text-sm text-white text-nowrap overflow-hidden text-ellipsis">
                                        {capitalizeString(
                                          l.description ?? l.type ?? "Location"
                                        )}
                                      </div>

                                      {l.name && (
                                        <span className="text-white/85 text-lg leading-snug font-medium">
                                          {l.name}
                                          <br />
                                        </span>
                                      )}

                                      {location.address && (
                                        <span className="text-white/85 text-lg leading-snug font-medium">
                                          {location.address}
                                          <br />
                                        </span>
                                      )}

                                      <span className="text-stone-300/60 text-lg leading-snug font-medium"></span>
                                    </div>
                                    <Icon
                                      name="chevron"
                                      className="w-[10px] h-5 text-white/25 group-hover:text-white/80 duration-100"
                                    />
                                  </div>

                                  <Button
                                    className="justify-center flex gap-1 w-full text-[15px] font-500"
                                    variant={"outline"}
                                    size={"compact"}
                                  >
                                    <Icon
                                      className="w-4 h-4"
                                      name="directions"
                                    />
                                    Get Directions
                                  </Button>
                                </CardContent>
                              </Card>
                            </Link>
                          );
                        })}
                      </>
                    )}

                    {!!(sheet?.src ?? callPush?.src) && (
                      <ViewPdf
                        src={`/callsheet-pdfs/${encodeURIComponent(
                          callPush?.src ?? sheet?.src ?? ""
                        )}?id=${member?.id}`}
                        sheet={sheet?.id}
                        member={member?.id}
                        company={company.id}
                      />
                    )}

                    {!![
                      ...(notes?.before_details ?? []),
                      ...(notes?.on_page ?? []),
                    ]?.filter((n) => !!n.title || !!n.note).length && (
                      <>
                        <div className="text-white text-base font-medium leading-tight">
                          Notes
                        </div>
                        <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4">
                          <div className="w-2 min-w-2 max-w-2 flex flex-1 opacity-0 snap-start flex-shrink-0"></div>
                          {[
                            ...(notes?.before_details ?? []),
                            ...(notes?.on_page ?? []),
                          ]?.map((n) => {
                            return (
                              <div
                                className={cn(
                                  "p-6 rounded-3xl border border-white/20 flex flex-col gap-1 cursor-pointer w-[220px] flex-shrink-0 snap-start hover:bg-white/5 duration-100"
                                )}
                                key={n.id}
                                onClick={() => {
                                  setShowNotesType("all");
                                  setSelectedNoteId(n.id);
                                  setShowNotes(true);
                                }}
                              >
                                {n.title && (
                                  <div className="text-white/95 text-base font-bold leading-tight">
                                    {n.title}
                                  </div>
                                )}

                                {n.note && (
                                  <div className="font-label text-white/60 text-sm">
                                    {n.note}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          <div className="w-2 min-w-2 max-w-2 flex flex-1 opacity-0 snap-start flex-shrink-0"></div>
                        </div>
                      </>
                    )}
                    <Files files={files} loading={filesLoading} />
                  </div>
                </div>
              ) : (
                <CrewList
                  user={user}
                  member={member}
                  sheet={sheet}
                  company={company}
                  date={date}
                  callback={setViewCallback}
                  view={view}
                  contactInfoVisible={contactInfoVisible}
                />
              )}

              {/* REMARK: consider modifying the original tab component to work with new styles rather than new component. */}
              {view !== "profile" && (
                <div className="z-10 fixed top-3 max-w-[480px] w-[358px] left-1/2 -translate-x-1/2 sm:w-full mt-3">
                  <TabCallCard
                    options={["call", "crew"]}
                    selected={view}
                    setSelected={setViewCallback as (arg: string) => void}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
