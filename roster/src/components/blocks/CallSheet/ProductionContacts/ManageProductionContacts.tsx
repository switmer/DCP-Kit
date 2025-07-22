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
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { ProductionContactItem } from '@/components/blocks/CallSheet/ProductionContacts/ProductionContactItem';
import {
  ProductionContactCrew,
  RawJsonProductionContacts,
} from '@/components/blocks/CallSheet/ProductionContacts/index';
import { toast } from 'sonner';
import { CallSheetMemberType } from '@/types/type';
import {
  CreateNewProductionContact,
  NewProductionContactInfo,
} from '@/components/blocks/CallSheet/ProductionContacts/CreateNewProductionContact';
import { digitsOnly } from '@/lib/string/digitsOnly';
import { formatPhoneNumber } from 'react-phone-number-input/min';
import { EditProductionContact } from '@/components/blocks/CallSheet/ProductionContacts/EditProductionContact';

type Props = {
  sheetId: string;
  productionContacts: ProductionContactCrew[];
  members: CallSheetMemberType[];
  initiallyViewing: 'new' | ProductionContactCrew['id'];
  onCancel: () => void;
  onSave: () => void;
};

export const ManageProductionContacts: FC<Props> = (props) => {
  const [selectedContactId, setSelectedContactId] = useState<ProductionContactCrew['id'] | 'new' | ''>(
    props.initiallyViewing,
  );
  const view = useMemo(
    () => (selectedContactId === 'new' ? 'create' : selectedContactId === '' ? 'list' : 'edit'),
    [selectedContactId],
  );
  const [productionContacts, setProductionContacts] = useState<ProductionContactCrew[]>(props.productionContacts);

  const selectedContact = useMemo(
    () => productionContacts.find((el) => el.id === selectedContactId),
    [productionContacts, selectedContactId],
  );

  const selectedIsOnCrewList = useMemo(() => {
    if (!selectedContact) {
      return false;
    }

    return props.members.some((member) => {
      if (!member.phone) return false;

      let memberPhone = formatPhoneNumber(member.phone);
      let selectedPhone = formatPhoneNumber(selectedContact.phone);

      if (!memberPhone) {
        const cleanPhone = member.phone.replace(/[^0-9]/g, '');
        memberPhone = formatPhoneNumber('+1' + cleanPhone);
      }

      if (!selectedPhone) {
        const cleanPhone = selectedContact.phone.replace(/[^0-9]/g, '');
        selectedPhone = formatPhoneNumber('+1' + cleanPhone);
      }

      return memberPhone === selectedPhone;
    });
  }, [selectedContact, props.members]);

  const [newContactInfo, setNewContactInfo] = useState<NewProductionContactInfo>({
    name: '',
    position: '',
    phone: '',
    email: '',
  });
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      setProductionContacts((prev) => {
        const oldIndex = prev.findIndex((el) => el.id === active.id);
        const newIndex = prev.findIndex((el) => el.id === over.id);

        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }

  const addContact = useCallback(() => {
    // Validate the info
    if (newContactInfo.position.trim() === '' || newContactInfo.name.trim() === '') {
      toast.error('A name and position are both required.');
      return;
    }

    const positionNames = productionContacts.map((el) => el.position.toLowerCase());

    if (positionNames.includes(newContactInfo.position.toLowerCase())) {
      toast.error('A production contact for that position already exists.');
      return;
    }

    // Add the new contact to the production contacts array (in memory)
    const newId = crypto.randomUUID();

    setProductionContacts((prev) => {
      return [
        ...prev,
        {
          ...newContactInfo,
          id: newId,
        },
      ];
    });

    setSelectedContactId('');

    setNewContactInfo({ name: '', position: '', email: '', phone: '' });
  }, [productionContacts, newContactInfo]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    // Create our new object for production contacts
    const newProductionContacts = productionContacts.map((k, index) => ({
      name: k.name,
      phone: k.phone,
      title: k.position,
      order: index,
    }));

    let { data: sheetRawJson, error: fetchSheetRawJsonError } = await supabase
      .from('call_sheet')
      .select('raw_json')
      .eq('id', props.sheetId)
      .single();

    if (fetchSheetRawJsonError) {
      toast.error('Something went wrong. Please try again.');

      setIsSaving(false);

      return;
    }

    if (!sheetRawJson?.raw_json) {
      sheetRawJson = { raw_json: {} };
    }
    //@ts-ignore
    sheetRawJson.raw_json.key_contacts = newProductionContacts;

    supabase
      .from('call_sheet')
      .update({ raw_json: sheetRawJson.raw_json, updated_at: new Date().toISOString() })
      .eq('id', props.sheetId)
      .then(() => {
        props.onSave && props.onSave();
        toast.success(`Contact details updated.`);

        setSelectedContactId('');

        if (view !== 'edit') {
          if (selectedContactId !== 'new') props.onCancel();
        }

        setIsSaving(false);
      });
  }, [productionContacts, props.sheetId]);

  const deleteSelectedContact = useCallback(
    async (id?: string) => {
      const contactToDelete = id ?? selectedContactId;

      setIsSaving(true);

      //-- remove the contact from local state.
      const updatedProductionContacts = productionContacts.filter((c) => c.id !== contactToDelete);

      //-- create new production contacts array.
      const newProductionContacts = updatedProductionContacts.map((k, index) => ({
        name: k.name,
        phone: k.phone,
        title: k.position,
        order: index,
      }));

      try {
        //-- fetch current raw_json from sheet.
        let { data: sheetRawJson } = await supabase
          .from('call_sheet')
          .select('raw_json')
          .eq('id', props.sheetId)
          .single();

        if (!sheetRawJson?.raw_json) {
          sheetRawJson = { raw_json: {} };
        }

        //-- update raw_json with new production contacts.
        //@ts-ignore
        sheetRawJson.raw_json.key_contacts = newProductionContacts;

        //-- update raw_json on sheet.
        await supabase
          .from('call_sheet')
          .update({ raw_json: sheetRawJson.raw_json, updated_at: new Date().toISOString() })
          .eq('id', props.sheetId);

        setProductionContacts(updatedProductionContacts);

        if (updatedProductionContacts.length === 0) {
          setSelectedContactId('new');
        } else {
          setSelectedContactId('');
        }

        toast.success('Contact successfully removed.');
      } catch (error) {
        console.error('Error:', error);
        toast.error('Failed to remove contact. Please try again.');
      }

      props.onSave();
      setIsSaving(false);
    },
    [productionContacts, props.sheetId, selectedContactId],
  );

  const setContactProperties = (id: ProductionContactCrew['id'], newValues: Partial<ProductionContactCrew>) => {
    setProductionContacts((prev) =>
      prev.map((contact) => {
        if (contact.id === id) {
          return {
            ...contact,
            ...newValues,
          };
        }

        return contact;
      }),
    );
  };

  return (
    <Dialog defaultOpen={true} open={true}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        className="max-w-[420px] h-[640px] gap-0 max-sm:w-full max-sm:h-full"
      >
        <DialogHeader className="flex items-between justify-center py-3 px-5 w-full h-full">
          <div className="flex justify-between items-center">
            <DialogTitle>
              <div className="flex items-center gap-2">
                {view === 'list' && selectedContactId === '' && 'Manage production contacts'}
                {view === 'create' && 'Add new production contact'}
                {view === 'edit' &&
                  selectedContactId !== 'new' &&
                  selectedContactId !== '' &&
                  'Editing production contact'}
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

        {view === 'edit' && selectedContact && (
          <EditProductionContact
            selectedContact={selectedContact}
            selectedContactId={selectedContactId}
            setSelectedContactId={setSelectedContactId}
            selectedIsOnCrewList={selectedIsOnCrewList}
            setContactProperties={setContactProperties}
            deleteSelectedContact={deleteSelectedContact}
          />
        )}

        {/* list management view */}
        {view === 'list' && (
          <div className="p-6 flex flex-col gap-6 max-w-[420px] h-[500px] overflow-hidden">
            <div className="flex-1 flex flex-col gap-[3px] w-full h-full overflow-y-scroll hide-scrollbars">
              <DndContext
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={handleDragEnd}
                sensors={sensors}
              >
                {productionContacts.length > 0 && (
                  <SortableContext items={productionContacts} strategy={verticalListSortingStrategy}>
                    {productionContacts.map((c) => {
                      const selectedIsOnCrewList = props.members.some(
                        (member) => digitsOnly(member.phone ?? '') === digitsOnly(c.phone),
                      );

                      return (
                        <ProductionContactItem
                          key={c.id}
                          contact={c}
                          selected={c.id === selectedContactId}
                          onSetSelected={() => setSelectedContactId(c.id)}
                          deleteSelectedContact={deleteSelectedContact}
                          selectedIsOnCrewList={selectedIsOnCrewList}
                        />
                      );
                    })}
                  </SortableContext>
                )}
              </DndContext>

              <div
                onClick={() => setSelectedContactId('new')}
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
          <CreateNewProductionContact
            callSheetMembers={props.members}
            onCancel={() => {
              setSelectedContactId('');
            }}
            newInfo={newContactInfo}
            onChange={setNewContactInfo}
            noProductionContacts={productionContacts.length >= 1}
          />
        )}

        <DialogFooter className="flex max-sm:flex-row items-center !justify-between p-3 h-full w-full">
          <div className="">
            {view === 'edit' && (
              <Button
                className="px-3 w-[100px] !gap-1 bg-white bg-opacity-0 disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed hover:bg-opacity-[.03]"
                variant="outline"
                size="compact"
                disabled={isSaving}
                onClick={() => deleteSelectedContact(selectedContactId)}
              >
                <Icon name="bin" className="w-[17px] h-[17px] text-red-400" />
                <div className="text-sm font-semibold">Remove</div>
              </Button>
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
              onClick={view === 'create' ? addContact : handleSave}
            >
              {view === 'create' ? 'Add Contact' : view === 'edit' ? 'Save changes' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
