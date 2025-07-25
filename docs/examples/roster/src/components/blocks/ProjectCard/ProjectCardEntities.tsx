import React, { FC } from "react";
import { CompanyEntityType, ProjectType } from "@/types/type";
import { Card, CardContent } from "@/components/ui/Card";
import { capitalizeString, cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { formatPhoneNumber } from "react-phone-number-input/min";
import { Tooltip } from "@/components/ui/Tooltip";
import { ProjectCardEntityItem } from "@/components/blocks/ProjectCard/ProjectCardEntityItem";

type Props = {
  project: ProjectType;
  entities: CompanyEntityType[];
};

export const ProjectCardEntities: FC<Props> = (props) => {
  const agencyEntities = props.entities.filter(
    (ent) => ent.type?.toLowerCase() === "agency"
  );

  const clientEntities = props.entities.filter(
    (ent) => ent.type?.toLowerCase() === "client"
  );

  const vendorEntities = props.entities.filter(
    (ent) => ent.type?.toLowerCase() === "vendor"
  );

  const otherEntities = props.entities.filter(
    (ent) =>
      ent.type?.toLowerCase() !== "agency" &&
      ent.type?.toLowerCase() !== "client" &&
      ent.type?.toLowerCase() !== "vendor"
  );

  if (
    [
      ...(agencyEntities ?? []),
      ...(clientEntities ?? []),
      ...(vendorEntities ?? []),
      ...(otherEntities ?? []),
    ].length === 0
  ) {
    return (
      <div className="">
        <div className="text-white text-base font-medium leading-tight">
          Entities & Vendors
        </div>

        <div className="pl-2 text-white/60">
          No entities or vendors found for this project.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {[
        ...(agencyEntities ?? []),
        ...(clientEntities ?? []),
        ...(otherEntities ?? []),
      ].length > 0 ? (
        <>
          <div className="text-white text-base font-medium leading-tight">
            Entities
          </div>

          {agencyEntities.map((ent) => (
            <ProjectCardEntityItem ent={ent} key={ent.id} />
          ))}

          {clientEntities.map((ent) => (
            <ProjectCardEntityItem ent={ent} key={ent.id} />
          ))}

          {otherEntities.map((ent) => (
            <ProjectCardEntityItem ent={ent} key={ent.id} />
          ))}
        </>
      ) : (
        <div className="">
          <div className="text-white text-base font-medium leading-tight">
            Entities
          </div>

          <div className="pl-2 text-white/60">
            No entities found for this project.
          </div>
        </div>
      )}

      {[...(vendorEntities ?? [])].length > 0 ? (
        <>
          <div className="text-white text-base font-medium leading-tight">
            Vendors
          </div>

          {vendorEntities.map((ent) => (
            <ProjectCardEntityItem ent={ent} key={ent.id} />
          ))}
        </>
      ) : (
        <div className="">
          <div className="text-white text-base font-medium leading-tight">
            Vendors
          </div>

          <div className="pl-2 text-white/60">
            No vendors found for this project.
          </div>
        </div>
      )}
    </div>
  );
};
