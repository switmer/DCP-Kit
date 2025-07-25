"use client";

import React, { FC, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ManageProjectEntities } from "@/components/blocks/ProjectDashboard/ProjectEntities/ManageProjectEntities";
import {
  CompanyEntityType,
  EntityPointOfContactType,
  ProjectEntityType,
} from "@/types/type";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Entity } from "@/components/blocks/ProjectDashboard/ProjectEntities/Entity";
import { ManageProjectVendorEntities } from "@/components/blocks/ProjectDashboard/ProjectVendors/ManageProjectVendorEntities";

type Props = {
  userId: string;
  projectId: string;

  initialType: "production company" | "agency" | "client";
  projectEntitiesModalOpen: boolean;
  setProjectEntitiesModalOpen: (open: boolean) => void;

  setProductionEntitiesEmpty: (b: boolean) => void;
  productionEntitiesEmpty: boolean;
  setClientEntitiesEmpty: (b: boolean) => void;
  setAgencyEntitiesEmpty: (b: boolean) => void;
};

export const ProjectEntities: FC<Props> = (props) => {
  const [companyEntities, setCompanyEntities] = useState<CompanyEntityType[]>(
    []
  );
  const [projectEntities, setProjectEntities] = useState<ProjectEntityType[]>(
    []
  );
  const [selectedEntity, setSelectedEntity] = useState<
    "new" | ProjectEntityType["id"] | null
  >(null);
  const [selectedVendorEntity, setSelectedVendorEntity] = useState<
    "new" | ProjectEntityType["id"] | null
  >(null);
  const [initialType, setInitialType] = useState<
    "production company" | "agency" | "client"
  >(props.initialType ?? "production company");
  const [pointsOfContact, setPointsOfContact] = useState<
    EntityPointOfContactType[]
  >([]);
  const [projectEntitiesModalOpen, setProjectEntitiesModalOpen] = useState(
    props.projectEntitiesModalOpen ?? false
  );
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    setProjectEntitiesModalOpen(props.projectEntitiesModalOpen);
    setInitialType(props.initialType);
  }, [props.initialType, props.projectEntitiesModalOpen]);

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
      setPointsOfContact(pocData);
    };

    fetchCompanyEntities();
  }, [props.projectId, refreshKey]);

  const productionEntities = projectEntities.filter(
    (ent) => ent.type?.toLowerCase() === "production company"
  );

  const agencyEntities = projectEntities.filter(
    (ent) => ent.type?.toLowerCase() === "agency"
  );

  const clientEntities = projectEntities.filter(
    (ent) => ent.type?.toLowerCase() === "client"
  );

  const otherEntities = projectEntities.filter(
    (ent) =>
      ent.type?.toLowerCase() !== "production company" &&
      ent.type?.toLowerCase() !== "agency" &&
      ent.type?.toLowerCase() !== "client" &&
      ent.type?.toLowerCase() !== "vendor"
  );

  useEffect(() => {
    if (productionEntities.length === 0) {
      props.setProductionEntitiesEmpty(true);
    } else {
      props.setProductionEntitiesEmpty(false);
    }

    if (clientEntities.length === 0) {
      props.setClientEntitiesEmpty(true);
    } else {
      props.setClientEntitiesEmpty(false);
    }

    if (agencyEntities.length === 0) {
      props.setAgencyEntitiesEmpty(true);
    } else {
      props.setAgencyEntitiesEmpty(false);
    }
  }, [productionEntities, agencyEntities, clientEntities]);

  const sortedClientsAndAgenciesByOrder = [
    ...productionEntities,
    ...clientEntities,
    ...agencyEntities,
  ].sort((a: ProjectEntityType, b: ProjectEntityType) => {
    const orderA = a.order ?? Infinity; //-- if no order, push to the back.
    const orderB = b.order ?? Infinity; //-- if no order, push to the back.

    return orderA - orderB;
  });

  return (
    <>
      {sortedClientsAndAgenciesByOrder.length > 0 && (
        <div className="flex flex-col h-[124px]">
          <div className="flex w-full h-full gap-2 overflow-x-scroll hide-scrollbars">
            {sortedClientsAndAgenciesByOrder.map((entity) => {
              return (
                <Entity
                  key={entity.id}
                  entity={entity}
                  pointOfContact={
                    pointsOfContact.filter(
                      (poc) => poc.project_entity === entity.id
                    )[0]
                  }
                  setSelectedEntity={(id) => {
                    setSelectedEntity(id);
                    setProjectEntitiesModalOpen(true);
                  }}
                />
              );
            })}

            {/* other entities (not of type production, agency, or client) */}
            <div className="flex gap-2 w-full h-full">
              {otherEntities.length > 0 &&
                otherEntities.map((entity) => {
                  return (
                    <Entity
                      key={entity.id}
                      entity={entity}
                      pointOfContact={
                        pointsOfContact.filter(
                          (poc) => poc.project_entity === entity.id
                        )[0]
                      }
                      setSelectedEntity={(id) => {
                        setSelectedEntity(id);
                        setProjectEntitiesModalOpen(true);
                      }}
                    />
                  );
                })}

              {!isLoading && sortedClientsAndAgenciesByOrder.length > 0 && (
                <div className="flex flex-col items-center justify-evenly gap-2 pr-3 h-full max-sm:py-3">
                  <div
                    onClick={() => {
                      setSelectedEntity(null);
                      setProjectEntitiesModalOpen(true);
                    }}
                    className="flex flex-1 items-center justify-center w-[45px] h-[45px] bg-zinc-900/70 rounded-2xl text-white/30 cursor-pointer hover:bg-zinc-900/95 hover:text-white/65"
                  >
                    <Icon name="plus" className="w-8 h-8" />
                  </div>

                  <div
                    onClick={() => {
                      setSelectedEntity("");
                      setProjectEntitiesModalOpen(true);
                    }}
                    className="flex flex-1 items-center justify-center w-[45px] h-[45px] bg-zinc-900/70 rounded-2xl text-white/30 cursor-pointer hover:bg-zinc-900/95 hover:text-white/65"
                  >
                    <Icon name="edit" className="w-5 h-5" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {projectEntitiesModalOpen && (
        <ManageProjectEntities
          userId={props.userId}
          projectId={props.projectId}
          companyEntities={companyEntities}
          projectEntities={projectEntities}
          productionEntitiesEmpty={props.productionEntitiesEmpty}
          pointsOfContact={pointsOfContact}
          initiallyViewing={selectedEntity ?? "new"}
          initialType={initialType}
          onCancel={() => {
            setSelectedEntity(null);
            setProjectEntitiesModalOpen(false);
            props.setProjectEntitiesModalOpen(false);
          }}
          onSave={() => {
            setRefreshKey && setRefreshKey((prev) => prev + 1);
            setSelectedEntity(null);
            setProjectEntitiesModalOpen(false);
            props.setProjectEntitiesModalOpen(false);
          }}
        />
      )}
    </>
  );
};
