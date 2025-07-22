
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { addDays } from 'date-fns';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { Invite } from '@/components/emails/Invite';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const { email, role, company } = await request.json();
  const supabase = createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: userData } = await supabase
    .from('company_user')
    .select(
      `
        *, company(*)    
    `,
    )
    .eq('user', user.id)
    .eq('company', company)
    .single();

  if (userData?.role !== 'admin') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const token = uuidv4();
  const expiresAt = addDays(new Date(), 7);

  const { error: inviteError } = await resend.emails.send({
    from: 'Roster <noreply@onroster.app>',
    to: [email],
    subject: `Join ${!!userData.company?.name ? `${userData.company?.name} on ` : ''}Roster`,
    react: Invite({
      company: userData?.company?.name,
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/join/${token}`,
    }),
  });

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('company_user_invite')
    .insert({
      email,
      company,
      token,
      role,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, invite: data });
}
