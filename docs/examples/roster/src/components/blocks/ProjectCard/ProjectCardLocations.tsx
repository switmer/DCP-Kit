import React, { FC, useMemo } from "react";
import { LocationType, ProjectLocationType, ProjectType } from "@/types/type";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { capitalizeString } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";

type Props = {
  project: ProjectType;
  locations: ProjectLocationType[];
};

const priorityOrder = ["shoot", "shoot location", "parking", "hospital"];

export const ProjectCardLocations: FC<Props> = (props) => {
  const sortedLocations = useMemo(() => {
    return [...props.locations].sort((a, b) => {
      const aIndex = priorityOrder.indexOf(a.type?.toLowerCase() ?? "");
      const bIndex = priorityOrder.indexOf(b.type?.toLowerCase() ?? "");

      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    });
  }, [props.locations]);

  return (
    <>
      {props.locations.length > 0 && (
        <>
          <div className="text-white text-base font-medium leading-tight">
            Locations
          </div>

          {sortedLocations.map((l) => {
            const location = l.location as unknown as LocationType;

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
                      <Icon className="w-4 h-4" name="directions" />
                      Get Directions
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </>
      )}
    </>
  );
};
