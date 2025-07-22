import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/client';
import { CallSheetLocationType, ProjectLocationType } from '@/types/type';
import React, { useState, FC, useEffect } from 'react';
import { updateCallSheetTimestamp } from '@/lib/updateCallSheetTimestamp';
import { LocationItem } from '@/components/blocks/CallSheet/Locations/LocationItem';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { EditLocation } from '@/components/blocks/CallSheet/Locations/EditLocation';
import { AlertDialog } from '@/components/ui/AlertDialog';
import { AddLocation } from '@/components/blocks/CallSheet/Locations/AddLocation';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { getUser } from '@/queries/get-user';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { splitAndLowercaseFirst } from '@/components/blocks/CallSheet/Locations/util/splitAndLowercaseFirst';
import { getGooglePlaceDetailsClientSide } from '@/lib/google-places-api/getGooglePlaceDetailsClientSide';
import { ProjectLocationWithAddress } from '@/components/blocks/ProjectDashboard/ProjectLocations';

type Props = {
  project: string;
  callSheet: string;
  shootLocations: ProjectLocationWithAddress[] | (CallSheetLocationType & { address: string })[];
  parkingLocations: ProjectLocationWithAddress[] | (CallSheetLocationType & { address: string })[];
  hospitalLocations: ProjectLocationWithAddress[] | (CallSheetLocationType & { address: string })[];
  otherLocations: ProjectLocationWithAddress[] | (CallSheetLocationType & { address: string })[];
  selectedLocation: ProjectLocationWithAddress | (CallSheetLocationType & { address: string }) | null;
  open?: ProjectLocationWithAddress | (CallSheetLocationType & { address: string }) | boolean | 'add';
  setOpen: (arg: any) => void;
  onLocationsSaved: () => void;
};

export type ViewType = 'list' | 'edit' | 'add';

export const ManageLocationsModal: FC<Props> = (props) => {
  const [shootLocations, setShootLocations] = useState<
    ProjectLocationWithAddress[] | (CallSheetLocationType & { address: string })[]
  >(props.shootLocations);

  useEffect(() => {
    setShootLocations(props.shootLocations);
  }, [props.shootLocations]);

  const [selectedLocation, setSelectedLocation] = useState<
    ProjectLocationWithAddress | (CallSheetLocationType & { address: string }) | null
  >(props.selectedLocation);

  const [selectedLocationMapUrl, setSelectedLocationMapUrl] = useState<string | null>(null);
  const [view, setView] = useState<ViewType>('list');

  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationAddress, setNewLocationAddress] = useState('');
  const [newLocationType, setNewLocationType] = useState<string | null>(null);
  const [newLocationInstructions, setNewLocationInstructions] = useState<string | null>(null);
  const [newLocationDescription, setNewLocationDescription] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (!selectedLocation) {
      setView('list');
      return;
    }

    setNewLocationType(selectedLocation.type as string);
    setView('edit');
  }, [selectedLocation]);

  useEffect(() => {
    if (props.open === 'add') {
      setView('add');
      return;
    }

    if (typeof props.open === 'object') {
      setView('edit');
      return;
    }

    if (
      !props.shootLocations.length &&
      !props.hospitalLocations.length &&
      !props.parkingLocations.length &&
      !props.otherLocations.length
    ) {
      setView('add');
      return;
    }

    setView('list');
  }, [props.open]);

  const {
    /* @ts-ignore */
    data: { user } = {},
  } = useQuery({ queryKey: ['user'], queryFn: () => getUser(supabase) });

  const handleSave = async () => {
    setIsSaving(true);

    switch (view) {
      case 'add':
        if (!user) {
          toast.error('Something went wrong.');
          return;
        }

        const placesJson = await getGooglePlaceDetailsClientSide(newLocationAddress);

        const { data: locationRes, error: locationResError } = await supabase
          .from('location')
          .insert({
            company: user.id,
            address: newLocationAddress,
            places_json: JSON.stringify(placesJson),
            // name: newLocationName,
            // type: newLocationType
            //   ? splitAndLowercaseFirst(newLocationType)
            //   : "shoot",
            // description: newLocationDescription ?? null,
            // instructions: newLocationInstructions ?? null,
          })
          .select()
          .single();

        if (!locationRes || locationResError) {
          toast.error('Something went wrong adding the location.');

          setIsSaving(false);

          return;
        }

        const { error: projectLocationResError } = await supabase.from('call_sheet_location').insert({
          location: locationRes.id,
          project: props.project,
          call_sheet: props.callSheet,
          name: newLocationName,
          // address: newLocationAddress,
          type: newLocationType ? splitAndLowercaseFirst(newLocationType) : 'shoot',
          description: newLocationDescription ?? null,
          instructions: newLocationInstructions ?? null,
        });

        if (projectLocationResError) {
          toast.error('Something went wrong adding the call sheet location.');

          setIsSaving(false);

          return;
        }

        setIsSaving(false);

        // update the call sheet's updated_at timestamp.
        await updateCallSheetTimestamp(supabase, props.callSheet);

        props.onLocationsSaved();

        setView('list');

        toast.success('Call sheet location successfully added.');

        return;

      case 'list':
        setIsSaving(true);

        await Promise.all(
          shootLocations.map((location, i) => {
            return supabase.from('call_sheet_location').update({ order: i }).eq('id', location.id);
          }),
        );

        setIsSaving(false);

        props.onLocationsSaved();
        props.setOpen(null);

        return;

      case 'edit':
        if (!user) return;
        if (!selectedLocation) return;

        if (newLocationAddress !== null && newLocationAddress !== '') {
          //-- check for a previously existing location record with the newLocationAddress.
          const { data: existingLocation, error: existingLocationError } = await supabase
            .from('location')
            .select()
            .eq('company', user.id)
            .ilike('address', newLocationAddress); //-- ilike() vs. eq() for case-insensitive search.

          if (existingLocationError) {
            toast.error('Something went wrong checking for existing location.');

            return;
          }

          if (existingLocation[0]) {
            //-- if the location exists already, only update the call_sheet_location record.
            const { error: updateLocationError } = await supabase
              .from('call_sheet_location')
              .update({
                //-- if newLocationName exists, spread an object with the new key:value, otherwise spread an empty object.
                ...(newLocationName !== '' ? { name: newLocationName } : {}),
                ...(newLocationType !== selectedLocation.type ? { type: newLocationType } : {}),
                ...(newLocationInstructions === null ? {} : { instructions: newLocationInstructions }),
                //-- save the newLocationDescription first, then re-save the original description second.
                //-- if neither exist, default to saving the newLocationType.
                ...(newLocationDescription
                  ? { description: newLocationDescription }
                  : selectedLocation.description
                    ? { description: selectedLocation.description }
                    : { description: newLocationType }),
              })
              .eq('location', existingLocation[0].id);

            if (updateLocationError) {
              toast.error('Something went wrong updating the location.');

              setIsSaving(false);
              setView('list');

              return;
            }
          } else {
            //-- if an existing location does _not_ exist, i.e. user has 'edited' a _new_ address...

            //-- ...then get detailed information from google places...
            const placesJson = await getGooglePlaceDetailsClientSide(newLocationAddress);

            //-- ...then create the new location record...
            const { data: newLocation, error: newLocationError } = await supabase
              .from('location')
              .insert({
                company: user.id,
                address: newLocationAddress,
                places_json: JSON.stringify(placesJson),
              })
              .select();

            if (!newLocation || newLocationError) {
              toast.error('Something went wrong creating new location record. Please try again.');

              setIsSaving(false);
              setView('list');

              return;
            }

            //-- ...then create new call_sheet_location relation.
            const { data: newCallSheetLocation, error: newCallSheetLocationError } = await supabase
              .from('call_sheet_location')
              .insert({
                location: newLocation[0].id,
                project: props.project,
                call_sheet: props.callSheet,
                name: newLocationName,
                // address: newLocationAddress,
                type: newLocationType ? splitAndLowercaseFirst(newLocationType) : 'shoot',
                description: newLocationDescription ?? null,
                instructions: newLocationInstructions ?? null,
              })
              .select();

            if (newCallSheetLocationError) {
              toast.error('Something went wrong creating new call sheet location record.');

              setIsSaving(false);
              setView('list');

              return;
            }

            // update the call sheet's updated_at timestamp.
            await updateCallSheetTimestamp(supabase, props.callSheet);
          }
        } else {
          //-- if the address hasn't changed, then only update the call_sheet_location record.
          const { error: updateLocationError } = await supabase
            .from('call_sheet_location')
            .update({
              //-- if newLocationName exists, spread an object with the new key:value, otherwise spread an empty object.
              ...(newLocationName !== '' ? { name: newLocationName } : {}),
              ...(newLocationType !== selectedLocation.type ? { type: newLocationType } : {}),
              ...(newLocationInstructions === null ? {} : { instructions: newLocationInstructions }),
              //-- save the newLocationDescription first, then re-save the original description second.
              //-- if neither exist, default to saving the newLocationType.
              ...(newLocationDescription
                ? { description: newLocationDescription }
                : selectedLocation.description
                  ? { description: selectedLocation.description }
                  : { description: newLocationType }),
            })
            .eq('id', selectedLocation.id);

          if (updateLocationError) {
            toast.error('Something went wrong updating the location.');

            setIsSaving(false);
            setView('list');

            return;
          }

          // update the call sheet's updated_at timestamp.
          await updateCallSheetTimestamp(supabase, props.callSheet);
        }

        setIsSaving(false);

        props.onLocationsSaved();

        //-- reset newLocation information.
        setNewLocationName('');
        setNewLocationAddress('');
        setNewLocationInstructions(null);
        setNewLocationDescription(null);
        setNewLocationType('shoot');

        //-- deselect location.
        setSelectedLocation(null);

        setView('list');

        toast.success('Project location successfully updated.');

        return;
    }
  };

  const deleteLocation = async (
    location: ProjectLocationWithAddress | (CallSheetLocationType & { address: string }),
  ) => {
    if (!location) return;

    setIsDeleting(true);

    const { error: locationDeleteError } = await supabase
      .from('call_sheet_location')
      .delete()
      .eq('id', location.id)
      .select();

    if (locationDeleteError) {
      console.error('Error: ', locationDeleteError);
      toast.error('Something went wrong deleting the location.');

      setIsDeleting(false);

      return;
    }

    // update the call sheet's updated_at timestamp.
    await updateCallSheetTimestamp(supabase, props.callSheet);

    setIsDeleting(false);

    props.onLocationsSaved();

    setView('list');

    toast.success('Location successfully deleted.');

    return;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 0.01,
      },
    }),
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      setShootLocations((prev) => {
        const oldIndex = prev.findIndex((el) => el.id === active.id);
        const newIndex = prev.findIndex((el) => el.id === over.id);

        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }

  return (
    <Dialog
      defaultOpen={!!open}
      open={!!open}
      onOpenChange={(o) => {
        // if (!o) {
        //   onClose(notes?.filter((n) => n.id > 0));
        // }
      }}
    >
      <DialogContent className="flex flex-col max-w-[520px] h-auto max-h-[850px] gap-0 max-sm:max-w-full max-sm:w-full max-sm:max-h-[100vh] max-sm:h-[100vh]">
        <DialogHeader className="max-sm:max-h-[75px]">
          <div className="flex justify-between items-center">
            <DialogTitle>
              <div className="flex items center gap-2 items-center">
                {view === 'list' ? 'Manage locations' : view === 'edit' ? 'Edit location' : 'Add location'}
              </div>
            </DialogTitle>

            <button
              onClick={() => props.setOpen?.(null)}
              className="w-10 h-10 flex justify-center items-center rounded-[10px] bg-zinc-900 bg-opacity-80 hover:bg-opacity-100 duration-100"
            >
              <Icon name="cross" className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </DialogHeader>

        {view === 'add' && (
          <AddLocation
            setView={setView}
            setNewLocationName={setNewLocationName}
            setNewLocationAddress={setNewLocationAddress}
            newLocationType={newLocationType}
            setNewLocationType={setNewLocationType}
            newLocationDescription={newLocationDescription}
            setNewLocationDescription={setNewLocationDescription}
            setNewLocationInstructions={setNewLocationInstructions}
          />
        )}

        {view === 'list' && (
          <div className="p-6 flex flex-col gap-4 w-auto h-auto max-w-[500px] max-h-[570px] max-sm:max-w-full max-sm:w-full max-sm:max-h-full max-sm:flex-1 overflow-hidden">
            <div className="flex-1 flex flex-col gap-2 w-full h-full overflow-y-scroll hide-scrollbars">
              <div className="flex flex-col gap-2 pb-4">
                {shootLocations.length > 0 && (
                  <DndContext
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={handleDragEnd}
                    sensors={sensors}
                  >
                    <div className="flex items-center justify-between gap-2 pb-2 font-medium">
                      <div className="flex items-center gap-3">
                        <Icon name="shoot" className="relative left-[0px] w-6 h-6 stroke-1 stroke-lime-300" />

                        <div className="text-white text-opacity-95 text-[19px] font-bold">Shoot Locations</div>
                      </div>

                      <div
                        onClick={() => setView('add')}
                        className="group flex items-center justify-center w-[20px] h-[20px] rounded-full border border-zinc-600 cursor-pointer hover:border-zinc-500"
                      >
                        <Icon
                          name="plus"
                          className="relative left-[0px] w-5 h-5 text-zinc-400 group-hover:text-zinc-300"
                        />
                      </div>
                    </div>

                    <SortableContext items={shootLocations} strategy={verticalListSortingStrategy}>
                      {shootLocations.map(
                        (location: ProjectLocationWithAddress | (CallSheetLocationType & { address: string }), i) => {
                          if (!location.address) return null;

                          return (
                            <>
                              {(location.type?.toLowerCase().trim() === 'shoot location' ||
                                location.type?.toLowerCase().trim() === 'shoot') && (
                                <LocationItem
                                  variant="modal"
                                  key={location.address + location.id}
                                  location={location}
                                  index={i}
                                  setSelectedLocation={setSelectedLocation}
                                  setSelectedLocationMapUrl={setSelectedLocationMapUrl}
                                />
                              )}
                            </>
                          );
                        },
                      )}
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              {props.parkingLocations.length > 0 && (
                <div className="flex flex-col gap-2 pb-4">
                  <div className="flex items-center justify-between gap-2 pb-2 font-medium">
                    <div className="flex items-center gap-3">
                      <Icon name="parking" className="relative left-[0px] w-6 h-6" />

                      <div className="text-white text-opacity-95 text-[19px] font-bold">Parking Locations</div>
                    </div>

                    <div
                      onClick={() => setView('add')}
                      className="group flex items-center justify-center w-[20px] h-[20px] rounded-full border border-zinc-600 cursor-pointer hover:border-zinc-500"
                    >
                      <Icon
                        name="plus"
                        className="relative left-[0px] w-5 h-5 text-zinc-400 group-hover:text-zinc-300"
                      />
                    </div>
                  </div>

                  {props.parkingLocations.map(
                    (location: ProjectLocationWithAddress | (CallSheetLocationType & { address: string }), i) => {
                      if (!location.address) return null;

                      return (
                        <>
                          {(location.type?.toLowerCase().trim() === 'parking' ||
                            location.type?.toLowerCase().trim() === 'truck parking') && (
                            <LocationItem
                              variant="modal"
                              key={location.address + location.id}
                              location={location}
                              index={i}
                              setSelectedLocation={setSelectedLocation}
                              setSelectedLocationMapUrl={setSelectedLocationMapUrl}
                            />
                          )}
                        </>
                      );
                    },
                  )}
                </div>
              )}

              {props.hospitalLocations.length > 0 && (
                <div className="flex flex-col gap-2 pb-4">
                  <div className="flex items-center justify-between gap-2 pb-2 font-medium">
                    <div className="flex items-center gap-3">
                      <Icon name="hospital" className="relative left-[0px] w-6 h-6" />

                      <div className="text-white text-opacity-95 text-[19px] font-bold">Nearest Hospital</div>
                    </div>

                    <div
                      onClick={() => setView('add')}
                      className="group flex items-center justify-center w-[20px] h-[20px] rounded-full border border-zinc-600 cursor-pointer hover:border-zinc-500"
                    >
                      <Icon
                        name="plus"
                        className="relative left-[0px] w-5 h-5 text-zinc-400 group-hover:text-zinc-300"
                      />
                    </div>
                  </div>

                  {props.hospitalLocations.map(
                    (location: ProjectLocationWithAddress | (CallSheetLocationType & { address: string }), i) => {
                      if (!location.address) return null;

                      return (
                        <>
                          {(location.type?.toLowerCase().trim() === 'hospital' ||
                            location.type?.toLowerCase().trim() === 'nearest hospital') && (
                            <LocationItem
                              variant="modal"
                              key={location.address + location.id}
                              location={location}
                              index={i}
                              setSelectedLocation={setSelectedLocation}
                              setSelectedLocationMapUrl={setSelectedLocationMapUrl}
                            />
                          )}
                        </>
                      );
                    },
                  )}
                </div>
              )}

              {props.otherLocations.length > 0 && (
                <div className="flex flex-col gap-2 pb-4">
                  <div className="flex items-center justify-between gap-2 pb-2 font-medium">
                    <div className="flex items-center gap-3">
                      <Icon name="pin" className="relative left-[0px] w-6 h-6 text-lime-300" />

                      <div className="text-white text-opacity-95 text-[19px] font-bold">Other Locations</div>
                    </div>

                    <div
                      onClick={() => setView('add')}
                      className="group flex items-center justify-center w-[20px] h-[20px] rounded-full border border-zinc-600 cursor-pointer hover:border-zinc-500"
                    >
                      <Icon
                        name="plus"
                        className="relative left-[0px] w-5 h-5 text-zinc-400 group-hover:text-zinc-300"
                      />
                    </div>
                  </div>

                  {props.otherLocations.map(
                    (location: ProjectLocationWithAddress | (CallSheetLocationType & { address: string }), i) => {
                      if (!location.address) return null;
                      // if (location.type !== "hospital") return null;

                      return (
                        <LocationItem
                          variant="modal"
                          key={location.address + location.id}
                          location={location}
                          index={i}
                          setSelectedLocation={setSelectedLocation}
                          setSelectedLocationMapUrl={setSelectedLocationMapUrl}
                        />
                      );
                    },
                  )}
                </div>
              )}

              <div
                onClick={() => setView('add')}
                className="group flex items-center justify-center gap-2 w-[150px] min-h-[50px] rounded-xl border border-zinc-700 cursor-pointer hover:bg-white/5"
              >
                <Icon
                  name="plus"
                  className="w-5 h-5 text-white text-opacity-70 duration-150 group-hover:text-opacity-90"
                />
                <div className="text-white/70 group-hover:text-white/90">Add Location</div>
              </div>
            </div>
          </div>
        )}

        {view === 'edit' && (
          <>
            {selectedLocation && (
              <EditLocation
                location={selectedLocation}
                mapUrl={selectedLocationMapUrl}
                setSelectedLocation={setSelectedLocation}
                newLocationName={newLocationName}
                setNewLocationName={setNewLocationName}
                newLocationAddress={newLocationAddress}
                setNewLocationAddress={setNewLocationAddress}
                newLocationType={newLocationType}
                setNewLocationType={setNewLocationType}
                newLocationInstructions={newLocationInstructions}
                setNewLocationInstructions={setNewLocationInstructions}
                newLocationDescription={newLocationDescription}
                setNewLocationDescription={setNewLocationDescription}
              />
            )}
          </>
        )}

        {/*<div className="p-6 flex gap-6 max-w-[634px]">*/}
        {/*  <div className="flex flex-col gap-3 w-full max-h-[430px] overflow-y-auto">*/}
        {/*    {props.locations.map((location, i) => {*/}
        {/*      if (!location.address) return null;*/}

        {/*      return (*/}
        {/*        <LocationItem*/}
        {/*          key={location.address + location.id}*/}
        {/*          location={location}*/}
        {/*          index={i}*/}
        {/*        />*/}
        {/*      );*/}
        {/*    })}*/}
        {/*  </div>*/}
        {/*</div>*/}

        <DialogFooter className="flex items-center !justify-between h-full w-full p-3 max-sm:flex-row max-sm:h-[75px]">
          <div className="">
            {view === 'edit' && (
              <AlertDialog
                onConfirm={async () => {
                  if (selectedLocation) {
                    await deleteLocation(selectedLocation);
                  }
                }}
                onCancel={() => {}}
                title="Delete this location?"
                description="This will permanently remove this location and cannot be undone."
                isDelete
              >
                <Button
                  className="px-3 w-[100px] !gap-1 bg-white bg-opacity-0 disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed hover:bg-opacity-[.03]"
                  variant="outline"
                  size="compact"
                  // disabled={isSaving}
                  // onClick={() => deleteSelectedContact(selectedContactId)}
                >
                  <Icon name="bin" className="w-[17px] h-[17px] text-red-400" />
                  <div className="text-sm font-semibold">Remove</div>
                </Button>
              </AlertDialog>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              className="px-4 text-sm font-semibold bg-white bg-opacity-0 hover:bg-opacity-[.03]"
              variant="outline"
              size="compact"
              onClick={() => props.setOpen?.(null)}
            >
              Cancel
            </Button>

            <Button
              className="px-4 min-w-[65px] text-sm font-semibold disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed"
              variant="accent"
              size="compact"
              onClick={handleSave}
              disabled={(view === 'add' && !newLocationAddress) || isSaving || isDeleting}
            >
              {isSaving && <LoadingIndicator size="small" />}

              {!isSaving && <>{view === 'add' ? 'Add location' : view === 'edit' ? 'Save changes' : 'Done'}</>}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
