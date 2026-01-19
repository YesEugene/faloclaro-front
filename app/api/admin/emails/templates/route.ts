import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('email_templates')
      .select('key, name, category, is_active, subject_ru, subject_en, updated_at')
      .order('category', { ascending: true })
      .order('key', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ success: true, templates: data || [] });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const key = String(body?.key || '').trim();
    const name = String(body?.name || '').trim();
    if (!key || !name) {
      return NextResponse.json({ success: false, error: 'key and name are required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('email_templates').insert({
      key,
      name,
      category: String(body?.category || 'core'),
      is_active: body?.is_active !== false,
      subject_ru: String(body?.subject_ru || ''),
      subject_en: String(body?.subject_en || ''),
      body_ru: String(body?.body_ru || ''),
      body_en: String(body?.body_en || ''),
      cta_enabled: !!body?.cta_enabled,
      cta_text_ru: body?.cta_text_ru ?? null,
      cta_text_en: body?.cta_text_en ?? null,
      cta_url_template: body?.cta_url_template ?? null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 });
  }
}


