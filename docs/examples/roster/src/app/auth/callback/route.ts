import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(requestUrl.origin);
    }

    const companyId = cookies().get('activeCompany')?.value;

    const query = supabase.from('company_user').select('company ( * )');

    if (companyId) {
      query.eq('company', companyId);
    } else {
      query.eq('user', user.id);
    }

    const { data: company } = await query.then((q) => {
      return {
        data: q.data?.[0]?.company,
      };
    });

    if (company) {
      cookies().set('activeCompany', company.id);
    }

    if (!company) {
      await supabase.from('company').insert({ id: user.id });
      await supabase.from('company_user').insert({
        company: user.id,
        user: user.id,
      });
      cookies().set('activeCompany', user.id ?? '');
    }
  }

  return NextResponse.redirect(requestUrl.origin);
}
