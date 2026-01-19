import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: campaigns, error: cErr } = await supabase
      .from('email_campaigns')
      .select('key, name, is_active, updated_at')
      .order('key', { ascending: true });
    if (cErr) throw cErr;

    const { data: steps, error: sErr } = await supabase
      .from('email_campaign_steps')
      .select('campaign_key, step_index, template_key, delay_hours, stop_conditions')
      .order('campaign_key', { ascending: true })
      .order('step_index', { ascending: true });
    if (sErr) throw sErr;

    return NextResponse.json({ success: true, campaigns: campaigns || [], steps: steps || [] });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}


