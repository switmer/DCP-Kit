'use client';

import React, { FC, useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { ManageProjectCrew } from '@/components/blocks/ProjectDashboard/ProjectCrew/ManageProjectCrew';

type Props = {
  projectId: string;

  projectCrewModalOpen: boolean;
  setProjectCrewModalOpen: (open: boolean) => void;
  setKeyCrewEmpty: (bool: boolean) => void;
};

export const ProjectCrew: FC<Props> = (props) => {
  const [projectCrewModalOpen, setProjectCrewModalOpen] = useState(false);
  const [projectCrew, setProjectCrew] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (projectCrew.length === 0) {
      props.setKeyCrewEmpty(true);
    } else {
      props.setKeyCrewEmpty(false);
    }
  }, [projectCrew]);

  useEffect(() => {
    setProjectCrewModalOpen(props.projectCrewModalOpen);
  }, [props.projectCrewModalOpen]);

  return (
    <>
      {projectCrew.length > 0 && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1 pb-2">
            <Icon name="user" className="w-8 h-8 text-white/70" />
            <div className="text-xl text-white/80">Key crew</div>
          </div>

          {/*<div className="h-[125px]">*/}
          {/*  {projectCrew.length === 0 && (*/}
          {/*    <div*/}
          {/*      className="group flex flex-col items-center justify-center min-w-[200px] max-w-[200px] h-full p-2 rounded-xl border-[3px] border-white/20 border-dashed cursor-pointer hover:border-zinc-500/55"*/}
          {/*      onClick={(e) => {*/}
          {/*        // setInitiallyViewing("new");*/}
          {/*        setProjectCrewModalOpen(true);*/}
          {/*      }}*/}
          {/*    >*/}
          {/*      <div className="flex flex-col items-center justify-between h-full">*/}
          {/*        <div>*/}
          {/*          <Icon*/}
          {/*            name="user"*/}
          {/*            className="w-[50px] h-[50px] mt-3 text-white/30 group-hover:text-white/50"*/}
          {/*          />*/}
          {/*        </div>*/}

          {/*        <div className="flex gap-3 items-center justify-center w-full pb-2">*/}
          {/*          <div className="w-[20px] h-[20px] bg-zinc-800 rounded-full group-hover:bg-zinc-700">*/}
          {/*            <Icon*/}
          {/*              name="plus"*/}
          {/*              className="w-5 h-5 text-white/60 group-hover:text-white/80"*/}
          {/*            />*/}
          {/*          </div>*/}

          {/*          <div className="text-sm text-white/60 font-bold uppercase group-hover:text-white/80">*/}
          {/*            Add Key Crew*/}
          {/*          </div>*/}
          {/*        </div>*/}
          {/*      </div>*/}
          {/*    </div>*/}
          {/*  )}*/}
          {/*</div>*/}
        </div>
      )}

      {projectCrewModalOpen && (
        <ManageProjectCrew
          productionContacts={[]}
          members={[]}
          initiallyViewing="new"
          onCancel={() => {
            setProjectCrewModalOpen(false);
            props.setProjectCrewModalOpen(false);
          }}
          onSave={() => {
            setRefreshKey && setRefreshKey((prev) => prev + 1);
            setProjectCrewModalOpen(false);
            props.setProjectCrewModalOpen(false);
          }}
        />
      )}
    </>
  );
};
