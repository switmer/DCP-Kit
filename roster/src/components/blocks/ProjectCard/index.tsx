"use client";

import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/Card";
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
  CompanyEntityType,
  CompanyType,
  FileAttachment,
  LocationType,
  NoteType,
  ProjectLocationType,
  ProjectType,
} from "@/types/type";
import { TabCallCard } from "@/components/ui/TabCallCard";
import { Notes } from "@/components/blocks/CallCard/Notes";
import { User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import { Files } from "@/components/blocks/CallCard/Files";
import { ProjectCardHeader } from "@/components/blocks/ProjectCard/ProjectCardHeader";
import { ProjectCardDetails } from "@/components/blocks/ProjectCard/ProjectCardDetails";
import { ProjectCardCrewList } from "@/components/blocks/ProjectCard/ProjectCardCrewList";
import { ProjectCardNotes } from "@/components/blocks/ProjectCard/ProjectCardNotes";
import { ProjectCardEntities } from "@/components/blocks/ProjectCard/ProjectCardEntities";
import { ProjectCardLocations } from "@/components/blocks/ProjectCard/ProjectCardLocations";
import { CrewingProjectInfo } from "@/components/blocks/Crewing/ProjectInfo";

interface Props {
  user: User;
  company: CompanyType;
  project: ProjectType;
  // member: CallSheetMemberType;
  // sheet: CallSheetType;
  // contactInfoVisible: boolean;
}

export type ProjectCardView = "project" | "crew" | "profile";

export const ProjectCard: React.FC<Props> = (props) => {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<ProjectCardView>("project");
  // const [submitted, setSubmitted] = useState(member.status === "confirmed");
  const [isLoading, setIsLoading] = useState(false);
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
  const [locations, setLocations] = useState<ProjectLocationType[]>([]);
  const [companyEntities, setCompanyEntities] = useState<CompanyEntityType[]>(
    []
  );
  const [projectEntities, setProjectEntities] = useState<CompanyEntityType[]>(
    []
  );

  const [files, setFiles] = useState<
    (FileAttachment & { signedUrl?: string | null })[]
  >([]);
  const [filesLoading, setFilesLoading] = useState(false);

  const signedUrlCacheRef = useRef<{
    [key: string]: { url: string; expiry: number };
  }>({});

  const supabase = createClient();

  const member = { name: "taylor tscharanyan" };

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

  const date = new Date();

  const [month, day] = useMemo(() => {
    try {
      const d = new Date(date);

      return [format(d, "MMM"), format(d, "d")];
    } catch {
      return ["", ""];
    }
  }, [date]);

  useEffect(() => {
    const fetchCompanyEntities = async () => {
      setIsLoading(true);

      //-- fetch all entities related to the user's company.
      const { data: companyEntitiesData, error: companyEntitiesError } =
        await supabase
          .from("company_entity")
          .select()
          .eq("company", props.user.id);

      if (!companyEntitiesData || companyEntitiesError) {
        console.error("Error: ", companyEntitiesError);
        toast.error("Something went wrong fetching company entities.");

        setIsLoading(false);

        return;
      }

      //-- fetch all entities related to this project.
      const { data: projectEntitiesData, error: projectEntitiesError } =
        await supabase
          .from("project_entity")
          .select()
          .eq("project", props.project.id);

      if (!projectEntitiesData || projectEntitiesError) {
        console.error("Error: ", projectEntitiesError);
        toast.error("Something went wrong fetching project entities.");

        setIsLoading(false);

        return;
      }

      const projectEntityIds = projectEntitiesData.map((entity) => entity.id);

      const { data: pocData, error: pocError } = await supabase
        .from("entity_point_of_contact")
        .select()
        .in("project_entity", projectEntityIds);

      if (!pocData || pocError) {
        console.error("Error: ", pocError);
        toast.error("Something went wrong fetching points of contact.");

        setIsLoading(false);

        return;
      }

      setIsLoading(false);
      setCompanyEntities(companyEntitiesData);
      setProjectEntities(projectEntitiesData);
      // setPointsOfContact(pocData);
    };

    fetchCompanyEntities();
  }, [props.project.id]);

  const fetchLocations = useCallback(async () => {
    const { data } = await supabase
      .from("project_location")
      .select("*, location (*)")
      .eq("project", props.project.id);

    setLocations(data ?? []);
  }, [props.project.id, supabase]);

  const fetchNotes = useCallback(async () => {
    setLoadingNotes(true);

    const { data: companySettings } = await supabase
      .from("company_setting")
      .select()
      .eq("company", props.company.id);

    const { data, error: fetchNotesError } = await supabase
      .from("note")
      .select()
      .eq("project", props.project.id)
      .order("priority", { ascending: true });

    const { data: companyNotices } = await supabase
      .from("company_policy")
      .select()
      .eq("company", props.company.id)
      .order("priority", { ascending: true });

    if (!data || fetchNotesError) {
      return;
    }

    const { data: acknowledgedNotes } = await supabase
      .from("note_acknowledge")
      .select()
      .eq("member", props.user.id);

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
  }, [props.project.id, props.user.id, supabase]);

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
      .eq("project", props.project.id)
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
  }, [getSignedUrl, props.project.id, supabase]);

  useEffect(() => {
    fetchFiles();
  }, []);

  const setViewCallback = (view: ProjectCardView) => {
    setView(view);
  };

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
              company={props.company.name ?? ""}
              // @ts-ignore
              project={props.project.name ?? ""}
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
              user={props.user}
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
              <ProjectCardHeader
                callback={setViewCallback}
                view={view}
                action={
                  <Avatar className="sm:hidden">
                    <AvatarFallback>{initials ?? "--"}</AvatarFallback>
                  </Avatar>
                }
              />
            ) : (
              <div
                onClick={() =>
                  setViewCallback(view === "profile" ? "crew" : "project")
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
              {view === "project" ? (
                <div className="max-w-[480px] mx-auto w-full max-sm:mt-[75px]">
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
                    <ProjectCardDetails project={props.project} />

                    <ProjectCardNotes
                      notes={notes}
                      setShowNotesType={setShowNotesType}
                      setSelectedNoteId={setSelectedNoteId}
                      setShowNotes={setShowNotes}
                    />

                    <Files files={files} loading={filesLoading} />

                    <ProjectCardEntities
                      project={props.project}
                      entities={projectEntities}
                    />

                    <ProjectCardLocations
                      project={props.project}
                      locations={locations}
                    />
                  </div>
                </div>
              ) : (
                <ProjectCardCrewList
                  project={props.project}
                  view={view}
                  setViewCallback={setViewCallback}
                />
              )}

              {/* REMARK: consider modifying the original tab component to work with new styles rather than new component. */}
              {view !== "profile" && (
                <div className="z-10 fixed top-3 max-w-[480px] w-[358px] left-1/2 -translate-x-1/2 sm:w-full mt-3">
                  <TabCallCard
                    options={["project", "crew"]}
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
