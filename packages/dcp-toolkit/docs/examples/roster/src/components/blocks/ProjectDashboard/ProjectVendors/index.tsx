"use client";

import React, { FC, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { CompanyEntityType, ProjectEntityType } from "@/types/type";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ManageProjectVendorEntities } from "@/components/blocks/ProjectDashboard/ProjectVendors/ManageProjectVendorEntities";
import { VendorEntity } from "@/components/blocks/ProjectDashboard/ProjectVendors/VendorEntity";

type Props = {
  userId: string;
  projectId: string;

  projectVendorsModalOpen: boolean;
  setProjectVendorsModalOpen: (open: boolean) => void;
  setVendorEntitiesEmpty: (bool: boolean) => void;
};

export const ProjectVendors: FC<Props> = (props) => {
  const [companyEntities, setCompanyEntities] = useState<CompanyEntityType[]>(
    []
  );
  const [projectEntities, setProjectEntities] = useState<ProjectEntityType[]>(
    []
  );
  const [selectedVendorEntity, setSelectedVendorEntity] = useState<
    "new" | CompanyEntityType["id"] | null
  >(null);
  const [projectVendorsModalOpen, setProjectVendorsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const subtypeTags = [
    "Suggestion 1",
    "Suggestion 2",
    "Suggestion 3",
    "Suggestion 4",
  ];
  const [initialSubtype, setInitialSubtype] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const fetchCompanyEntities = async () => {
      setIsLoading(true);

      //-- fetch all entities related to the user's company.
      const { data: companyEntitiesData, error: companyEntitiesError } =
        await supabase
          .from("company_entity")
          .select()
          .eq("company", props.userId);

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
          .eq("project", props.projectId);

      if (!projectEntitiesData || projectEntitiesError) {
        console.error("Error: ", projectEntitiesError);
        toast.error("Something went wrong fetching project entities.");

        setIsLoading(false);

        return;
      }

      setIsLoading(false);
      setCompanyEntities(companyEntitiesData);
      setProjectEntities(projectEntitiesData);
    };

    fetchCompanyEntities();
  }, [props.projectId, refreshKey]);

  const companyVendors = companyEntities.filter(
    (ent) => ent.type?.toLowerCase() === "vendor"
  );

  const projectVendors = projectEntities.filter(
    (ent) => ent.type?.toLowerCase() === "vendor"
  );

  useEffect(() => {
    setProjectVendorsModalOpen(props.projectVendorsModalOpen);
  }, [props.projectVendorsModalOpen]);

  useEffect(() => {
    if (projectVendors.length === 0) {
      props.setVendorEntitiesEmpty(true);
    } else {
      props.setVendorEntitiesEmpty(false);
    }
  }, [projectVendors]);

  return (
    <div className="flex flex-col">
      <div className="flex w-full h-auto gap-3 overflow-x-scroll hide-scrollbars rounded-xl">
        {/* vendor entities */}
        {projectVendors.length > 0 && (
          <div className="flex gap-2 py-3 font-medium text-[20px]">
            <div className="flex items-center gap-2 w-full">
              {projectVendors.map((entity) => {
                return (
                  <VendorEntity
                    key={entity.id}
                    entity={entity}
                    // pointOfContact={}
                    setSelectedEntity={(id) => {
                      setSelectedVendorEntity(id);
                      setProjectVendorsModalOpen(true);
                    }}
                  />
                );
              })}
            </div>

            {!isLoading && projectEntities.length > 0 && (
              <div className="flex flex-col items-center justify-evenly gap-2 pr-3 h-full max-sm:py-3">
                <div
                  onClick={() => {
                    setSelectedVendorEntity(null);
                    setProjectVendorsModalOpen(true);
                  }}
                  className="flex flex-1 items-center justify-center w-[45px] h-[45px] bg-zinc-900/70 rounded-2xl text-white/30 cursor-pointer hover:bg-zinc-900/95 hover:text-white/65"
                >
                  <Icon name="plus" className="w-8 h-8" />
                </div>

                <div
                  onClick={() => {
                    setSelectedVendorEntity("");
                    setProjectVendorsModalOpen(true);
                  }}
                  className="flex flex-1 items-center justify-center w-[45px] h-[45px] bg-zinc-900/70 rounded-2xl text-white/30 cursor-pointer hover:bg-zinc-900/95 hover:text-white/65"
                >
                  <Icon name="edit" className="w-5 h-5" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {projectVendorsModalOpen && (
        <ManageProjectVendorEntities
          userId={props.userId}
          projectId={props.projectId}
          companyVendors={companyVendors}
          projectVendors={projectVendors}
          initiallyViewing={selectedVendorEntity ?? "new"}
          initialSubtype={initialSubtype}
          onCancel={() => {
            setSelectedVendorEntity(null);
            setInitialSubtype(null);
            setProjectVendorsModalOpen(false);
            props.setProjectVendorsModalOpen(false);
          }}
          onSave={() => {
            setRefreshKey && setRefreshKey((prev) => prev + 1);
            setSelectedVendorEntity(null);
            setInitialSubtype(null);
            setProjectVendorsModalOpen(false);
            props.setProjectVendorsModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
