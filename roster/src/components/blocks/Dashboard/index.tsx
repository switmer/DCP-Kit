"use client";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { RenameProject } from "./RenameProject";
import { AddProject } from "./AddProject";
import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";
import { useRouter } from "next-nprogress-bar";
import { cn, formatDateRange } from "@/lib/utils";
import {
  CallSheetMemberType,
  CompanyCrewMemberType,
  ProjectType,
} from "@/types/type";
import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { EmptyJobsCard } from "./EmptyJobsCard";
import { WelcomeSectionTop } from "@/components/blocks/Dashboard/WelcomeSectionTop";
import { UploadSheetsModal } from "@/components/blocks/Dashboard/UploadSheetsModal";
import { differenceInDays } from "date-fns";
import { useCompanyStore } from "@/store/company";
import { Today } from "@/components/blocks/Dashboard/WelcomeSectionTop/Today";
import { UserInfo } from "@/components/blocks/Dashboard/WelcomeSectionTop/UserInfo";
import { ThisWeek } from "@/components/blocks/Dashboard/ThisWeek";
import { CompanyStats } from "@/components/blocks/Dashboard/WelcomeSectionTop/CompanyStats";

export const Dashboard: React.FC = () => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [addProjectModalOpen, setAddProjectModalOpen] = useState(false);
  const [openEdit, setOpenEdit] = useState<ProjectType | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [companyCrewMembers, setCompanyCrewMembers] = useState<
    CompanyCrewMemberType[]
  >([]);

  const [projects, setProjects] = useState<
    (ProjectType & {
      members?: any[];
      membersCount?: number | null;
      callSheet?: string | null;
      historical?: boolean | null;
      day_of_days?: string | null;
      callSheetMembers?: CallSheetMemberType[] | null;
    })[]
  >([]);

  const [activeProjects, setActiveProjects] = useState<
    (ProjectType & {
      members?: any[];
      membersCount?: number | null;
      callSheet?: string | null;
      historical: false;
    })[]
  >([]);

  const [archivedProjects, setArchivedProjects] = useState<
    (ProjectType & {
      members?: any[];
      membersCount?: number | null;
      callSheet?: string | null;
      historical: true;
    })[]
  >([]);

  const [agedProjects, setAgedProjects] = useState<
    (ProjectType & {
      members?: any[];
      membersCount?: number | null;
      callSheet?: string | null;
      historical: boolean | null;
    })[]
  >([]);

  const [unarchivedProjects, setUnarchivedProjects] = useState<
    (ProjectType & {
      members?: any[];
      membersCount?: number | null;
      callSheet?: string | null;
      historical: false;
    })[]
  >([]);

  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = createClient();

  useEffect(() => {
    if (!addProjectModalOpen) {
      fetchProjects();
    }
  }, [addProjectModalOpen]);

  useEffect(() => {
    if (!refreshKey) return;

    fetchProjects();
  }, [refreshKey]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { activeCompany } = useCompanyStore();

  const fetchProjects = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("project")
      .select(
        `
        *,
        call_sheet (
          id,
          short_id,
          historical,
          date,
          raw_json->key_contacts,
          raw_json->day_of_days,
          created_at,
          call_sheet_member (
            *
          ),
          call_sheet_location (
            *,
            location (*)
          )
        )
      `
      )
      .eq("company", activeCompany as string)
      .order("created_at", { ascending: false });

    // const sortedData = data?.map((project) => ({
    //   ...project,
    //   call_sheet: project.call_sheet.sort(
    //     (a, b) =>
    //       new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    //   ),
    // }));

    if (error || !data) {
      toast.error("Something went wrong");
      return;
    }

    const allProjectsWithMembers = await Promise.all(
      data.map(async (project) => {
        const callSheetData = project.call_sheet;

        if (!callSheetData) {
          toast.error("Something went wrong");

          return;
        } else {
          return {
            ...project,
            callSheet: callSheetData[0]?.short_id,
            callSheetId: callSheetData[0]?.id,
            historical: callSheetData[0]?.historical,
            callSheetDate: callSheetData[0]?.date,
            day_of_days: callSheetData[0]?.day_of_days,
            callSheetMembers: callSheetData[0]?.call_sheet_member,
          };
        }
      })
    );

    await fetchCompanyCrew();

    //-- set all projects with members.
    // TODO: type these projects properly.
    setProjects(allProjectsWithMembers as any);

    //-- filter and set projects that are older than 2 weeks.
    const agedProjectsWithMembers = allProjectsWithMembers.filter((p) => {
      if (p?.historical) return false;

      if (p?.dates && p?.dates.length > 0) {
        return differenceInDays(new Date(), p.dates[p.dates.length - 1]) >= 14;
      }
    });

    if (agedProjectsWithMembers.length > 0) {
      setAgedProjects(agedProjectsWithMembers as any);
      setUnarchivedProjects(agedProjectsWithMembers as any);
    }

    //-- filter and set non-historical projects.
    const activeProjectsWithMembers = allProjectsWithMembers.filter((p) => {
      if (!p) {
        return false;
      }

      // Always include non-historical projects without dates
      if (!p?.historical && (!p?.dates || !p?.dates.length)) {
        return true;
      }

      // For projects with dates, only include them if less than 14 days old
      if (!p?.historical && p?.dates && p?.dates.length > 0) {
        return differenceInDays(new Date(), p.dates[p.dates.length - 1]) < 14;
      }

      return false;
    });

    setActiveProjects(activeProjectsWithMembers as any);
    setUnarchivedProjects((prev) => [
      ...prev,
      ...(activeProjectsWithMembers as any),
    ]);

    //-- filter and set historical projects.
    const archivedProjectsWithMembers = allProjectsWithMembers.filter(
      (project) => project?.historical
    );

    setArchivedProjects(archivedProjectsWithMembers as any);

    setLoading(false);
  };

  const fetchCompanyCrew = async () => {
    setLoading(true);

    const { data: companyCrew, error: fetchCompanyCrewError } = await supabase
      .from("company_crew_member")
      .select("*", { count: "exact" })
      .eq("company", activeCompany as string)
      .order("created_at", { ascending: false });

    if (fetchCompanyCrewError || !companyCrew) {
      toast.error("Something went wrong");

      return;
    }

    setCompanyCrewMembers(companyCrew);

    setLoading(false);
  };

  const projectCount = archivedProjects.length + activeProjects.length;
  const projectsThisYear = projects.filter((p) => {
    const projectYear = new Date(p.created_at).getFullYear();
    const currentYear = new Date().getFullYear();

    return projectYear === currentYear;
  });

  let archivedProjectMemberCount = 0;
  archivedProjects.map((p) =>
    p.membersCount ? (archivedProjectMemberCount += p.membersCount) : 0
  );

  let activeProjectMemberCount = 0;
  activeProjects.map((p) =>
    p.membersCount ? (activeProjectMemberCount += p.membersCount) : 0
  );

  //-- get crew members that were created within the last month.
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const newCrew =
    companyCrewMembers?.filter((m) => {
      const memberCreatedAt = new Date(m.created_at);

      //-- return only members created within the last month.
      return memberCreatedAt > oneMonthAgo;
    }) ?? [];

  if (!mounted) return <></>;

  const handleMarkArchived = async (project: ProjectType) => {
    await supabase
      .from("call_sheet")
      .update({
        historical: true,
      })
      .eq("project", project.id)
      .select()
      .limit(1)
      .order("created_at", { ascending: false })
      .single()
      .then(({ error }) => {
        if (error) {
          toast.error(error.message);
          return;
        }

        toast.success(`"${project.name}" marked as historical`);

        setRefreshKey((prev) => prev + 1);
        // onUpdate();
        close();
      });
  };

  const handleUnmarkArchived = async (project: ProjectType) => {
    await supabase
      .from("call_sheet")
      .update({
        historical: false,
      })
      .eq("project", project.id)
      .select()
      .limit(1)
      .order("created_at", { ascending: false })
      .single()
      .then(({ error }) => {
        if (error) {
          toast.error(error.message);
          return;
        }

        toast.success(`"${project.name}" marked as current`);

        setRefreshKey((prev) => prev + 1);
        // onUpdate();
        close();
      });
  };

  return (
    <>
      <div className="block max-sm:hidden">
        <Today mobile={false} />
      </div>

      <div className="hidden max-sm:block">
        <WelcomeSectionTop
          crewCount={companyCrewMembers.length}
          newCrewCount={newCrew.length}
          projectCount={projectCount}
          jobsThisYearCount={projectsThisYear.length}
          loading={loading}
        />
      </div>

      <AddProject
        open={addProjectModalOpen}
        close={() => setAddProjectModalOpen(false)}
        onUpdate={() => {
          fetchProjects();
        }}
      />

      <RenameProject
        onUpdate={() => setRefreshKey((k) => k + 1)}
        p={openEdit}
        close={() => setOpenEdit(null)}
      />

      <div className="flex items-center justify-between text-white text-[38px] leading-none max-sm:hidden">
        <div className="flex items-center max-sm:hidden">
          <UserInfo mobile={false} />
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="accent"
            className="gap-2 flex-1 px-6 text-sm min-w-[199px] max-sm:px-1 max-sm:min-w-[150px]"
            disabled={loading}
            onClick={() => setShowUploadModal(true)}
          >
            <Icon name="upload" className="w-[17px] h-[17px] fill-none" />
            <p className="text-sm max-sm:hidden">Upload call sheets</p>
            <p className="hidden max-sm:block">Upload sheets</p>
          </Button>

          <Button
            variant="outlineAccent"
            className="px-8 flex-1"
            onClick={() => {
              setAddProjectModalOpen(true);
            }}
          >
            + Add new project
          </Button>
        </div>
      </div>

      <div className="block max-sm:hidden">
        <CompanyStats
          crewCount={companyCrewMembers.length}
          newCrewCount={newCrew.length}
          projectCount={projectCount}
          jobsThisYearCount={projectsThisYear.length}
          loading={loading}
        />
      </div>

      <ThisWeek projects={unarchivedProjects} loading={loading} />

      <div className="text-white text-3xl max-sm:text-[26px] max-sm:leading-5">
        Active Jobs
      </div>

      {!activeProjects.length && !loading ? (
        <EmptyJobsCard
          isOpen={addProjectModalOpen}
          setOpenCallback={setAddProjectModalOpen}
          upcoming
          onUpdate={fetchProjects}
        />
      ) : (
        <div className="p-[18px] flex flex-col gap-2 border bg-white bg-opacity-[0.02] border-white border-opacity-10 backdrop-blur-2xl rounded-3xl max-sm:rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-zinc-600 border-opacity-20">
                <TableHead className="text-white text-opacity-95 text-base leading-none font-bold h-14 p-0 min-w-[200px] px-2">
                  Title
                </TableHead>
                <TableHead className="text-white text-opacity-95 text-base leading-none font-bold h-14 p-0 min-w-[200px] px-2">
                  Days
                </TableHead>
                {/*                 <TableHead className="text-white text-opacity-95 text-base leading-none font-bold h-14 p-0 min-w-[200px] px-2">
                  Team
                </TableHead> */}
                <TableHead className="text-white text-opacity-95 text-base leading-none font-bold h-14 p-0 min-w-[68px] px-2"></TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading &&
                [...new Array(3)].map((_, i) => (
                  <TableRow
                    key={i}
                    className="border-b border-zinc-600 border-opacity-20"
                  >
                    <TableCell
                      width={"40%"}
                      className="h-14 p-0 px-2 text-white text-opacity-95 text-base font-normal leading-none"
                    >
                      <Skeleton className="w-[115px] h-4" />
                    </TableCell>
                    <TableCell className="h-14 p-0 px-2 text-white text-opacity-95 text-base font-normal leading-none">
                      <Skeleton className="w-[115px] h-4" />
                    </TableCell>
                  </TableRow>
                ))}

              {activeProjects.map((project, i) => {
                return (
                  <TableRow
                    key={i}
                    className="border-b border-zinc-600 border-opacity-20 cursor-pointer group hover:bg-white hover:bg-opacity-5"
                    onClick={async () =>
                      router.push(`/project/${project.slug ?? project.id}`)
                    }
                  >
                    <TableCell
                      width={"40%"}
                      className="h-14 p-0 px-2 text-white text-opacity-95 text-base font-medium leading-none"
                    >
                      {project?.name ?? "Untitled Project"}
                    </TableCell>

                    <TableCell className="h-14 p-0 px-2 text-white text-opacity-95 text-base font-medium leading-none">
                      <>
                        {project?.dates?.length ? (
                          <>
                            {project.dates?.length}d ·{" "}
                            {formatDateRange(project?.dates ?? [])}
                          </>
                        ) : (
                          "-"
                        )}
                      </>
                    </TableCell>

                    <TableCell className="h-14 p-0 px-2 text-white text-opacity-95 text-base font-medium leading-none">
                      <div className="w-full items-center justify-end flex">
                        <DropdownMenu
                          open={menuOpen === project.id}
                          onOpenChange={(open) =>
                            setMenuOpen(open ? project.id : null)
                          }
                        >
                          <DropdownMenuTrigger
                            onClick={(e) => e.stopPropagation()}
                            className="w-11 h-11 p-3 opacity-60 rounded-xl border border-white border-opacity-20 justify-center items-center flex"
                          >
                            <Icon
                              name="dots"
                              className="w-[18px] h-[18px] text-white rotate-90"
                            />
                          </DropdownMenuTrigger>

                          <DropdownMenuPortal>
                            <DropdownMenuContent
                              side="bottom"
                              align="start"
                              hideWhenDetached
                              className="p-1 bg-neutral-950 rounded-xl shadow border border-white border-opacity-10 w-[190px]"
                            >
                              <DropdownMenuItem
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setOpenEdit(project);
                                }}
                                className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-white text-sm"
                              >
                                Rename
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-white/90 focus:text-white text-sm w-full flex"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <AlertDialog
                                  onConfirm={() => handleMarkArchived(project)}
                                  onCancel={() => {}}
                                  title="Archive this project?"
                                  description="This project and its call sheets will be archived."
                                  withPortal
                                >
                                  Archive
                                </AlertDialog>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-red-400 focus:text-red-400 text-sm w-full flex"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <AlertDialog
                                  onConfirm={async () => {
                                    const { error } = await supabase
                                      .from("project")
                                      .delete()
                                      .eq("id", project.id)
                                      .select();

                                    if (error) {
                                      toast.error("Something went wrong");
                                      return;
                                    }

                                    toast.success("Project deleted");

                                    setRefreshKey((prev) => prev + 1);
                                  }}
                                  onCancel={() => {}}
                                  title="Are you sure you want to delete?"
                                  description="This cannot be undone. This will permanently remove this project and all call sheets related to it."
                                  isDelete
                                  withPortal
                                >
                                  Delete project
                                </AlertDialog>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenuPortal>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* past/aged jobs section */}
      <div className="text-white text-3xl max-sm:text-[26px] max-sm:leading-5">
        Past Jobs
      </div>

      {!agedProjects.length && !loading ? (
        <EmptyJobsCard
          isOpen={addProjectModalOpen}
          setOpenCallback={setAddProjectModalOpen}
          past
          onUpdate={fetchProjects}
        />
      ) : (
        <div className="p-[18px] flex flex-col gap-2 border bg-white bg-opacity-[0.02] border-white border-opacity-10 backdrop-blur-2xl rounded-3xl max-sm:rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-zinc-600 border-opacity-20">
                <TableHead className="text-white text-opacity-95 text-base leading-none font-bold h-14 p-0 min-w-[200px] px-2">
                  Title
                </TableHead>
                {/*                 <TableHead className="text-white text-opacity-95 text-base leading-none font-bold h-14 p-0 min-w-[200px] px-2">
                  Days
                </TableHead> */}
                <TableHead className="text-white text-opacity-95 text-base leading-none font-bold h-14 p-0 min-w-[200px] px-2">
                  Team
                </TableHead>
                <TableHead className="text-white text-opacity-95 text-base leading-none font-bold h-14 p-0 min-w-[68px] px-2"></TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading &&
                [...new Array(3)].map((_, i) => (
                  <TableRow
                    key={i}
                    className="border-b border-zinc-600 border-opacity-20"
                  >
                    <TableCell
                      width={"40%"}
                      className="h-14 p-0 px-2 text-white text-opacity-95 text-base font-normal leading-none"
                    >
                      <Skeleton className="w-[115px] h-4" />
                    </TableCell>
                    <TableCell className="h-14 p-0 px-2 text-white text-opacity-95 text-base font-normal leading-none">
                      <Skeleton className="w-[115px] h-4" />
                    </TableCell>
                  </TableRow>
                ))}

              {agedProjects.map((project, i) => {
                return (
                  <TableRow
                    key={i}
                    className="border-b border-zinc-600 border-opacity-20 cursor-pointer group hover:bg-white hover:bg-opacity-5"
                    onClick={async () =>
                      router.push(`/project/${project.slug ?? project.id}`)
                    }
                  >
                    <TableCell
                      width={"40%"}
                      className="h-14 p-0 px-2 text-white text-opacity-95 text-base font-medium leading-none"
                    >
                      {project?.name ?? "Untitled Project"}
                    </TableCell>

                    <TableCell className="h-14 p-0 px-2 text-white text-opacity-95 text-base font-medium leading-none">
                      <>
                        {project?.dates?.length ? (
                          <>
                            {project.dates?.length}d ·{" "}
                            {formatDateRange(project?.dates ?? [])}
                          </>
                        ) : (
                          "-"
                        )}
                      </>
                    </TableCell>

                    <TableCell className="h-14 p-0 px-2 text-white text-opacity-95 text-base font-medium leading-none">
                      <div className="w-full items-center justify-end flex">
                        <DropdownMenu
                          open={menuOpen === project.id}
                          onOpenChange={(open) =>
                            setMenuOpen(open ? project.id : null)
                          }
                        >
                          <DropdownMenuTrigger
                            onClick={(e) => e.stopPropagation()}
                            className="w-11 h-11 p-3 opacity-60 rounded-xl border border-white border-opacity-20 justify-center items-center flex"
                          >
                            <Icon
                              name="dots"
                              className="w-[18px] h-[18px] text-white rotate-90"
                            />
                          </DropdownMenuTrigger>

                          <DropdownMenuPortal>
                            <DropdownMenuContent
                              side="bottom"
                              align="start"
                              hideWhenDetached
                              className="p-1 bg-neutral-950 rounded-xl shadow border border-white border-opacity-10 w-[190px]"
                            >
                              <DropdownMenuItem
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setOpenEdit(project);
                                }}
                                className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-white text-sm"
                              >
                                Rename
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-white/90 focus:text-white text-sm w-full flex"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <AlertDialog
                                  onConfirm={() => handleMarkArchived(project)}
                                  onCancel={() => {}}
                                  title="Archive this project?"
                                  description="This project and its call sheets will be archived."
                                >
                                  Archive
                                </AlertDialog>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-red-400 focus:text-red-400 text-sm w-full flex"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <AlertDialog
                                  onConfirm={async () => {
                                    const { error } = await supabase
                                      .from("project")
                                      .delete()
                                      .eq("id", project.id)
                                      .select();

                                    if (error) {
                                      toast.error("Something went wrong");
                                      return;
                                    }

                                    toast.success("Project deleted");

                                    setRefreshKey((prev) => prev + 1);
                                  }}
                                  onCancel={() => {}}
                                  title="Are you sure you want to delete?"
                                  description="This cannot be undone. This will permanently remove this project and all call sheets related to it."
                                  isDelete
                                >
                                  Delete project
                                </AlertDialog>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenuPortal>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div
        onClick={() => setShowArchived((prev) => !prev)}
        className={cn(
          "flex items-center gap-2 mt-6 text-white text-xl cursor-pointer max-sm:text-[26px] max-sm:leading-5",
          !showArchived && "mb-[70px]"
        )}
      >
        Show Archived Jobs
        {showArchived ? (
          <Icon name="chevron" className="w-3 h-3 text-gray-400 -rotate-90" />
        ) : (
          <Icon name="chevron" className="w-3 h-3 text-gray-400 rotate-90" />
        )}
      </div>

      {!archivedProjects.length && !loading && showArchived && (
        <EmptyJobsCard
          isOpen={addProjectModalOpen}
          setOpenCallback={setAddProjectModalOpen}
          archived
          onUpdate={fetchProjects}
        />
      )}

      {!!archivedProjects.length && !loading && showArchived && (
        <div className="p-[18px] flex flex-col gap-2 border bg-white bg-opacity-[0.02] border-white border-opacity-10 backdrop-blur-2xl rounded-3xl max-sm:rounded-2xl mb-[100px]">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-zinc-600 border-opacity-20">
                <TableHead className="text-white text-opacity-95 text-base leading-none font-bold h-14 p-0 min-w-[200px] px-2">
                  Title
                </TableHead>
                <TableHead className="text-white text-opacity-95 text-base leading-none font-bold h-14 p-0 min-w-[200px] px-2">
                  Days
                </TableHead>
                <TableHead className="text-white text-opacity-95 text-base leading-none font-bold h-14 p-0 min-w-[200px] px-2">
                  Team
                </TableHead>
                <TableHead className="text-white text-opacity-95 text-base leading-none font-bold h-14 p-0 min-w-[68px] px-2"></TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading &&
                [...new Array(3)].map((_, i) => (
                  <TableRow
                    key={i}
                    className="border-b border-zinc-600 border-opacity-20"
                  >
                    <TableCell
                      width={"40%"}
                      className="h-14 p-0 px-2 text-white text-opacity-95 text-base font-normal leading-none"
                    >
                      <Skeleton className="w-[115px] h-4" />
                    </TableCell>
                    <TableCell className="h-14 p-0 px-2 text-white text-opacity-95 text-base font-normal leading-none">
                      <Skeleton className="w-[115px] h-4" />
                    </TableCell>
                  </TableRow>
                ))}

              {archivedProjects.map((project, i) => {
                return (
                  <TableRow
                    key={i}
                    className="border-b border-zinc-600 border-opacity-20 cursor-pointer group hover:bg-white hover:bg-opacity-5"
                    onClick={async () => {
                      router.push(`/sheet/${project.callSheet}`);
                    }}
                  >
                    <TableCell
                      width={"40%"}
                      className="h-14 p-0 px-2 text-white text-opacity-95 text-base font-medium leading-none"
                    >
                      {project?.name ?? "Untitled Project"}
                    </TableCell>
                    <TableCell className="h-14 p-0 px-2 text-white text-opacity-95 text-base font-medium leading-none">
                      <>
                        {project?.dates?.length && (
                          <>
                            {project.dates?.length}d ·{" "}
                            {formatDateRange(project?.dates ?? [])}
                          </>
                        )}
                      </>
                    </TableCell>

                    <TableCell className="h-14 p-0 px-2 text-white text-opacity-95 text-base font-medium leading-none">
                      <div className="flex items-center">
                        <div className="text-white text-opacity-95 text-base font-normal leading-none mr-4">
                          {project?.membersCount}
                        </div>

                        {project?.members?.map((p, i) => {
                          return (
                            <Tooltip
                              key={i}
                              className="bg-gray-900 border-none rounded-lg p-0"
                              content={
                                <div className="flex gap-2 items-center justify-start pl-4 pr-2 py-2 m-0">
                                  <Avatar className="w-[22px] -ml-2 h-[22px] border bg-background border-white border-opacity-10 rounded-full hover:border-lime-300 duration-150">
                                    <AvatarFallback className="w-full h-full bg-lime-300 flex items-center justify-center">
                                      <span className="text-white text-[11px] font-medium leading-none text-xs">
                                        {p?.name?.[0]}
                                      </span>
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col justify-start items-start gap-[2px]">
                                    <div className="text-center text-white text-opacity-50 text-[11px] leading-[11px]">
                                      {p?.title}
                                    </div>
                                    <div className="text-white text-xs font-bold">
                                      {p?.name}
                                    </div>
                                  </div>
                                </div>
                              }
                            >
                              <Avatar className="w-[22px] -ml-2 h-[22px] border-[2px] bg-background border-white border-opacity-10 rounded-full hover:border-lime-300 duration-150">
                                <AvatarFallback className="w-full h-full bg-lime-300 flex items-center justify-center">
                                  <span className="text-white text-[11px] font-medium leading-none text-xs">
                                    {p?.name?.[0]}
                                  </span>
                                </AvatarFallback>
                              </Avatar>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </TableCell>

                    <TableCell className="h-14 p-0 px-2 text-white text-opacity-95 text-base font-medium leading-none">
                      <div className="w-full items-center justify-end flex">
                        <DropdownMenu
                          open={menuOpen === project.id}
                          onOpenChange={(open) =>
                            setMenuOpen(open ? project.id : null)
                          }
                        >
                          <DropdownMenuTrigger
                            onClick={(e) => e.stopPropagation()}
                            className="w-11 h-11 p-3 opacity-60 rounded-xl border border-white border-opacity-20 justify-center items-center flex"
                          >
                            <Icon
                              name="dots"
                              className="w-[18px] h-[18px] text-white rotate-90"
                            />
                          </DropdownMenuTrigger>

                          <DropdownMenuPortal>
                            <DropdownMenuContent
                              side="bottom"
                              align="start"
                              hideWhenDetached
                              className="p-1 bg-neutral-950 rounded-xl shadow border border-white border-opacity-10 w-[190px]"
                            >
                              <DropdownMenuItem
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setOpenEdit(project);
                                }}
                                className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-white text-sm"
                              >
                                Rename
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-white/90 focus:text-white text-sm w-full flex"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <AlertDialog
                                  onConfirm={() =>
                                    handleUnmarkArchived(project)
                                  }
                                  onCancel={() => {}}
                                  title="Mark this project as current?"
                                  description="This project, and its associated call sheets, will be marked as current."
                                >
                                  Mark as active
                                </AlertDialog>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                className="h-10 pl-3 pr-2 py-2 hover:bg-white hover:bg-opacity-5 rounded text-red-400 focus:text-red-400 text-sm w-full flex"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <AlertDialog
                                  onConfirm={async () => {
                                    const { error } = await supabase
                                      .from("project")
                                      .delete()
                                      .eq("id", project.id)
                                      .select();

                                    if (error) {
                                      toast.error("Something went wrong");
                                      return;
                                    }

                                    toast.success("Project deleted");

                                    setRefreshKey((prev) => prev + 1);
                                  }}
                                  onCancel={() => {}}
                                  title="Are you sure you want to delete?"
                                  description="This cannot be undone. This will permanently remove this project and all call sheets related to it."
                                  isDelete
                                >
                                  Delete project
                                </AlertDialog>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenuPortal>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <UploadSheetsModal
        open={showUploadModal}
        setShowUploadModal={setShowUploadModal}
      />
    </>
  );
};
