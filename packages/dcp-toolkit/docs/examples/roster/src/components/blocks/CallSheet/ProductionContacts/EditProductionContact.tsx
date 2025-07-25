'use client';

import React, { FC, useMemo, useState } from 'react';
import PhoneInput from 'react-phone-number-input/input';
import { NewProductionContactItem } from '@/components/blocks/CallSheet/ProductionContacts/NewProductionContactItem';
import { Icon } from '@/components/ui/Icon';
import { AutoCompleteCrew } from '@/components/blocks/CallSheet/ProductionContacts/AutoCompleteCrew';
import { CallSheetMemberType, CompanyCrewMemberType } from '@/types/type';
import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { getUser } from '@/queries/get-user';
import { toast } from 'sonner';
import { capitalizeString, cn, makeInitials } from '@/lib/utils';
import { Editable } from '@/components/ui/Editable';
import { ProductionContactCrew } from '@/components/blocks/CallSheet/ProductionContacts/index';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { formatPhoneNumber } from 'react-phone-number-input/min';

type Props = {
  selectedContact: ProductionContactCrew;
  selectedContactId: ProductionContactCrew['id'] | 'new' | '';
  setSelectedContactId: (id: ProductionContactCrew['id'] | 'new' | '') => void;
  selectedIsOnCrewList: boolean;
  setContactProperties: (id: ProductionContactCrew['id'], newValues: Partial<ProductionContactCrew>) => void;
  deleteSelectedContact: (id?: string) => void;
};

export const EditProductionContact: FC<Props> = (props) => {
  const {
    /* @ts-ignore */
    data: { user } = {},
  } = useQuery({ queryKey: ['user'], queryFn: () => getUser(supabase) });
  const [useAllCrew, setUseAllCrew] = useState(true);

  const userId = user?.id;

  const supabase = createClient();

  const companyCrewQuery = useQuery({
    queryKey: ['companyCrew'],
    queryFn: async () => {
      if (!userId) return;

      const { data: companyCrew, error: fetchCompanyCrewError } = await supabase
        .from('company_crew_member')
        .select()
        .eq('company', userId);

      if (!companyCrew || fetchCompanyCrewError) {
        toast.error('Something went wrong fetching company crew.');

        return;
      }

      return companyCrew;
    },
  });

  const companyCrewMembers = useMemo(() => {
    return companyCrewQuery.data ?? [];
  }, [companyCrewQuery.data]);

  const initials = props.selectedContact.name ? makeInitials(props.selectedContact.name) : '';

  let phone = formatPhoneNumber(props.selectedContact.phone);

  if (!phone) {
    const cleanPhone = props.selectedContact.phone.replace(/[^0-9]/g, '');
    phone = formatPhoneNumber('+1' + cleanPhone);
  }

  return (
    <div className="flex flex-col gap-4 p-6 h-[500px] overflow-hidden">
      <div
        onClick={() => props.setSelectedContactId('')}
        className="flex items-center w-[75px] gap-3 cursor-pointer pt-0 pb-1 text-white/80 hover:text-white/100"
      >
        <Icon name="chevron" className="w-4 h-4 rotate-180" />
        <div className="text-lg">Back</div>
      </div>

      {/* production contact info preview */}
      <div className={cn('group flex flex-col px-3 pt-0 pb-2 rounded-xl min-w-[200px]')}>
        <div
          className={cn(
            'flex justify-between items-center h-[15px] font-label font-medium uppercase text-sm text-white/80 mb-2 leading-none max-sm:mb-3',
          )}
        >
          {props.selectedContact.position ? (
            <>{props.selectedContact.position.replaceAll('_', ' ')}</>
          ) : (
            <Skeleton className="w-[140px] h-[13px] rounded-xl" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarFallback>
              <span>{initials}</span>
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col gap-2">
            <div className="text-white text-md font-bold leading-none max-sm:text-[16px]">
              {props.selectedContact.name}
            </div>

            <div className="text-white/70 text-sm font-normal leading-none">{phone}</div>

            <div className="relative top-[-3px] flex items-center">
              {props.selectedIsOnCrewList ? (
                <Icon name="check" className="w-4 h-4 mr-[3px]" />
              ) : (
                <Icon name="error" className="w-5 h-5 mr-[3px] text-white/60" />
              )}

              {/*<div className="text-zinc-500 font-medium">*/}
              {/*  {props.selectedContact.name}&nbsp;*/}
              {/*</div>*/}

              <div className="text-sm text-zinc-500/80">
                {`${props.selectedIsOnCrewList ? 'On' : 'Not on'} the crew list.`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {props.selectedContact && (
        <div className="pt-0 pb-4 flex flex-1 flex-col gap-4 rounded-[26px] shadow min-h-[400px]">
          <div>
            <div className="pb-1 text-sm text-white/70">Full name</div>
            <div className="flex items-center w-full h-[40px] rounded-lg bg-zinc-900/70 border border-white/10">
              <Editable
                className="w-full h-full"
                type="text"
                onChange={(name) => props.setContactProperties(props.selectedContactId, { name })}
                value={props.selectedContact.name}
              />
            </div>
          </div>

          <div>
            <div className="pb-1 text-sm text-white/70">Position</div>
            <div className="flex items-center w-full h-[40px] rounded-lg bg-zinc-900/70 border border-white/10">
              <Editable
                className="w-full h-full"
                type="text"
                onChange={(position) =>
                  props.setContactProperties(props.selectedContactId, {
                    position,
                  })
                }
                value={props.selectedContact.position}
              />
            </div>
          </div>

          <div>
            <div className="pb-1 text-sm text-white/70">Phone</div>
            <div className="flex items-center w-full h-[40px] rounded-lg bg-zinc-900/70 border border-white/10">
              <Editable
                className="w-full h-full"
                type="tel"
                onChange={(phone) => props.setContactProperties(props.selectedContactId, { phone })}
                value={props.selectedContact.phone}
              />
            </div>
          </div>

          <div>
            <div className="pb-1 text-sm text-white/70">Email</div>
            <div className="flex items-center w-full h-[40px] rounded-lg bg-zinc-900/70 border border-white/10">
              <Editable
                className="w-full h-full"
                type="email"
                onChange={(email) => props.setContactProperties(props.selectedContactId, { email })}
                value={props.selectedContact.email}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
