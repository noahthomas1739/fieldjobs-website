import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const { getLeadGenStats } = require('../../../../scripts/lead-gen-health');

function getAdminEmails() {
  return (process.env.LEAD_GEN_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function GET() {
  try {
    const adminEmails = getAdminEmails();
    if (adminEmails.length === 0) {
      return NextResponse.json(
        { error: 'Admin access not configured (set LEAD_GEN_ADMIN_EMAILS)' },
        { status: 503 }
      );
    }

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminEmails.includes(user.email.toLowerCase())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const stats = await getLeadGenStats();
    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Admin leads-stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
