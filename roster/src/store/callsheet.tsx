import { createClient } from '@/lib/supabase/client';
import { normalizeCallSheetMember } from '@/lib/utils';
import { CallSheetMemberType, PushCall } from '@/types/type';
import { toast } from 'sonner';

import { create } from 'zustand';
import { updateCallSheetTimestamp } from '@/lib/updateCallSheetTimestamp';

type State = {
  members: any[];
  callPushesLoading: boolean;
  callPush?: PushCall | null;
};

type Actions = {
  fetchCallPushes: (call_sheet_id: string) => Promise<void>;
  addCallPush: (call_sheet: string, hours: number, minutes: number, notify: boolean) => Promise<void>;
  fetchMembers: (call_sheet_id: string) => Promise<void>;
  updateMember: (id: string, key: string, value: any) => Promise<void>;
};

export const useCallSheetStore = create<State & Actions>((set, get) => ({
  members: [],
  callPush: null,
  callPushesLoading: true,
  fetchCallPushes: async (call_sheet_id: string) => {
    const supabase = createClient();
    set({ callPushesLoading: true });
    const { data } = await supabase
      .from('call_sheet_push_call')
      .select('*')
      .eq('call_sheet', call_sheet_id)
      .order('created_at', { ascending: false });

    set({ callPush: data?.[0], callPushesLoading: false });
  },
  fetchMembers: async (call_sheet_id: string) => {
    const supabase = createClient();
    supabase
      .from('call_sheet_member')
      .select(
        `
          *, 
          project_position(*, project_member(*))
        `,
      )
      .eq('call_sheet', call_sheet_id)
      .order('order')
      .then(({ data, error }) => {
        if (!data || error) {
          toast.error('Something went wrong fetching members.');
          console.error('Error: ', error);

          return;
        }

        set({
          members: data.map((m) => normalizeCallSheetMember(m as any)),
        });
      });
  },
  updateMember: async (id: string, key: string, value: any) => {
    const supabase = createClient();
    const currentMember = get().members.find((m) => m.id === id);
    if (!currentMember) return;

    if (['title', 'department'].includes(key)) {
      if (!currentMember.project_position?.id) return;

      await supabase
        .from('project_position')
        .update({ [key]: value })
        .eq('id', currentMember.project_position.id);
    } else if (['email', 'phone', 'name'].includes(key)) {
      if (!currentMember.project_position?.project_member?.id) return;

      await supabase
        .from('project_member')
        .update({ [key]: value })
        .eq('id', currentMember.project_position.project_member.id);
    } else {
      await supabase
        .from('call_sheet_member')
        .update({ [key]: value })
        .eq('id', id);
    }

    set({
      members: get().members.map((m) => (m.id === id ? { ...m, [key]: value } : m)),
    });
  },
  addCallPush: async (call_sheet: string, hours: number, minutes: number, notify: boolean) => {
    const supabase = createClient();

    await supabase.from('call_sheet_push_call').delete().eq('call_sheet', call_sheet);

    const { data } = await supabase
      .from('call_sheet_push_call')
      .insert({
        call_sheet,
        hours,
        minutes,
        notify,
      })
      .select();

    // update call sheet's updated_at timestamp.
    await updateCallSheetTimestamp(supabase, call_sheet);

    fetch('/sheet/push', {
      method: 'POST',
      body: JSON.stringify({
        id: call_sheet,
      }),
    });

    if (data) {
      set({ callPush: data[0] });
    }
  },
}));
