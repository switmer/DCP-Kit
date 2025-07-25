import React, { FC, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ViewType } from "@/components/blocks/CallSheet/Locations/ManageLocationsModal";
import { LocationInput } from "@/components/blocks/CallSheet/Locations/LocationInput";
import { Skeleton } from "@/components/ui/Skeleton";
import { capitalizeString, cn } from "@/lib/utils";
import { Label } from "@/components/ui/Label";
import { capitalize } from "lodash";
import { splitAndLowercaseFirst } from "@/components/blocks/CallSheet/Locations/util/splitAndLowercaseFirst";
import { TypeTagSelection } from "@/components/blocks/CallSheet/Locations/TypeTagSelection";
import { getLocationTypeIcon } from "@/components/blocks/CallSheet/Locations/util/getLocationTypeIcon";
import Image from "next/image";

type Props = {
  setView: (view: ViewType) => void;
  setNewLocationName: (newLocationName: string) => void;
  setNewLocationAddress: (newLocationAddress: string) => void;
  newLocationType: string | null;
  setNewLocationType: (newLocationType: string) => void;
  newLocationDescription: string | null;
  setNewLocationDescription: (newLocationDescription: string | null) => void;
  setNewLocationInstructions: (newLocationInstructions: string | null) => void;
};

export const AddLocation: FC<Props> = (props) => {
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [addingInstructions, setAddingInstructions] = useState(false);
  const [userAddressInput, setUserAddressInput] = useState<string>("");
  const [newLocation, setNewLocation] =
    useState<google.maps.places.PlaceResult | null>(null);

  const [locationTypeSuggestions, setLocationTypeSuggestions] = useState<
    string[]
  >([
    "Shoot",
    "Nearest Hospital",
    "Parking",
    "Truck Parking",
    "Production Office",
    "Basecamp",
  ]);
  const [mapUrl, setMapUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const addCustomTag = (type: string) => {
    setLocationTypeSuggestions((prev) => {
      return [...prev, capitalizeString(type)];
    });
    // locationTypeSuggestions.push(capitalizeString(type));
  };

  useEffect(() => {
    if (!newLocation || !newLocation.name || !newLocation.formatted_address) {
      return;
    }

    props.setNewLocationName(newLocation.name);
    props.setNewLocationAddress(newLocation.formatted_address);
  }, [newLocation]);

  useEffect(() => {
    const fetchMapUrl = async () => {
      if (!newLocation?.formatted_address || mapUrl) return;

      setIsLoading(true);

      const address = encodeURIComponent(newLocation.formatted_address);
      const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${process.env.NEXT_PUBLIC_GOOGLE_KEY}`;

      try {
        const response = await fetch(geocodingUrl);
        const data = await response.json();
        const location = data.results[0]?.geometry?.location;

        const lat = location?.lat;
        const lng = location?.lng;

        if (!lat || !lng) return;

        const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x300&markers=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_KEY}&style=feature:all%7Celement:all%7Cinvert_lightness:true`;

        setMapUrl(staticMapUrl);
      } catch (error) {
        console.error("Error fetching map URL:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMapUrl();
  }, [newLocation, mapUrl]);

  return (
    <div className="p-6 flex flex-col gap-4 w-auto h-auto max-w-[500px] max-h-[570px] max-sm:max-w-full max-sm:w-full max-sm:max-h-full max-sm:flex-1">
      <div
        onClick={() => {
          props.setNewLocationName("");
          props.setNewLocationAddress("");
          props.setView("list");
        }}
        className="flex items-center w-[75px] gap-3 cursor-pointer pt-0 pb-1 text-white/80 hover:text-white/100"
      >
        <Icon name="chevron" className="w-4 h-4 rotate-180" />
        <div className="text-lg"> Back</div>
      </div>

      {!newLocation && (
        <Label className={cn("flex flex-col gap-[3px]")}>
          <div className="pb-1 text-sm text-white/70">Address</div>

          <LocationInput
            className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
            placeholder="Search address..."
            value={userAddressInput}
            onChange={(v: string) => {
              if (!v) setUserAddressInput("");
              setUserAddressInput(v);
            }}
            setNewLocation={setNewLocation}
            autoFocus
          />
        </Label>
      )}

      {newLocation && (
        <>
          <Label className={cn("flex flex-col gap-[3px]")}>
            <div className="pb-1 text-sm text-white/70">Type of location</div>

            <TypeTagSelection
              label="Location type"
              value={props.newLocationType ?? "shoot"}
              suggestions={locationTypeSuggestions}
              setNewLocationType={props.setNewLocationType}
              addCustomTagCallback={addCustomTag}
            />
          </Label>

          <Label className={cn("flex flex-col gap-[3px]")}>
            <div className="pb-1 text-sm text-white/70">Description</div>

            <input
              className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
              onChange={(e) => {
                props.setNewLocationDescription(e.target.value);
              }}
              onBlur={(e) => {
                if (!e.target.value || e.target.value === "") {
                  props.setNewLocationDescription(null);
                  e.target.value = props.newLocationType ?? "shoot";
                  return;
                }
              }}
              // placeholder="e.g., placeholder description..."
              value={
                props.newLocationDescription ??
                capitalizeString(
                  props.newLocationType === "shoot" || !props.newLocationType
                    ? "shoot location"
                    : props.newLocationType
                )
              }
            />
          </Label>

          {addingInstructions ? (
            <Label className={cn("flex flex-col gap-[3px]")}>
              <div
                onClick={() => setAddingInstructions(false)}
                className="flex items-center justify-between gap-1"
              >
                <div className="pb-1 text-sm text-white/70">Instructions</div>

                <div className="flex items-center justify-center w-[20px] h-[20px] p-[2px] bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-700 hover:text-white/90">
                  <Icon name="cross" className="w-3 h-3 text-white/50" />
                </div>
              </div>

              <input
                className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
                onChange={(e) =>
                  props.setNewLocationInstructions(e.target.value)
                }
                placeholder="e.g., no parking in the rear..."
              />
            </Label>
          ) : (
            <div
              onClick={() => setAddingInstructions(true)}
              className="flex items-center justify-center w-[150px] h-[25px] pr-1 bg-zinc-900 rounded-2xl cursor-pointer hover:bg-zinc-800/70 hover:text-white/90"
            >
              <Icon name="plus" className="w-5 h-5 text-white/80" />
              <div className="text-sm text-white/70">Add Instructions</div>
            </div>
          )}
        </>
      )}

      {/* preview */}
      <div
        className={cn(
          "flex flex-col gap-1",
          newLocation && "border border-white/10 rounded-2xl"
        )}
      >
        {!newLocation && <div className="text-sm text-white/60">PREVIEW</div>}

        <div className="flex justify-between w-full max-sm:max-w-full">
          <div
            className={cn(
              "flex flex-col gap-[1px] min-w-[180px] max-w-[270px] py-[10px] pl-4 pr-2 max-sm:w-auto max-sm:pl-0 max-sm:min-w-[unset] max-sm:w-[55%]",
              newLocation &&
                "border-r border-white border-opacity-10 max-sm:pl-2"
            )}
          >
            {newLocation && newLocation.name ? (
              <div className="flex items-center justify-start gap-2 h-[20px]">
                {getLocationTypeIcon(props.newLocationType ?? "shoot")}

                <div className="font-bold text-sm text-white max-sm:truncate">
                  {props.newLocationDescription ??
                    capitalizeString(
                      props.newLocationType === "shoot" ||
                        !props.newLocationType
                        ? "shoot location"
                        : props.newLocationType
                    )}
                </div>
              </div>
            ) : (
              <Skeleton className="w-[150px] h-[17px] max-sm:w-[125px]" />
            )}

            {newLocation && newLocation.name ? (
              <div className="font-bold max-sm:text-xs max-sm:truncate">
                {newLocation.name}
              </div>
            ) : (
              <Skeleton className="w-[130px] h-[20px] mt-[6px] max-sm:w-[105px]" />
            )}

            {newLocation && newLocation.formatted_address ? (
              <>
                <div className="text-sm text-white/60 max-sm:text-xs">
                  {newLocation.formatted_address}
                </div>

                {!showLocationInput ? (
                  <div className="flex items-center h-[46px]">
                    <div
                      onClick={() => setShowLocationInput(true)}
                      className="flex items-center justify-center w-[150px] h-[30px] mt-[6px] pr-1 bg-zinc-900 rounded-2xl cursor-pointer hover:bg-zinc-800/70 hover:text-white/90"
                    >
                      <Icon name="plus" className="w-5 h-5 text-white/80" />
                      <div className="text-sm text-white/70">
                        Change Address
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pr-3">
                    <LocationInput
                      className="flex items-center w-full min-w-[242px] h-[40px] mt-[6px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60 max-sm:min-w-[unset] max-sm:w-full"
                      placeholder="Search address..."
                      value={userAddressInput}
                      onChange={(v: string) => {
                        if (!v) {
                          setUserAddressInput("");
                          setMapUrl("");
                        }
                        setUserAddressInput(v);
                      }}
                      setNewLocation={setNewLocation}
                      setShowLocationInput={setShowLocationInput}
                      autoFocus
                    />
                  </div>
                )}
              </>
            ) : (
              <Skeleton className="w-[200px] h-[15px] mt-[6px] max-sm:w-[140px]" />
            )}
          </div>

          {!isLoading && !!mapUrl && newLocation ? (
            <div className="w-[45%]">
              <Image
                src={mapUrl}
                width={300}
                height={300}
                className="w-[200px] h-full min-h-[115px] object-cover rounded-r-2xl"
                alt={""}
              />
            </div>
          ) : (
            <Skeleton className="w-[190px] h-auto max-sm:w-full" />
          )}
        </div>
      </div>
      {/* --- */}
    </div>
  );
};
