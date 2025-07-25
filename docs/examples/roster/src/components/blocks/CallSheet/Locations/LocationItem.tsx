import React, {
  CSSProperties,
  Dispatch,
  FC,
  SetStateAction,
  useState,
  useEffect,
} from "react";
import { Icon } from "@/components/ui/Icon";
import Image from "next/image";
import { CallSheetLocationType, ProjectLocationType } from "@/types/type";
import { formatLocationName } from "@/components/blocks/CallSheet/Locations/util/formatLocationName";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { capitalizeString, cn } from "@/lib/utils";
import { getLocationTypeIcon } from "@/components/blocks/CallSheet/Locations/util/getLocationTypeIcon";
import { ProjectLocationWithAddress } from "@/components/blocks/ProjectDashboard/ProjectLocations";

type Props = {
  view?: "dash" | "tab";
  location:
    | ProjectLocationWithAddress
    | (CallSheetLocationType & { address: string });
  setOpen?: Dispatch<SetStateAction<any | null>>;
  index: number;
  selectedLocation?: ProjectLocationWithAddress | null;
  setSelectedLocation: (
    location:
      | ProjectLocationWithAddress
      | (CallSheetLocationType & {
          address: string;
        })
  ) => void;
  setSelectedLocationMapUrl?: (url: string) => void;
  variant?: "modal";
  className?: string;
  onMapMarkerSelect?: () => void;
  weatherLocation?: { lat: number; lng: number } | null;
  setWeatherLocation?: (location: { lat: number; lng: number } | null) => void;
};
export const LocationItem: FC<Props> = (props) => {
  const [mapUrl, setMapUrl] = useState<string>("");
  const [hasLoadedMap, setHasLoadedMap] = useState(false);

  const {
    transform,
    transition,
    setNodeRef,
    isDragging,
    attributes,
    listeners,
  } = useSortable({
    id: props.location.id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition,
    opacity: isDragging ? 1 : 1,
    zIndex: isDragging ? 1 : 0,
    position: "relative",
  };

  useEffect(() => {
    if (props.view === "dash") return;

    if (!hasLoadedMap && props.location && props.location.address) {
      const address = encodeURIComponent(props.location.address);
      const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${process.env.NEXT_PUBLIC_GOOGLE_KEY}`;

      fetch(geocodingUrl)
        .then((response) => response.json())
        .then((data) => {
          const location = data.results[0]?.geometry?.location;

          if (
            !props.weatherLocation &&
            props.setWeatherLocation &&
            (props.location.type === "shoot" ||
              props.location.type === "shoot location")
          ) {
            props.setWeatherLocation(location);
          }

          const lat = location?.lat;
          const lng = location?.lng;

          if (!lat || !lng) return;

          const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x300&markers=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_KEY}&style=feature:all%7Celement:all%7Cinvert_lightness:true`;

          setMapUrl(staticMapUrl);
          setHasLoadedMap(true);
        });
    }
  }, [props.location, hasLoadedMap]);

  if (!props.location || !props.location.address) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      key={props.location.address}
      className={cn(
        "group flex gap-3 cursor-pointer",
        props.variant !== "modal" && "max-w-[372px]",
        (props.view === "dash" || props.view === "tab") && "max-w-full",
        props.className
      )}
      onClick={() => {
        //-- always set map url, if available.
        props.setSelectedLocationMapUrl?.(mapUrl);

        //-- always update selected location.
        props.setSelectedLocation(props.location);

        if (props.onMapMarkerSelect) {
          props.onMapMarkerSelect();
        }

        //-- only open the modal if we're not in "tab" view.
        if (props.setOpen && props.view !== "tab" && props.view !== "dash") {
          props.setOpen(props.location);
        }
      }}
    >
      <div
        // onClick={() => (props.setOpen ? props.setOpen(props.location) : null)}
        // className="group flex w-[380px] bg-white bg-opacity-[0.02] border border-white border-opacity-10 backdrop-blur-2xl rounded-xl overflow-hidden cursor-pointer max-sm:min-w-[300px] max-sm:backdrop-blur-0 max-sm:[background-color:unset] max-sm:rounded-none max-sm:border-none"
        className={cn(
          "group flex rounded-3xl min-w-[350px] bg-white bg-opacity-[0.02] border overflow-hidden backdrop-blur-2xl max-sm:min-w-[300px] max-sm:backdrop-blur-0 max-sm:[background-color:unset] max-sm:rounded-lg",
          props.location.id === props.selectedLocation?.id
            ? "border-lime-400 border-opacity-60 bg-opacity-[0.05]"
            : "border-white border-opacity-10 group-hover:border-opacity-30 group-hover:bg-opacity-[0.04]",
          props.variant === "modal" && "rounded-xl",
          props.variant !== "modal" && "max-sm:h-[95px]",
          props.view === "dash" && "w-full rounded-lg",
          props.view === "tab" && "w-full rounded-2xl"
        )}
      >
        {(props.variant === "modal" || props.view === "tab") &&
          (props.location.type?.toLowerCase().trim() === "shoot" ||
            props.location.type?.toLowerCase().trim() === "shoot location") && (
            <div
              className={cn(
                "absolute top-[0px] left-[-2px] z-20 flex items-center justify-center h-full w-[20px] font-label font-medium uppercase text-sm leading-none",
                isDragging ? "cursor-grabbing" : "cursor-grab"
              )}
              onClick={(e) => e.stopPropagation()}
              {...attributes}
              {...listeners}
            >
              <Icon
                name="drag"
                className={cn(
                  "w-4 h-4 text-white text-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity",
                  isDragging ? "cursor-grabbing opacity-100" : "cursor-grab"
                )}
              />
            </div>
          )}

        <div
          className={cn(
            "group relative flex flex-col justify-center w-[200px] max-w-[200px] py-2 px-4 border-white border-opacity-10 border-r max-sm:flex max-sm:flex-col max-sm:justify-center max-sm:pl-2 max-sm:pr-2 max-sm:py-2 max-sm:border-none max-sm:gap-1",
            props.variant === "modal" &&
              "w-[55%] max-w-[260px] max-sm:max-w-[55%]",
            (props.view === "dash" || props.view === "tab") &&
              "w-full max-w-full"
          )}
        >
          {/*{props.location.type === "shoot" && (*/}
          {/*  <div className="hidden text-zinc-300/50 text-opacity-95 group-hover:text-zinc-300/70 text-xs font-bold sm:block">*/}
          {/*    {`LOCATION ${props.index + 1}`}*/}
          {/*  </div>*/}
          {/*)}*/}

          <div className="relative flex items-center justify-start gap-2 h-[20px]">
            <div className="">
              {getLocationTypeIcon(props.location.type ?? "shoot")}
            </div>

            <div className="font-bold text-sm text-white truncate">
              {capitalizeString(
                props.location.description ?? props.location.type ?? "Location"
              )}
            </div>

            {(props.view === "dash" || props.view === "tab") && (
              <div
                className={cn(
                  "absolute right-0 flex items-center justify-center w-[22px] h-[22px] bg-stone-800 rounded-full",
                  props.location.id === props.selectedLocation?.id &&
                    "bg-green-600 border border-white/80"
                )}
              >
                <div className="text-[12px] text-white">{props.index + 1}</div>
              </div>
            )}
          </div>

          <div
            className={cn(
              "text-white/80 font-bold font-label max-sm:text-xs",
              props.variant !== "modal" && "truncate"
            )}
          >
            {props.location.name && formatLocationName(props.location.name)}
          </div>

          <div
            className={cn(
              "text-white text-opacity-60 text-sm max-sm:text-xs font-normal font-label",
              props.view === "tab" && "max-w-[320px] truncate"
            )}
          >
            {props.location.address}
          </div>

          {(props.view === "tab" || props.view === "dash") && props.setOpen && (
            <div
              className={cn(
                "z-10 absolute bottom-0 right-[6px] hidden items-center justify-center w-7 h-7 cursor-pointer group-hover:block"
              )}
              onClick={(e) => {
                e.stopPropagation();

                props.setSelectedLocation(props.location);

                if (props.setOpen) {
                  props.setOpen(props.location);
                }
              }}
            >
              <Icon
                name="edit"
                className="w-4 h-4 text-white/50 hover:text-white/80"
              />
            </div>
          )}
        </div>

        {props.view !== "dash" && props.view !== "tab" && (
          <div className="w-[45%] min-w-[45%] max-w-[45%] max-sm:border-none max-sm:flex max-sm:items-center">
            {!!mapUrl && (
              <Image
                src={mapUrl}
                width={300}
                height={300}
                className="w-full h-full min-h-[115px] max-sm:min-h-[unset] max-sm:h-[90px] object-cover max-sm:rounded-lg"
                alt={""}
              />
            )}

            {props.variant !== "modal" && (
              <a
                href={`https://www.google.com/maps?daddr=${encodeURI(
                  /* @ts-ignore */
                  props.location.address
                )}`}
                target="_blank"
                className="group/anchor absolute bottom-[6px] right-[6px] flex items-center justify-center w-[32px] h-[32px] rounded-xl border border-white border-opacity-25 bg-stone-950 hover:bg-stone-800"
              >
                <Icon
                  name="arrow-out"
                  className="w-[10px] h-[10px] font-bold text-white/60 group-hover/anchor:text-white/100"
                />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
