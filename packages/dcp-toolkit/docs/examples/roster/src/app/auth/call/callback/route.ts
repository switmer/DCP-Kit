import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next');

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(requestUrl.origin);
    }

    /* TODO: move to a reusable function, its repeating "/member" route */
    const { data: member } = await supabase.from('member').select('*').eq('id', user.id).single();

    if (!member) {
      await supabase.from('member').insert({ id: user.id });
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}${next || '/'}`);
}
