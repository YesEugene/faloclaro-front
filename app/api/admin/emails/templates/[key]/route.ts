import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function isMissingLayoutColumnsError(msg: string): boolean {
  const m = (msg || '').toLowerCase();
  return (
    (m.includes('layout_json_en') || m.includes('layout_json_ru')) &&
    (m.includes('schema cache') || m.includes('does not exist') || m.includes('could not find'))
  );
}

export async function GET(_: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await ctx.params;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('email_templates').select('*').eq('key', key).limit(1).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, template: data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await ctx.params;
    const body = await req.json();
    const update: Record<string, any> = {};
    const allowed = [
      'name',
      'category',
      'is_active',
      'subject_ru',
      'subject_en',
      'body_ru',
      'body_en',
      'layout_json_ru',
      'layout_json_en',
      'cta_enabled',
      'cta_text_ru',
      'cta_text_en',
      'cta_url_template',
    ];
    for (const k of allowed) {
      if (k in body) update[k] = body[k];
    }
    update.updated_at = new Date().toISOString();

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('email_templates').update(update).eq('key', key);
    if (error) {
      const msg = error.message || String(error);
      if (isMissingLayoutColumnsError(msg)) {
        return NextResponse.json(
          {
            success: false,
            error:
              'DB is missing email_templates.layout_json_ru/layout_json_en. Run database/migrations/005_email_template_visual_layout.sql in Supabase and retry.',
          },
          { status: 409 }
        );
      }
      throw error;
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}


