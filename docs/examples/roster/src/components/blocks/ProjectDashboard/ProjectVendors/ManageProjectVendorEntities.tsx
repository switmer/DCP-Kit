import { Button } from '@/components/ui/Button';
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
import { ProductionContactCrew } from '../../CallSheet/ProductionContacts';
import { CallSheetMemberType, CompanyEntityType } from '@/types/type';
import { NewProductionContactInfo } from '@/components/blocks/CallSheet/ProductionContacts/CreateNewProductionContact';
import { digitsOnly } from '@/lib/string/digitsOnly';
import { formatPhoneNumber } from 'react-phone-number-input/min';
import { EditProjectCrew } from '@/components/blocks/ProjectDashboard/ProjectCrew/EditProjectCrew';
import { ProjectCrewItem } from '@/components/blocks/ProjectDashboard/ProjectCrew/ProjectCrewItem';
import { CreateNewProjectCrew } from '@/components/blocks/ProjectDashboard/ProjectCrew/CreateNewProjectCrew';
import { CreateNewProjectVendor } from '@/components/blocks/ProjectDashboard/ProjectVendors/CreateNewProjectVendor';
import { NewEntityInfo } from '@/components/blocks/ProjectDashboard/ProjectEntities/CreateNewProjectEntity';
import { EntityListItem } from '@/components/blocks/ProjectDashboard/ProjectEntities/EntityListItem';
import { toast } from 'sonner';
import { EditProjectVendor } from '@/components/blocks/ProjectDashboard/ProjectVendors/EditProjectVendor';
import { del } from '@vercel/blob';
import { AlertDialog } from '@/components/ui/AlertDialog';
import { uploadLogoToSupabase } from '@/components/blocks/ProjectDashboard/ProjectEntities/logo-uploading/uploadLogoToSupabase';

type Props = {
  userId: string;
  projectId: string;
  companyVendors: CompanyEntityType[];
  projectVendors: CompanyEntityType[];
  initiallyViewing: 'new' | CompanyEntityType['id'];
  initialSubtype: string | null;
  onCancel: () => void;
  onSave: () => void;
};

export const ManageProjectVendorEntities: FC<Props> = (props) => {
  const [selectedVendorId, setSelectedVendorId] = useState<string | 'new' | ''>(props.initiallyViewing);
  const [projectVendors, setProjectVendors] = useState<CompanyEntityType[]>(props.projectVendors);

  const [tempLogoFile, setTempLogoFile] = useState<File | null>(null);
  const [tempLogoPreviewUrl, setTempLogoPreviewUrl] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const supabase = createClient();

  const view = useMemo(
    () => (selectedVendorId === 'new' ? 'create' : selectedVendorId === '' ? 'list' : 'edit'),
    [selectedVendorId],
  );

  const selectedVendor = useMemo(
    () => props.projectVendors.find((el) => el.id === selectedVendorId),
    [props.projectVendors, selectedVendorId],
  );

  useEffect(() => {
    if (!selectedVendor) return;

    setNewVendorInfo((p) => {
      return {
        id: selectedVendor.id ?? p.id ?? '',
        name: selectedVendor.name ?? p.name ?? '',
        phone: selectedVendor.phone ?? p.phone ?? '',
        email: selectedVendor.email ?? p.email ?? '',
        website: selectedVendor.website ?? p.website ?? '',
        address: selectedVendor.address ?? p.address ?? '',
        type: 'Vendor',
        subtype: selectedVendor.subtype ?? p.subtype ?? '',
        logo: selectedVendor.logo ?? p.logo ?? '',
      };
    });
  }, [selectedVendor]);

  const [newVendorInfo, setNewVendorInfo] = useState<NewEntityInfo>({
    id: undefined,
    name: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    type: 'Vendor',
    subtype: props.initialSubtype ?? '',
    logo: '',
  });

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      setProjectVendors((prev) => {
        const oldIndex = prev.findIndex((el) => el.id === active.id);
        const newIndex = prev.findIndex((el) => el.id === over.id);

        const updatedVendors = arrayMove(prev, oldIndex, newIndex);

        const updatedOrders = updatedVendors.map((vendor, index) => ({
          id: vendor.id,
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

        return updatedVendors;
      });
    }
  }

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

  const newVendorInfoRef = useRef<NewEntityInfo>(newVendorInfo);

  useEffect(() => {
    newVendorInfoRef.current = newVendorInfo;
  }, [newVendorInfo]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    const currentNewVendorInfo = newVendorInfoRef.current;
    const isEditing = Boolean(currentNewVendorInfo.id !== undefined);

    //-- capture the current file state to ensure it doesn't get lost
    const currentLogoFile = tempLogoFile;

    //-- validation.
    const requiredFieldsErrors = [];

    if (!currentNewVendorInfo.name) {
      requiredFieldsErrors.push('company name');
    }

    if (!currentNewVendorInfo.phone && !currentNewVendorInfo.email) {
      requiredFieldsErrors.push('phone/email');
    }

    if (requiredFieldsErrors.length > 0) {
      toast.error(`Please provide the following required fields: ${requiredFieldsErrors.join(', ')}`);
      setIsSaving(false);

      return;
    }

    try {
      //-- create or update the company entity.
      const updateData = {
        id: undefined,
        company: props.userId,
        project: props.projectId,
        name: currentNewVendorInfo.name,
        phone: currentNewVendorInfo.phone,
        email: currentNewVendorInfo.email,
        website: currentNewVendorInfo.website,
        address: currentNewVendorInfo.address,
        type: currentNewVendorInfo.type,
        subtype: currentNewVendorInfo.subtype,
        logo: currentNewVendorInfo.logo,
      };

      //-- if we're editing, add the id to the update data.
      if (isEditing) {
        // @ts-ignore
        updateData.id = currentNewVendorInfo.id;
      }

      //-- don't create a company_entity record if we're editing...
      if (!isEditing) {
        //-- check for existing company_entity record with the same core information...
        const { data: existingCompanyData, error: existingCompanyError } = await supabase
          .from('company_entity')
          .select('id, name, phone')
          .match({
            company: props.userId,
            name: currentNewVendorInfo.name,
            phone: currentNewVendorInfo.phone,
            // email: currentNewVendorInfo.email,
          })
          .maybeSingle();

        if (existingCompanyError) {
          throw new Error(existingCompanyError.message) || 'Failed to check for existing company vendor.';
        }

        //-- ...and only create a new company_entity record if no match is found.
        if (!existingCompanyData) {
          const { error: companyEntityError } = await supabase.from('company_entity').insert({
            ...updateData,
            project: null,
          });

          if (companyEntityError) {
            throw new Error(companyEntityError.message || 'Failed to save vendor.');
          }
        }
      }

      //-- upsert the project_entity record.
      const { data: projectEntityData, error: projectEntityError } = await supabase
        .from('project_entity')
        .upsert(updateData)
        .select()
        .single();

      if (projectEntityError || !projectEntityData) {
        throw new Error(projectEntityError?.message || 'Failed to save vendor.');
      }

      //-- handle logo uploading.
      if (tempLogoFile) {
        const logoSignedUrl = await uploadLogoToSupabase({
          supabase,
          entityId: projectEntityData.id,
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
          id: projectEntityData.id,
          logo: logoSignedUrl,
        });
      }

      toast.success(`Vendor ${isEditing ? 'updated' : 'created'} successfully.`);

      props.onSave();
    } catch (error) {
      console.error('Error saving entity:', error);
      toast.error(`Something went wrong ${isEditing ? 'updating' : 'creating'} the entity. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  }, [projectVendors, newVendorInfoRef, newVendorInfo, props.userId, props.projectId]);

  const deleteSelectedVendor = useCallback(
    async (vendorId: string) => {
      if (!vendorId) return;

      setIsSaving(true);

      const { error } = await supabase.from('project_entity').delete().eq('id', vendorId);

      if (error) {
        console.error('Error: ', error);
        toast.error('Something went wrong deleting the project vendor. Please try again.');

        setIsSaving(false);

        return;
      }

      toast.success('Project vendor successfully removed.');

      props.onSave();
      setIsSaving(false);
    },
    [projectVendors],
  );

  return (
    <Dialog defaultOpen={true} open={true}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        className="max-w-[420px] h-[820px] gap-0 max-sm:w-full max-sm:h-full"
      >
        <DialogHeader className="flex items-between justify-center py-3 px-5 w-full h-full">
          <div className="flex justify-between items-center">
            <DialogTitle>
              <div className="flex items-center gap-2">
                {view === 'list' && selectedVendorId === '' && 'Manage vendors'}
                {view === 'create' && 'Add new vendor'}
                {view === 'edit' && 'Edit vendor'}
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

        {view === 'edit' && selectedVendor && (
          <EditProjectVendor
            selectedVendor={selectedVendor}
            companyVendors={props.companyVendors}
            projectVendors={projectVendors ?? []}
            onCancel={() => {
              setSelectedVendorId('');

              setNewVendorInfo({
                id: undefined,
                name: '',
                phone: '',
                email: '',
                website: '',
                address: '',
                type: 'Vendor',
                subtype: '',
                logo: '',
              });
            }}
            newVendorInfo={newVendorInfo}
            setNewVendorInfo={setNewVendorInfo}
            noEntities={projectVendors.length >= 1}
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
                {projectVendors.length > 0 && (
                  <SortableContext items={projectVendors} strategy={verticalListSortingStrategy}>
                    {projectVendors.map((entity) => {
                      return (
                        <EntityListItem
                          key={entity.id}
                          entity={entity}
                          // pointOfContact={
                          //   props.pointsOfContact.filter(
                          //     (poc) => poc.project_entity === entity.id
                          //   )[0] ?? newPointOfContactInfo
                          // }
                          selected={!!selectedVendor}
                          onSetSelected={setSelectedVendorId}
                          deleteSelectedEntity={deleteSelectedVendor}
                        />
                      );
                    })}
                  </SortableContext>
                )}
              </DndContext>

              <div
                onClick={() => setSelectedVendorId('new')}
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
          <CreateNewProjectVendor
            companyVendors={props.companyVendors}
            projectVendors={projectVendors}
            onCancel={() => {
              setSelectedVendorId('');

              setNewVendorInfo({
                id: undefined,
                name: '',
                phone: '',
                email: '',
                website: '',
                address: '',
                type: 'Vendor',
                subtype: '',
                logo: '',
              });
            }}
            newVendorInfo={newVendorInfo}
            setNewVendorInfo={setNewVendorInfo}
            noEntities={projectVendors.length >= 1}
            setRefreshKey={setRefreshKey}
            setTempLogoFile={setTempLogoFile}
            tempLogoPreviewUrl={tempLogoPreviewUrl}
            setTempLogoPreviewUrl={setTempLogoPreviewUrl}
          />
        )}

        <DialogFooter className="flex max-sm:flex-row items-center !justify-between p-3 h-full w-full">
          <div className="">
            {view === 'edit' && (
              <AlertDialog
                withPortal
                onConfirm={async () => {
                  if (!selectedVendor) return;

                  deleteSelectedVendor(selectedVendor.id);
                }}
                isDelete
                title={`Delete entity?`}
                description={`This will remove this vendor from the project.`}
              >
                <Button
                  className="px-3 w-[100px] !gap-1 bg-white bg-opacity-0 disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed hover:bg-opacity-[.03]"
                  variant="outline"
                  size="compact"
                  disabled={isSaving}
                  onClick={() => {}}
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
              {view === 'create' ? 'Add Vendor' : view === 'edit' ? 'Save changes' : 'Done'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
