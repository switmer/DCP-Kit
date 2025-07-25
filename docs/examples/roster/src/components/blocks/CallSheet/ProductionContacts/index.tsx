import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import React, { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { formatPhoneNumber } from 'react-phone-number-input';
import { ManageProductionContacts } from '@/components/blocks/CallSheet/ProductionContacts/ManageProductionContacts';
import { CallSheetMemberType } from '@/types/type';
import { Call } from '../Call';

export type ProductionContactCrew = {
  id: string;
  position: string;
  name: string;
  phone: string;
  email?: string;
};

export type RawJsonProductionContacts = Record<
  string,
  {
    name: string;
    phone: string;
    email?: string;
    order?: number;
  }
>;

export const ProductionContacts: React.FC<{
  members: CallSheetMemberType[];
  contacts: RawJsonProductionContacts;
  call?: string;
  sheetId: string;
  onUpdate?: () => void;
  setRefreshKey?: Dispatch<SetStateAction<number>>;
}> = ({ members, contacts, call, sheetId, setRefreshKey }) => {
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [initiallyViewing, setInitiallyViewing] = useState<'new' | ProductionContactCrew['id']>('new');

  const productionContactsArray = useMemo(() => {
    let res;
    if (Array.isArray(contacts)) {
      res = contacts.map(({ name, phone, title, order }) => ({
        position: title,
        name,
        phone,
        id: crypto ? crypto.randomUUID() : `id-${Math.random()}`,
        order: order ?? 100,
      }));
    } else {
      res = Object.entries(contacts ?? {}).map(([position, details]) => ({
        position,
        ...details,
        id: crypto ? crypto.randomUUID() : `id-${Math.random()}`,
        order: details.order ?? 100,
      }));
    }

    return (
      res
        .sort((a, b) => Math.sign(a.order - b.order))
        // After we've sorted the array, drop the order to avoid confusion
        .map((el) => ({ ...el, order: undefined }))
    );
  }, [contacts]);

  return (
    <>
      <div className="flex gap-2 w-full overflow-x-scroll max-sm:min-h-[80px] max-sm:gap-3 hide-scrollbars">
        <div className="flex max-sm:flex-col">
          <div className="flex flex-col px-3 py-3 rounded-xl min-w-[255px]">
            <p className="font-label font-medium uppercase text-base text-white mb-4 leading-none max-sm:mb-3">
              General Call
            </p>

            <div className="flex items-center gap-2">
              <Call id={sheetId} call={call} />
            </div>
          </div>

          <div className="flex gap-2">
            {productionContactsArray.length === 0 && (
              <div
                className="group flex flex-col items-center justify-center min-w-[200px] max-w-[200px] h-[125px] p-2 rounded-xl border-[3px] border-white/20 border-dashed cursor-pointer hover:border-zinc-500/55"
                onClick={(e) => {
                  setInitiallyViewing('new');
                  setManageModalOpen(true);
                }}
              >
                <div>
                  <Icon name="user" className="w-[60px] h-[60px] text-white/30 group-hover:text-white/50" />{' '}
                </div>

                <div className="flex gap-3 items-center justify-center w-full pb-2">
                  <div className="w-[20px] h-[20px] bg-zinc-800 rounded-full group-hover:bg-zinc-700">
                    <Icon name="plus" className="w-5 h-5 text-white/60 group-hover:text-white/80" />
                  </div>
                  <div className="text-sm text-white/60 font-bold uppercase group-hover:text-white/80">
                    Add Prod. Contact
                  </div>
                </div>
              </div>
            )}

            {productionContactsArray.length !== 0 &&
              productionContactsArray.map((d, i) => {
                const words = d?.name?.split(' ') ?? [];

                let initials = '';

                for (const word of words) {
                  if (word.length > 0) {
                    initials += word[0]?.toUpperCase();
                  }
                }

                let phone = formatPhoneNumber(d.phone);

                if (!phone) {
                  const cleanPhone = d.phone.replace(/[^0-9]/g, '');
                  phone = formatPhoneNumber('+1' + cleanPhone);
                }

                return (
                  <div
                    onClick={() => {
                      setInitiallyViewing(d.id);
                      setManageModalOpen(true);
                    }}
                    className="group flex flex-col px-3 py-3 rounded-3xl min-w-[235px] h-[115px] border border-white border-opacity-10 hover:bg-stone-500/20 cursor-pointer"
                    key={`${d.phone}-${i}`}
                  >
                    <p className="flex gap-2 justify-between items-center font-label font-medium uppercase text-base text-white mb-4 leading-none max-sm:mb-3">
                      {d.position.replaceAll('_', ' ')}

                      <Icon name="edit" className="w-4 h-4 text-stone-500/80 opacity-0 group-hover:opacity-100" />
                    </p>

                    <div className="flex items-center gap-2 min-h-[46px]">
                      <Avatar>
                        <AvatarFallback>
                          <span>{initials}</span>
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex flex-col gap-2">
                        <div className="text-white text-lg font-bold leading-none max-sm:text-[16px]">{d.name}</div>

                        {!!phone && <div className="text-white text-sm font-normal leading-none">{phone}</div>}
                      </div>
                    </div>
                  </div>
                );
              })}

            {productionContactsArray.length !== 0 && (
              <div className="flex flex-col items-center justify-evenly gap-2 py-1 pr-3">
                <div
                  onClick={() => {
                    setInitiallyViewing('new');
                    setManageModalOpen(true);
                  }}
                  className="flex flex-1 items-center justify-center w-[45px] bg-zinc-900/70 rounded-2xl text-white/30 cursor-pointer hover:bg-zinc-900/95 hover:text-white/65"
                >
                  <Icon name="plus" className="w-8 h-8" />
                </div>

                <div
                  onClick={() => {
                    setInitiallyViewing('');
                    setManageModalOpen(true);
                  }}
                  className="flex flex-1 items-center justify-center w-[45px] bg-zinc-900/70 rounded-2xl text-white/30 cursor-pointer hover:bg-zinc-900/95 hover:text-white/65"
                >
                  <Icon name="edit" className="w-5 h-5" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {manageModalOpen && (
        <ManageProductionContacts
          productionContacts={productionContactsArray}
          members={members}
          sheetId={sheetId}
          initiallyViewing={initiallyViewing}
          onCancel={() => setManageModalOpen(false)}
          onSave={() => setRefreshKey && setRefreshKey((k: number) => k + 1)}
        />
      )}
    </>
  );
};
