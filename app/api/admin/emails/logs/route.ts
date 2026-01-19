import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || '100'), 500);
    const userEmail = (url.searchParams.get('email') || '').trim();
    const templateKey = (url.searchParams.get('template') || '').trim();
    const campaignKey = (url.searchParams.get('campaign') || '').trim();

    let q = supabase
      .from('email_logs')
      .select('id, sent_at, status, error, template_key, campaign_key, campaign_step_index, email_type, day_number, user_id, lesson_id, subscription_users(email)')
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (templateKey) q = q.eq('template_key', templateKey);
    if (campaignKey) q = q.eq('campaign_key', campaignKey);

    const { data, error } = await q;
    if (error) throw error;

    let rows: any[] = data || [];
    if (userEmail) {
      rows = rows.filter((r) => String(r?.subscription_users?.email || '').toLowerCase().includes(userEmail.toLowerCase()));
    }

    return NextResponse.json({ success: true, logs: rows });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}


