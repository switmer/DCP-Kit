'use client';

import React, { FC, useState, useEffect, useCallback } from 'react';
import { ProjectEntities } from '@/components/blocks/ProjectDashboard/ProjectEntities';
import { ProjectLocations, ProjectLocationWithAddress } from '@/components/blocks/ProjectDashboard/ProjectLocations';
import { ProjectNotes } from '@/components/blocks/ProjectDashboard/ProjectNotes';
import { ProjectFiles } from '@/components/blocks/ProjectDashboard/ProjectFiles';
import { Crew } from '@/components/blocks/ProjectDashboard/Crew';
import { ProjectVendors } from '@/components/blocks/ProjectDashboard/ProjectVendors';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { ProjectType } from '@/types/type';
import { ProjectTimelineCards } from '@/components/blocks/ProjectDashboard/ProjectTimelineCards';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Tab } from '@/components/ui/Tab';
import { ProjectInfoCards } from '@/components/blocks/ProjectDashboard/ProjectInfoCards';
import { createClient } from '@/lib/supabase/client';
import { differenceInCalendarDays } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

type Props = {
  userId: string;
  project: ProjectType;
  projectId: string;
};

export type ProjectDashViewT = 'overview' | 'crew' | 'talent' | 'messages' | 'files' | 'vendors' | 'locations';

export const ProjectDashboard: FC<Props> = (props) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const tabParam = searchParams.get('tab');
  const [selectedView, setSelectedView] = useState<ProjectDashViewT>((tabParam as ProjectDashViewT) || 'overview');

  const [crewView, setCrewView] = useState<'list' | 'departments'>('departments');

  const views = ['Overview', 'Crew', 'Talent', 'Messages', 'Files', 'Vendors', 'Locations'];

  const [loading, setLoading] = useState(false);

  const { data: projectData } = useQuery({
    queryKey: ['project', props.projectId],
    queryFn: async () => {
      const { data } = await supabase.from('project').select('*').eq('id', props.projectId).single();
      return data;
    },
    initialData: props.project,
  });

  const [crewCount, setCrewCount] = useState<number | null>(null);
  const [positionCount, setPositionCount] = useState<number | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [fileCount, setFileCount] = useState<number | null>(null);
  const [locationCount, setLocationCount] = useState<number | null>(null);

  //-- entities.
  const [productionEntitiesEmpty, setProductionEntitiesEmpty] = useState(false);
  const [clientEntitiesEmpty, setClientEntitiesEmpty] = useState(false);
  const [agencyEntitiesEmpty, setAgencyEntitiesEmpty] = useState(false);
  const [initialEntityType, setInitialEntityType] = useState<'production company' | 'agency' | 'client'>(
    'production company',
  );
  const [projectEntitiesModalOpen, setProjectEntitiesModalOpen] = useState(false);

  //-- vendors.
  const [vendorEntitiesEmpty, setVendorEntitiesEmpty] = useState(false);
  const [projectVendorsModalOpen, setProjectVendorsModalOpen] = useState(false);

  //-- key crew.
  const [keyCrewEmpty, setKeyCrewEmpty] = useState(true); //-- REMARK: temp default true.
  const [projectCrewModalOpen, setProjectCrewModalOpen] = useState(false);

  //-- talent.
  const [talentEmpty, setTalentEmpty] = useState(true); //-- REMARK: temp default true.
  const [projectTalentModalOpen, setProjectTalentModalOpen] = useState(false);

  //-- locations.
  const [locationsEmpty, setLocationsEmpty] = useState(false);
  const [projectLocationsModalOpen, setProjectLocationsModalOpen] = useState<
    boolean | ProjectLocationWithAddress | 'add'
  >(false);

  //-- notes.
  const [notesEmpty, setNotesEmpty] = useState(false);
  const [projectNotesModalOpen, setProjectNotesModalOpen] = useState(false);

  //-- files.
  const [filesEmpty, setFilesEmpty] = useState(false);
  const [projectFilesModalOpen, setProjectFilesModalOpen] = useState(false);

  // Update URL when tab changes
  const updateTab = (view: ProjectDashViewT) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));

    if (view === 'overview') {
      params.delete('tab');
    } else {
      params.set('tab', view);
    }

    router.push(`${pathname}?${params.toString()}`);
    setSelectedView(view);
    resetModalToggles(view);
  };

  // Sync with URL parameter changes
  useEffect(() => {
    const tab = searchParams.get('tab') as ProjectDashViewT;
    if (tab && views.map((v) => v.toLowerCase()).includes(tab)) {
      setSelectedView(tab);
    } else if (!tab) {
      setSelectedView('overview');
    }
  }, [searchParams]);

  const fetchCrewCount = useCallback(async () => {
    setLoading(true);

    const { count } = await supabase
      .from('project_member')
      // .select('*', { count: 'exact', head: true })
      .select(
        `
            *, 
            crew(*)) 
        `,
        { count: 'exact', head: true },
      )
      .eq('project', props.projectId);

    if (count) {
      setCrewCount(count);
    }

    setLoading(false);
  }, [props.projectId, supabase]);

  const fetchPositionCount = useCallback(async () => {
    setLoading(true);

    const { count } = await supabase
      .from('project_position')
      // .select('*', { count: 'exact', head: true })
      .select('*', { count: 'exact', head: true })
      .eq('project', props.projectId);

    if (count) {
      setPositionCount(count);
    }

    setLoading(false);
  }, [props.projectId, supabase]);

  const fetchLocationCount = useCallback(async () => {
    setLoading(true);

    const { count: projLocCount } = await supabase
      .from('project_location')
      .select('*', { count: 'exact', head: true })
      .eq('project', props.projectId);

    if (projLocCount) {
      setLocationCount(projLocCount);
    }

    const { count: sheetLocCount } = await supabase
      .from('call_sheet_location')
      .select('*', { count: 'exact', head: true })
      .eq('project', props.projectId);

    if (sheetLocCount) {
      setLocationCount((prev) => (prev ? prev + sheetLocCount : sheetLocCount));
    }

    setLoading(false);
  }, [props.projectId, supabase]);

  const fetchFileCount = useCallback(async () => {
    setLoading(true);

    const { count } = await supabase
      .from('file')
      .select('*', { count: 'exact', head: true })
      .eq('project', props.projectId);

    if (count) {
      setFileCount(count);
    }

    setLoading(false);
  }, [props.projectId, supabase]);

  useEffect(() => {
    if (selectedView !== 'overview') return;

    fetchCrewCount();
    fetchPositionCount();
    fetchLocationCount();
    fetchFileCount();

    if (props.project.dates && props.project.dates.length > 0) {
      const diffInDays = differenceInCalendarDays(
        new Date(props.project.dates[props.project.dates.length - 1]),
        new Date(),
      );

      if (diffInDays > 0) {
        setDaysRemaining(diffInDays);
      }
    }
  }, [props.project.id, fetchCrewCount, fetchLocationCount, fetchFileCount, fetchPositionCount, selectedView]);

  const resetModalToggles = (view: ProjectDashViewT) => {
    switch (view) {
      case 'overview':
        setProjectLocationsModalOpen(false);
        setProjectEntitiesModalOpen(false);
        setProjectVendorsModalOpen(false);
        setProjectFilesModalOpen(false);
        return;

      case 'messages':
        setProjectNotesModalOpen(false);
        return;

      case 'locations':
        setProjectLocationsModalOpen(false);
        return;

      case 'files':
        setProjectFilesModalOpen(false);
        return;

      case 'vendors':
        setProjectEntitiesModalOpen(false);
        setProjectVendorsModalOpen(false);
        return;

      default:
        return;
    }
  };

  return (
    <>
      <div className="max-w-[calc(100vw-133px)] max-sm:max-w-[100vw]">
        <div className="z-[50] sticky top-[0px] flex items-center w-full h-[60px] mt-2 mb-3 gap-1 bg-[#050508] border border-x-0 border-t-0 border-b-zinc-900 overflow-x-auto max-sm:pb-2">
          {views.map((view) => (
            <div
              key={view}
              className={cn(
                'relative flex items-center justify-center h-[42px] px-4 mx-1 text-[16px] font-medium cursor-pointer whitespace-nowrap outline-none focus:outline-none border-0',
                'transition-all duration-300 ease-in-out transform',
                view.toLowerCase() === selectedView
                  ? 'text-white bg-zinc-800/60 shadow-lg border border-lime-300/20 scale-105'
                  : 'text-white/70 hover:text-white/90 hover:bg-zinc-800/30 border border-transparent hover:scale-102',
              )}
              style={{
                borderRadius: '8px',
              }}
              onClick={() => {
                updateTab(view.toLowerCase() as ProjectDashViewT);
              }}
            >
              {view.toLowerCase() === selectedView && (
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-[2px] bg-lime-300 rounded-t-full transition-all duration-300 ease-in-out"
                  style={{
                    animation: 'slideIn 0.3s ease-in-out',
                  }}
                />
              )}
              {view}
            </div>
          ))}
        </div>

        {/* body wrapper */}
        <div className="flex flex-wrap gap-2 my-2 mb-5 max-sm:px-4 max-sm:bg-dashboard-empty-gradient w-full">
          {/* info cards */}
          {selectedView === 'overview' && (
            <div className="mb-4">
              <ProjectInfoCards
                project={projectData ?? props.project}
                setView={setSelectedView}
                numCrew={crewCount}
                numPositions={positionCount}
                numDaysRemaining={daysRemaining}
                numFiles={fileCount}
                numLocations={locationCount}
              />
            </div>
          )}

          {/* project timeline graph and date cards */}
          {selectedView === 'overview' && (
            <div className="flex flex-col gap-7 w-full">
              <div className="flex items-center gap-2 w-full overflow-x-auto">
                <div className="flex items-center gap-2 min-w-[600px] max-sm:w-full">
                  {/* production entities empty state */}
                  {productionEntitiesEmpty && (
                    <div className="flex flex-col gap-4 min-w-[260px] w-[50%] rounded-xl">
                      <div
                        className="group flex flex-col gap-1 items-center justify-center w-full h-[124px] text-white/50 font-medium border-[3px] border-dashed border-zinc-500/40 rounded-xl cursor-pointer hover:border-zinc-500/60"
                        onClick={(e) => {
                          setInitialEntityType('production company');
                          setProjectEntitiesModalOpen(true);
                        }}
                      >
                        <div className="flex flex-col items-center justify-center gap-1">
                          <Icon name="user" className="w-[50px] h-[50px] text-white/40 group-hover:text-white/60" />
                          <div className="flex gap-3 items-center justify-center w-full pb-2">
                            <div className="w-[20px] h-[20px] bg-zinc-800 rounded-full group-hover:bg-zinc-700">
                              <Icon name="plus" className="w-5 h-5 text-white/30 group-hover:text-white/50" />
                            </div>
                            <div className="text-sm text-white/60 font-bold uppercase group-hover:text-white/80">
                              Add Production Company
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <ProjectEntities
                    userId={props.userId}
                    projectId={props.projectId}
                    initialType={initialEntityType}
                    projectEntitiesModalOpen={projectEntitiesModalOpen}
                    setProjectEntitiesModalOpen={setProjectEntitiesModalOpen}
                    productionEntitiesEmpty={productionEntitiesEmpty}
                    setProductionEntitiesEmpty={setProductionEntitiesEmpty}
                    setClientEntitiesEmpty={setClientEntitiesEmpty}
                    setAgencyEntitiesEmpty={setAgencyEntitiesEmpty}
                  />

                  {/* client entities empty state */}
                  {clientEntitiesEmpty && (
                    <div className="flex flex-col gap-4 min-w-[260px] w-[50%] rounded-xl">
                      <div
                        className="group flex flex-col gap-1 items-center justify-center w-full h-[124px] text-white/50 font-medium border-[3px] border-dashed border-zinc-500/40 rounded-xl cursor-pointer hover:border-zinc-500/60"
                        onClick={(e) => {
                          setInitialEntityType('client');
                          setProjectEntitiesModalOpen(true);
                        }}
                      >
                        <div className="flex flex-col items-center justify-center gap-1">
                          <Icon name="user" className="w-[50px] h-[50px] text-white/40 group-hover:text-white/60" />
                          <div className="flex gap-3 items-center justify-center w-full pb-2">
                            <div className="w-[20px] h-[20px] bg-zinc-800 rounded-full group-hover:bg-zinc-700">
                              <Icon name="plus" className="w-5 h-5 text-white/30 group-hover:text-white/50" />
                            </div>
                            <div className="text-sm text-white/60 font-bold uppercase group-hover:text-white/80">
                              Add Client
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* agency entities empty state */}
                  {agencyEntitiesEmpty && (
                    <div className="flex flex-col gap-4 min-w-[260px] w-[50%] rounded-xl">
                      <div
                        className="group flex flex-col gap-1 items-center justify-center w-full h-[124px] text-white/50 font-medium border-[3px] border-dashed border-zinc-500/40 rounded-xl cursor-pointer hover:border-zinc-500/60"
                        onClick={(e) => {
                          setInitialEntityType('agency');
                          setProjectEntitiesModalOpen(true);
                        }}
                      >
                        <div className="flex flex-col items-center justify-center gap-1">
                          <Icon name="user" className="w-[50px] h-[50px] text-white/40 group-hover:text-white/60" />
                          <div className="flex gap-3 items-center justify-center w-full pb-2">
                            <div className="w-[20px] h-[20px] bg-zinc-800 rounded-full group-hover:bg-zinc-700">
                              <Icon name="plus" className="w-5 h-5 text-white/30 group-hover:text-white/50" />
                            </div>
                            <div className="text-sm text-white/60 font-bold uppercase group-hover:text-white/80">
                              Add Agency
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <div className="min-w-[600px]">
                  <ProjectTimelineCards data={projectData ?? props.project} />
                </div>
              </div>

              {keyCrewEmpty && (
                <div className="flex flex-col gap-4 w-full rounded-xl">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex text-xl text-white font-medium">Core Team</div>
                  </div>

                  <div
                    className="group flex flex-col gap-1 items-center justify-center w-full h-[150px] text-white/50 font-medium border-[3px] border-dashed border-zinc-500/40 rounded-xl cursor-pointer hover:border-zinc-500/60"
                    onClick={(e) => {
                      setProjectCrewModalOpen(true);
                    }}
                  >
                    <div className="flex flex-col items-center justify-center gap-1">
                      <Icon name="user" className="w-[50px] h-[50px] text-white/40 group-hover:text-white/60" />
                      <div className="flex gap-3 items-center justify-center w-full pb-2">
                        <div className="w-[20px] h-[20px] bg-zinc-800 rounded-full group-hover:bg-zinc-700">
                          <Icon name="plus" className="w-5 h-5 text-white/30 group-hover:text-white/50" />
                        </div>
                        <div className="text-sm text-white/60 font-bold uppercase group-hover:text-white/80">
                          Add Core Team
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* files and locations */}
              <div className="w-full">
                <div className="flex gap-6 max-sm:flex-col">
                  <div className="flex flex-col w-[50%] h-full gap-4 max-sm:w-full">
                    <div className="flex items-center w-full min-h-[30px] h-[30px]">
                      <div
                        className="group flex items-center gap-2 cursor-pointer"
                        onClick={() => setSelectedView('files')}
                      >
                        <div className="text-xl text-white-80 font-medium group-hover:text-white/100">Shared files</div>

                        <Icon
                          name="chevron"
                          className="relative top-[1px] w-[10px] h-[10px] text-white/60 group-hover:text-white/80"
                        />
                      </div>

                      <div
                        className="group flex items-center justify-center ml-4 w-[22px] h-[22px] rounded-full border border-zinc-600 cursor-pointer hover:border-zinc-500"
                        onClick={(e) => {
                          setProjectFilesModalOpen(true);
                        }}
                      >
                        <Icon
                          name="plus"
                          className="relative left-[0px] w-5 h-5 text-zinc-400 group-hover:text-zinc-300"
                        />
                      </div>
                    </div>

                    <ProjectFiles
                      view="dash"
                      projectId={props.projectId}
                      projectFilesModalOpen={projectFilesModalOpen}
                      setProjectFilesModalOpen={setProjectFilesModalOpen}
                      setFilesEmpty={setFilesEmpty}
                    />

                    {!filesEmpty && (
                      <div
                        onClick={() => {
                          setProjectFilesModalOpen(true);
                        }}
                        className="group flex items-center justify-center gap-2 w-[120px] min-h-[50px] rounded-xl border border-zinc-700 cursor-pointer hover:bg-white/5"
                      >
                        <Icon
                          name="plus"
                          className="w-5 h-5 text-white text-opacity-70 duration-150 group-hover:text-opacity-90"
                        />
                        <div className="text-white/70 group-hover:text-white/90">Add File</div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col w-[50%] h-full gap-4 max-sm:w-full">
                    <div className="flex items-center w-full min-h-[30px] h-[30px]">
                      <div
                        className="group flex items-center gap-2 cursor-pointer"
                        onClick={() => setSelectedView('locations')}
                      >
                        <div className="text-xl text-white/80 font-medium group-hover:text-white/100">Locations</div>

                        <Icon
                          name="chevron"
                          className="relative top-[1px] w-[10px] h-[10px] text-white/60 group-hover:text-white/80"
                        />
                      </div>

                      <div
                        className="group flex items-center justify-center w-[22px] h-[22px] ml-4 rounded-full border border-zinc-600 cursor-pointer hover:border-zinc-500"
                        onClick={(e) => {
                          setProjectLocationsModalOpen('add');
                        }}
                      >
                        <Icon
                          name="plus"
                          className="relative left-[0px] w-5 h-5 text-zinc-400 group-hover:text-zinc-300"
                        />
                      </div>
                    </div>

                    <ProjectLocations
                      view="dash"
                      projectId={props.projectId}
                      projectLocationsModalOpen={projectLocationsModalOpen}
                      setLocationsEmpty={setLocationsEmpty}
                      setProjectLocationsModalOpen={setProjectLocationsModalOpen}
                    />

                    {!locationsEmpty && (
                      <div
                        onClick={() => {
                          setProjectLocationsModalOpen('add');
                        }}
                        className="group flex items-center justify-center gap-2 w-[160px] min-h-[50px] rounded-xl border border-zinc-700 cursor-pointer hover:bg-white/5 max-sm:mb-24"
                      >
                        <Icon
                          name="plus"
                          className="w-5 h-5 text-white text-opacity-70 duration-150 group-hover:text-opacity-90"
                        />
                        <div className="text-white/70 group-hover:text-white/90">Add Location</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* crew */}
          {selectedView === 'crew' && (
            <div className="flex flex-col w-full gap-4">
              <div className="flex text-2xl items-center text-white font-medium gap-2">
                Crew{' '}
                <Tab
                  options={['departments', 'list']}
                  selected={crewView}
                  setSelected={setCrewView as (view: string) => void}
                  defaultWidth={107}
                />
              </div>

              {/*{keyCrewEmpty && (*/}
              {/*  <div*/}
              {/*    className="group flex flex-col gap-1 items-center justify-center w-full h-[150px] text-white/50 font-medium border-[3px] border-dashed border-zinc-500/40 rounded-xl cursor-pointer hover:border-zinc-500/60"*/}
              {/*    onClick={(e) => {*/}
              {/*      setProjectCrewModalOpen(true);*/}
              {/*    }}*/}
              {/*  >*/}
              {/*    <div className="flex flex-col items-center justify-center gap-1">*/}
              {/*      <Icon name="user" className="w-[50px] h-[50px] text-white/40 group-hover:text-white/60" />*/}

              {/*      <div className="flex gap-3 items-center justify-center w-full pb-2">*/}
              {/*        <div className="w-[20px] h-[20px] bg-zinc-800 rounded-full group-hover:bg-zinc-700">*/}
              {/*          <Icon name="plus" className="w-5 h-5 text-white/30 group-hover:text-white/50" />*/}
              {/*        </div>*/}
              {/*        <div className="text-sm text-white/60 font-bold uppercase group-hover:text-white/80">*/}
              {/*          Add Key Crew*/}
              {/*        </div>*/}
              {/*      </div>*/}
              {/*    </div>*/}
              {/*  </div>*/}
              {/*)}*/}

              <div className="w-full overflow-x-auto">
                <Crew view={crewView} projectId={props.projectId} />
              </div>
            </div>
          )}

          {/* talent*/}
          {selectedView === 'talent' && (
            <div className="flex flex-col w-full gap-4">
              <div className="flex text-2xl text-white font-medium">Talent</div>

              {talentEmpty && (
                <div
                  className="group flex flex-col gap-1 items-center justify-center w-full h-[150px] text-white/50 font-medium border-[3px] border-dashed border-zinc-500/40 rounded-xl cursor-pointer hover:border-zinc-500/60"
                  onClick={(e) => {
                    setProjectTalentModalOpen(true);
                  }}
                >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <Icon name="user" className="w-[50px] h-[50px] text-white/40 group-hover:text-white/60" />

                    <div className="flex gap-3 items-center justify-center w-full pb-2">
                      <div className="w-[20px] h-[20px] bg-zinc-800 rounded-full group-hover:bg-zinc-700">
                        <Icon name="plus" className="w-5 h-5 text-white/30 group-hover:text-white/50" />
                      </div>
                      <div className="text-sm text-white/60 font-bold uppercase group-hover:text-white/80">
                        Add Talent
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* messages/notes */}
          {selectedView === 'messages' && (
            <div className="flex flex-col w-full gap-4">
              <div className="flex text-2xl text-white font-medium">Messages</div>

              {notesEmpty && (
                <div
                  className="group flex flex-col gap-1 items-center justify-center w-full h-[150px] text-white/50 font-medium border-[3px] border-dashed border-zinc-500/40 rounded-xl cursor-pointer hover:border-zinc-500/60"
                  onClick={(e) => {
                    setProjectNotesModalOpen(true);
                  }}
                >
                  <div className="flex flex-col items-center justify-center gap-[13px]">
                    <Icon name="file" className="w-[40px] h-[40px] text-white/40 group-hover:text-white/60" />

                    <div className="flex gap-3 items-center justify-center w-full pb-2">
                      <div className="w-[20px] h-[20px] bg-zinc-800 rounded-full group-hover:bg-zinc-700">
                        <Icon name="plus" className="w-5 h-5 text-white/30 group-hover:text-white/50" />
                      </div>
                      <div className="text-sm text-white/60 font-bold uppercase group-hover:text-white/80">
                        Add Messages and Notes
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="w-full overflow-x-auto">
                <div className="min-w-[600px] max-sm:min-w-full">
                  <ProjectNotes
                    userId={props.userId}
                    projectId={props.projectId}
                    projectNotesModalOpen={projectNotesModalOpen}
                    setProjectNotesModalOpen={setProjectNotesModalOpen}
                    setNotesEmpty={setNotesEmpty}
                  />
                </div>
              </div>
            </div>
          )}

          {/* files */}
          {selectedView === 'files' && (
            <div className="flex flex-col w-full gap-4">
              <div className="flex text-2xl text-white font-medium">Files</div>

              <div className="w-full">
                <ProjectFiles
                  projectId={props.projectId}
                  projectFilesModalOpen={projectFilesModalOpen}
                  setProjectFilesModalOpen={setProjectFilesModalOpen}
                  setFilesEmpty={setFilesEmpty}
                />
              </div>
            </div>
          )}

          {/* entities and vendors */}
          {selectedView === 'vendors' && (
            <div className="flex flex-col gap-4 w-full">
              <div className="flex text-2xl text-white font-medium">Vendors</div>

              {vendorEntitiesEmpty && (
                <div
                  className="group flex flex-col gap-1 items-center justify-center w-full h-[150px] text-white/50 font-medium border-[3px] border-dashed border-zinc-500/40 rounded-xl cursor-pointer hover:border-zinc-500/60"
                  onClick={(e) => {
                    setProjectVendorsModalOpen(true);
                  }}
                >
                  <div className="flex flex-col items-center justify-center gap-[13px]">
                    <Icon name="logo" className="w-[40px] h-[40px] text-white/40 group-hover:text-white/60" />

                    <div className="flex gap-3 items-center justify-center w-full pb-2">
                      <div className="w-[20px] h-[20px] bg-zinc-800 rounded-full group-hover:bg-zinc-700">
                        <Icon name="plus" className="w-5 h-5 text-white/30 group-hover:text-white/50" />
                      </div>
                      <div className="text-sm text-white/60 font-bold uppercase group-hover:text-white/80">
                        Add Vendors
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="w-full overflow-x-auto">
                <div className="min-w-[600px]">
                  <ProjectVendors
                    userId={props.userId}
                    projectId={props.projectId}
                    projectVendorsModalOpen={projectVendorsModalOpen}
                    setProjectVendorsModalOpen={setProjectVendorsModalOpen}
                    setVendorEntitiesEmpty={setVendorEntitiesEmpty}
                  />
                </div>
              </div>
            </div>
          )}

          {/* locations */}
          {selectedView === 'locations' && (
            <div className="flex flex-col w-full gap-4">
              <div className="flex items-center justify-between">
                <div className="flex text-2xl text-white font-medium">Locations</div>

                {!locationsEmpty && (
                  <div
                    className="group flex items-center justify-center w-[22px] h-[22px] rounded-full border border-zinc-600 cursor-pointer hover:border-zinc-500"
                    onClick={(e) => {
                      setProjectLocationsModalOpen('add');
                    }}
                  >
                    <Icon name="plus" className="relative left-[0px] w-5 h-5 text-zinc-400 group-hover:text-zinc-300" />
                  </div>
                )}
              </div>

              {locationsEmpty && (
                <div
                  className="group flex flex-col gap-1 items-center justify-center w-full h-[150px] text-white/50 font-medium border-[3px] border-dashed border-zinc-500/40 rounded-xl cursor-pointer hover:border-zinc-500/60"
                  onClick={(e) => {
                    setProjectLocationsModalOpen('add');
                  }}
                >
                  <div className="flex flex-col items-center justify-center gap-[13px]">
                    <Icon name="pinAlternative" className="w-[40px] h-[40px] text-white/40 group-hover:text-white/60" />

                    <div className="flex gap-3 items-center justify-center w-full pb-2">
                      <div className="w-[20px] h-[20px] bg-zinc-800 rounded-full group-hover:bg-zinc-700">
                        <Icon name="plus" className="w-5 h-5 text-white/30 group-hover:text-white/50" />
                      </div>
                      <div className="text-sm text-white/60 font-bold uppercase group-hover:text-white/80">
                        Add Locations
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="w-full">
                <ProjectLocations
                  view="tab"
                  projectId={props.projectId}
                  projectLocationsModalOpen={projectLocationsModalOpen}
                  setProjectLocationsModalOpen={setProjectLocationsModalOpen}
                  setLocationsEmpty={setLocationsEmpty}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
