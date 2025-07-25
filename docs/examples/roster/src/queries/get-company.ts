import { Database } from '@/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

export const getCompany = (client: SupabaseClient<Database>, userId: string, id?: string) => {
  if (!id) {
    return client
      .from('company_user')
      .select(
        `
          company (
            *
          )
        `,
      )
      .eq('user', userId)
      .throwOnError()
      .limit(1)
      .then(({ data }) => {
        return {
          data: data?.[0]?.company,
        };
      });
  }

  return client.from('company').select().eq('id', id).throwOnError().single();
};
