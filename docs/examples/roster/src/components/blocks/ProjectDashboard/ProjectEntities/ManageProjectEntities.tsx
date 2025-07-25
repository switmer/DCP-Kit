import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/client';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
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
import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CompanyEntityType, EntityPointOfContactType } from '@/types/type';
import {
  CreateNewProjectEntity,
  EntityTypeType,
  NewEntityInfo,
  NewPointOfContactInfo,
} from '@/components/blocks/ProjectDashboard/ProjectEntities/CreateNewProjectEntity';
import { toast } from 'sonner';
import { EntityListItem } from '@/components/blocks/ProjectDashboard/ProjectEntities/EntityListItem';
import { capitalizeString, cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { EditProjectEntity } from '@/components/blocks/ProjectDashboard/ProjectEntities/EditProjectEntity';
import { uploadLogoToSupabase } from '@/components/blocks/ProjectDashboard/ProjectEntities/logo-uploading/uploadLogoToSupabase';
import { AlertDialog } from '@/components/ui/AlertDialog';

type Props = {
  userId: string;
  projectId: string;
  companyEntities: CompanyEntityType[];
  projectEntities: CompanyEntityType[];
  productionEntitiesEmpty: boolean;
  pointsOfContact: EntityPointOfContactType[];
  initiallyViewing: 'new' | CompanyEntityType['id'];
  initialType: EntityTypeType;
  onCancel: () => void;
  onSave: () => void;
};

export const ManageProjectEntities: FC<Props> = (props) => {
  const [selectedEntityId, setSelectedEntityId] = useState<string | 'new' | ''>(props.initiallyViewing);

  const view = useMemo(
    () => (selectedEntityId === 'new' ? 'create' : selectedEntityId === '' ? 'list' : 'edit'),
    [selectedEntityId],
  );

  const [projectEntities, setProjectEntities] = useState<CompanyEntityType[]>(props.projectEntities);

  const selectedEntity = useMemo(
    () => props.projectEntities.find((el) => el.id === selectedEntityId),
    [props.projectEntities, selectedEntityId],
  );

  const [tempLogoFile, setTempLogoFile] = useState<File | null>(null);
  const [tempLogoPreviewUrl, setTempLogoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedEntity) return;

    setNewEntityInfo((p) => {
      return {
        id: selectedEntity.id ?? p.id ?? '',
        name: selectedEntity.name ?? p.name ?? '',
        phone: selectedEntity.phone ?? p.phone ?? '',
        email: selectedEntity.email ?? p.email ?? '',
        website: selectedEntity.website ?? p.website ?? '',
        address: selectedEntity.address ?? p.address ?? '',
        type: selectedEntity.type ?? p.type ?? props.initialType,
        subtype: selectedEntity.subtype ?? p.subtype ?? '',
        logo: selectedEntity.logo ?? p.logo ?? '',
      };
    });
  }, [selectedEntity]);

  const [typeSuggestions, setTypeSuggestions] = useState(['Production Company', 'Agency', 'Client']);

  const [newEntityInfo, setNewEntityInfo] = useState<NewEntityInfo>({
    id: undefined,
    name: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    type: props.initialType,
    subtype: '',
    logo: '',
  });

  const [newPointOfContactInfo, setNewPointOfContactInfo] = useState<NewPointOfContactInfo>({
    name: '',
    phone: '',
    email: '',
    avatar: '',
  });

  const newEntityInfoRef = useRef<NewEntityInfo>(newEntityInfo);

  useEffect(() => {
    newEntityInfoRef.current = newEntityInfo;
  }, [newEntityInfo]);

  const [refreshKey, setRefreshKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const supabase = createClient();

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
      setProjectEntities((prev) => {
        const oldIndex = prev.findIndex((el) => el.id === active.id);
        const newIndex = prev.findIndex((el) => el.id === over.id);

        const updatedEntities = arrayMove(prev, oldIndex, newIndex);

        const updatedOrders = updatedEntities.map((entity, index) => ({
          id: entity.id,
          order: index,
        }));

        supabase
          .from('project_entity')
          .upsert(updatedOrders, { onConflict: 'id' })
          .then(({ error }) => {
            if (error) {
              console.error('Error updating order:', error);
            }
          });

        return updatedEntities;
      });
    }
  }

  const addCustomTagCallback = (type: string) => {
    setTypeSuggestions((prev) => {
      return [...prev, capitalizeString(type)];
    });
  };

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    const currentNewEntityInfo = newEntityInfoRef.current;
    const isEditing = Boolean(currentNewEntityInfo.id !== undefined);

    //-- capture the current file state to ensure it doesn't get lost
    const currentLogoFile = tempLogoFile;

    //-- validation.
    const requiredFieldsErrors = [];

    if (!currentNewEntityInfo.name) {
      requiredFieldsErrors.push('company name');
    }

    if (!currentNewEntityInfo.type) {
      requiredFieldsErrors.push('type');
    }

    if (requiredFieldsErrors.length > 0) {
      toast.error(`Please provide the following required fields: ${requiredFieldsErrors.join(', ')}`);
      setIsSaving(false);
      return;
    }

    //-- validate point of contact if any fields are filled.
    if (newPointOfContactInfo.name && !newPointOfContactInfo.phone && !newPointOfContactInfo.email) {
      toast.error('Please provide either a phone number or email when adding a point of contact.');
      setIsSaving(false);
      return;
    }

    try {
      //-- create or update the company entity.
      const updateData = {
        id: undefined,
        company: props.userId,
        project: props.projectId,
        name: currentNewEntityInfo.name,
        phone: currentNewEntityInfo.phone,
        website: currentNewEntityInfo.website,
        email: currentNewEntityInfo.email,
        address: currentNewEntityInfo.address,
        type: currentNewEntityInfo.type,
        subtype: currentNewEntityInfo.subtype,
      };

      //-- if we're editing, add the id to the update data.
      if (isEditing) {
        // @ts-ignore
        updateData.id = currentNewEntityInfo.id;
      }

      //-- don't create a company_entity record if we're editing...
      if (!isEditing) {
        //-- check for existing company_entity record with the same core information...
        const { data: existingCompanyData, error: existingCompanyError } = await supabase
          .from('company_entity')
          .select('id, name')
          .match({
            company: props.userId,
            name: currentNewEntityInfo.name,
            type: currentNewEntityInfo.type,
          })
          .maybeSingle();

        if (existingCompanyError) {
          throw new Error(existingCompanyError.message) || 'Failed to check for existing company entity.';
        }

        //-- ...and only create a new company_entity record if no match is found.
        if (!existingCompanyData) {
          const { data: newCompanyEntity, error: companyEntityError } = await supabase
            .from('company_entity')
            .insert({
              ...updateData,
              project: null,
            })
            .select()
            .single();

          if (companyEntityError || !newCompanyEntity) {
            throw new Error(companyEntityError?.message || 'Failed to save company entity.');
          }
        }
      }

      //-- upsert the project_entity record.
      const { data: entityData, error: entityError } = await supabase
        .from('project_entity')
        .upsert(updateData)
        .select()
        .single();

      if (entityError || !entityData) {
        throw new Error(entityError?.message || 'Failed to save entity');
      }

      //-- handle point of contact
      if (newPointOfContactInfo.name && (newPointOfContactInfo.phone || newPointOfContactInfo.email)) {
        if (isEditing) {
          //-- first delete existing point of contact.
          await supabase.from('entity_point_of_contact').delete().eq('project_entity', entityData.id);
        }

        //-- then insert new point of contact.
        const { error: pocError } = await supabase.from('entity_point_of_contact').insert({
          project_entity: entityData.id,
          project: props.projectId,
          name: newPointOfContactInfo.name,
          phone: newPointOfContactInfo.phone,
          email: newPointOfContactInfo.email,
          avatar: newPointOfContactInfo.avatar,
        });

        if (pocError) {
          throw new Error(pocError.message);
        }
      }

      //-- handle logo uploading.
      if (tempLogoFile) {
        const logoSignedUrl = await uploadLogoToSupabase({
          supabase,
          entityId: entityData.id,
          tempLogoFile: currentLogoFile,
          setIsLoading: setIsSaving,
          tempLogoPreviewUrl,
          setTempLogoPreviewUrl,
        });

        if (!logoSignedUrl) {
          toast.error('Something went wrong when uploading the entity logo.');
        }

        //-- update the record with the new logo signed url.
        const { error: entityUpdateError } = await supabase.from('project_entity').upsert({
          id: entityData.id,
          logo: logoSignedUrl,
        });
      }

      toast.success(`Entity ${isEditing ? 'updated' : 'created'} successfully.`);

      props.onSave();
    } catch (error) {
      console.error('Error saving entity:', error);
      toast.error(`Something went wrong ${isEditing ? 'updating' : 'creating'} the entity. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  }, [newEntityInfoRef, newPointOfContactInfo, props.userId, props.projectId, tempLogoFile, tempLogoPreviewUrl]);

  const deleteSelectedEntity = useCallback(
    async (entityId: string) => {
      if (!entityId) return;

      setIsSaving(true);

      const { error } = await supabase.from('project_entity').delete().eq('id', entityId);

      if (error) {
        console.error('Error: ', error);
        toast.error('Something went wrong deleting the company entity. Please try again.');

        setIsSaving(false);

        return;
      }

      toast.success('Project entity successfully removed.');

      props.onSave();
      setIsSaving(false);
    },
    [projectEntities],
  );

  return (
    <Dialog defaultOpen={true} open={true}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        className={cn('max-w-[680px] h-[auto] gap-0 max-sm:w-full max-sm:h-full', view === 'list' && 'max-w-[420px]')}
      >
        <DialogHeader className="flex items-between justify-center py-3 px-5 w-full h-full">
          <div className="flex justify-between items-center">
            <DialogTitle>
              <div className="flex items-center gap-2">
                {view === 'list' && selectedEntityId === '' && 'Manage project entities'}
                {view === 'create' && `Add new ${newEntityInfo.type.toLowerCase() ?? 'entity'}`}
                {view === 'edit' && selectedEntityId !== 'new' && selectedEntityId !== '' && 'Editing project entity'}
              </div>
            </DialogTitle>

            <button
              onClick={props.onCancel}
              className="w-10 h-10 flex justify-center items-center rounded-[10px] bg-zinc-900 bg-opacity-80 hover:bg-opacity-100 duration-100"
            >
              <Icon name="cross" className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </DialogHeader>

        {view === 'edit' && selectedEntity && (
          <EditProjectEntity
            selectedEntity={selectedEntity}
            pointOfContact={
              props.pointsOfContact.filter((poc) => poc.project_entity === selectedEntity.id)[0] ??
              newPointOfContactInfo
            }
            companyEntities={props.companyEntities}
            projectEntities={projectEntities ?? []}
            onCancel={() => {
              setSelectedEntityId('');

              setNewEntityInfo({
                id: undefined,
                name: '',
                phone: '',
                email: '',
                website: '',
                address: '',
                type: props.productionEntitiesEmpty ? 'Production Company' : 'Agency',
                subtype: '',
                logo: '',
              });

              setNewPointOfContactInfo({
                name: '',
                phone: '',
                email: '',
                avatar: '',
              });
            }}
            newEntityInfo={newEntityInfo}
            setNewEntityInfo={setNewEntityInfo}
            newPointOfContactInfo={newPointOfContactInfo}
            setNewPointOfContactInfo={setNewPointOfContactInfo}
            noEntities={projectEntities.length >= 1}
            typeSuggestions={typeSuggestions}
            addCustomTagCallback={addCustomTagCallback}
            setRefreshKey={setRefreshKey}
            setTempLogoFile={setTempLogoFile}
            tempLogoPreviewUrl={tempLogoPreviewUrl}
            setTempLogoPreviewUrl={setTempLogoPreviewUrl}
          />
        )}

        {/* list management view */}
        {view === 'list' && (
          <div className="p-6 flex flex-col gap-6 max-w-[420px] h-[600px] overflow-hidden">
            <div className="flex-1 flex flex-col gap-[3px] w-full h-full overflow-y-scroll hide-scrollbars">
              <DndContext
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={handleDragEnd}
                sensors={sensors}
              >
                {projectEntities.length > 0 && (
                  <SortableContext items={projectEntities} strategy={verticalListSortingStrategy}>
                    {projectEntities
                      .filter((entity) => entity.type?.toLowerCase() !== 'vendor')
                      .map((entity) => {
                        return (
                          <EntityListItem
                            key={entity.id}
                            entity={entity}
                            pointOfContact={
                              props.pointsOfContact.filter((poc) => poc.project_entity === entity.id)[0] ??
                              newPointOfContactInfo
                            }
                            selected={!!selectedEntity}
                            onSetSelected={setSelectedEntityId}
                            deleteSelectedEntity={deleteSelectedEntity}
                          />
                        );
                      })}
                  </SortableContext>
                )}
              </DndContext>

              <div
                onClick={() => setSelectedEntityId('new')}
                className="sticky bottom-0 group flex items-center justify-center w-full min-h-[30px] rounded-2xl bg-stone-800 cursor-pointer hover:bg-stone-850"
              >
                <Icon
                  name="plus"
                  className="w-5 h-5 text-white text-opacity-60 duration-150 group-hover:text-opacity-80"
                />
              </div>
            </div>
          </div>
        )}

        {view === 'create' && (
          <CreateNewProjectEntity
            companyEntities={props.companyEntities}
            projectEntities={projectEntities ?? []}
            onCancel={() => {
              setSelectedEntityId('');

              setNewEntityInfo({
                id: undefined,
                name: '',
                phone: '',
                email: '',
                website: '',
                address: '',
                type: props.productionEntitiesEmpty ? 'Production Company' : 'Agency',
                subtype: '',
                logo: '',
              });

              setNewPointOfContactInfo({
                name: '',
                phone: '',
                email: '',
                avatar: '',
              });
            }}
            newEntityInfo={newEntityInfo}
            setNewEntityInfo={setNewEntityInfo}
            newPointOfContactInfo={newPointOfContactInfo}
            setNewPointOfContactInfo={setNewPointOfContactInfo}
            noEntities={projectEntities.length >= 1}
            typeSuggestions={typeSuggestions}
            addCustomTagCallback={addCustomTagCallback}
            setRefreshKey={setRefreshKey}
            tempLogoPreviewUrl={tempLogoPreviewUrl}
            setTempLogoFile={setTempLogoFile}
            setTempLogoPreviewUrl={setTempLogoPreviewUrl}
          />
        )}

        <DialogFooter className="flex items-center !justify-between h-full w-full p-3 max-sm:flex-row">
          <div className="">
            {view === 'edit' && (
              <AlertDialog
                withPortal
                onConfirm={async () => {
                  if (!selectedEntity) return;

                  deleteSelectedEntity(selectedEntity.id);
                }}
                isDelete
                title={`Delete entity?`}
                description={`This will remove this ${selectedEntity?.type ?? 'entity'} from the project.`}
              >
                <Button
                  className="px-3 w-[100px] !gap-1 bg-white bg-opacity-0 disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed hover:bg-opacity-[.03]"
                  variant="outline"
                  size="compact"
                  disabled={isSaving}
                  // onClick={() => {
                  //   selectedEntity && deleteSelectedEntity(selectedEntity.id);
                  // }}
                >
                  <Icon name="bin" className="w-[17px] h-[17px] text-red-400" />
                  <div className="text-sm font-semibold">Remove</div>
                </Button>
              </AlertDialog>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              className="px-4 text-sm font-semibold bg-white bg-opacity-0 hover:bg-opacity-[.03]"
              variant="outline"
              size="compact"
              onClick={props.onCancel}
            >
              Cancel
            </Button>

            <Button
              className="px-4 min-w-[125px] text-sm font-semibold disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed"
              variant="accent"
              size="compact"
              disabled={isSaving}
              onClick={view === 'create' || view === 'edit' ? handleSave : props.onSave}
            >
              {view === 'create'
                ? `Add ${newEntityInfo.type.toLowerCase() ?? 'entity'}`
                : view === 'edit'
                  ? 'Save changes'
                  : 'Done'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
