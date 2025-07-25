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
import { capitalizeString } from '@/lib/utils';
import { useCompanyStore } from '@/store/company';

export type NewProductionContactInfo = {
  name: string;
  position: string;
  phone: string;
  email: string;
};

type Props = {
  callSheetMembers: CallSheetMemberType[];
  onCancel: () => void;
  newInfo: NewProductionContactInfo;
  onChange: (newContactInfo: NewProductionContactInfo) => void;
  noProductionContacts: boolean;
};

export const CreateNewProductionContact: FC<Props> = (props) => {
  const {
    /* @ts-ignore */
    data: { user } = {},
  } = useQuery({ queryKey: ['user'], queryFn: () => getUser(supabase) });
  const [useAllCrew, setUseAllCrew] = useState(true);

  const userId = user?.id;

  const supabase = createClient();
  const { activeCompany } = useCompanyStore();

  const companyCrewQuery = useQuery({
    queryKey: ['companyCrew'],
    queryFn: async () => {
      if (!userId) return;

      const { data: companyCrew, error: fetchCompanyCrewError } = await supabase
        .from('company_crew_member')
        .select()
        .eq('company', activeCompany as string);

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

  return (
    <div className="p-6 flex flex-col gap-4 h-[500px] overflow-hidden">
      <div className="flex flex-col w-[364px] p-0">
        {props.noProductionContacts && (
          <div
            onClick={props.onCancel}
            className="flex items-center w-[75px] gap-3 cursor-pointer pt-0 pb-3 text-white/80 hover:text-white/100"
          >
            <Icon name="chevron" className="w-4 h-4 rotate-180" />
            <div className="text-lg">Back</div>
          </div>
        )}

        <NewProductionContactItem
          position={props.newInfo.position}
          name={props.newInfo.name}
          phone={props.newInfo.phone}
          // email={newContactEmail}
        />
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <div className="py-0 pb-4 flex flex-1 flex-col gap-4 rounded-[26px] shadow min-h-[400px]">
          <div>
            <div className="flex items-center justify-between">
              <div className="pb-1 text-sm text-white/70">Search or enter their full name</div>

              {/*<div*/}
              {/*  onClick={() => setUseAllCrew((prev) => !prev)}*/}
              {/*  className="flex items-center pb-1 gap-[2px] cursor-pointer"*/}
              {/*>*/}
              {/*  <div className="text-sm text-white/70">Search All Crew</div>*/}
              {/*  <Icon*/}
              {/*    name={useAllCrew ? "checkbox" : "checkbox-unchecked"}*/}
              {/*    className="w-5 h-5"*/}
              {/*  />*/}
              {/*</div>*/}
            </div>

            <AutoCompleteCrew
              autoFocus
              className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
              value={props.newInfo.name}
              crewSuggestions={useAllCrew ? companyCrewMembers : props.callSheetMembers}
              useAllCrew={useAllCrew}
              maxResults={100}
              placeholder="e.g., Stanley Kubrick"
              onChange={(newName: string) => {
                props.onChange({
                  ...props.newInfo,
                  name: newName,
                });
              }}
              onCrewClick={(crew: CallSheetMemberType | CompanyCrewMemberType) => {
                let newPosition = '';

                if ('title' in crew) {
                  newPosition = crew.title as string;
                }

                if ('tfs' in crew) {
                  if (!crew.tfs) return;

                  const match = crew.tfs.match(/{[^}]+}\s+([^{}]+)(?=\s*{|$)/);

                  newPosition = match ? capitalizeString(match[1]) : '';
                }

                props.onChange({
                  ...props.newInfo,

                  //-- if there's a name, spread the name, etc.
                  ...(crew.name ? { name: crew.name } : { name: '' }),
                  ...(newPosition ? { position: newPosition } : { position: '' }),
                  ...(crew.phone ? { phone: crew.phone } : { phone: '' }),
                  ...(crew.email ? { email: crew.email } : { email: '' }),
                });
              }}
            />
          </div>

          <div>
            <div className="pb-1 text-sm text-white/70">Position</div>
            <input
              className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
              type="text"
              onChange={(e) => {
                props.onChange({
                  ...props.newInfo,
                  position: e.target.value,
                });
              }}
              value={props.newInfo.position}
              placeholder="e.g., Director"
            />
          </div>

          <div>
            <div className="pb-1 text-sm text-white/70">Phone</div>
            <PhoneInput
              className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
              onChange={(newPhone) => {
                props.onChange({
                  ...props.newInfo,
                  phone: newPhone ?? '',
                });
              }}
              value={props.newInfo.phone}
              defaultCountry="US"
              placeholder="e.g., (555) 867-5309"
            />
          </div>

          <div>
            <div className="pb-1 text-sm text-white/70">Email</div>
            <input
              className="flex items-center w-full h-[40px] px-2 rounded-lg bg-zinc-900/70 border border-white/10 placeholder:text-zinc-500/60"
              onChange={(e) => {
                props.onChange({
                  ...props.newInfo,
                  email: e.target.value,
                });
              }}
              value={props.newInfo.email}
              placeholder="e.g., you@example.com"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
