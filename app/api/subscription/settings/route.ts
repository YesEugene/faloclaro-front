import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type AppLanguage = 'ru' | 'en';

function getAnonSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function resolveUserIdOrThrow(input: {
  lessonToken?: string | null;
  authAccessToken?: string | null;
}): Promise<string> {
  const supabaseAdmin = getSupabaseAdmin();

  if (input.lessonToken) {
    const { data: tokenRow, error } = await supabaseAdmin
      .from('lesson_access_tokens')
      .select('user_id')
      .eq('token', input.lessonToken)
      .limit(1)
      .maybeSingle();

    if (error || !tokenRow?.user_id) {
      throw new Error('Invalid lesson token');
    }
    return tokenRow.user_id;
  }

  if (input.authAccessToken) {
    const anon = getAnonSupabase();
    const { data, error } = await anon.auth.getUser(input.authAccessToken);
    if (error || !data?.user?.id) {
      throw new Error('Invalid auth session');
    }
    return data.user.id;
  }

  throw new Error('Missing auth');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = await resolveUserIdOrThrow({
      lessonToken: body?.lessonToken ?? null,
      authAccessToken: body?.authAccessToken ?? null,
    });

    const supabaseAdmin = getSupabaseAdmin();
    const { data: user, error } = await supabaseAdmin
      .from('subscription_users')
      .select('*')
      .eq('id', userId)
      .limit(1)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      settings: {
        email: user.email ?? null,
        language_preference: user.language_preference ?? 'ru',
        // May not exist in older DBs; keep nullable and default to true on client
        email_notifications_enabled:
          typeof user.email_notifications_enabled === 'boolean' ? user.email_notifications_enabled : null,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to load settings' },
      { status: 400 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = await resolveUserIdOrThrow({
      lessonToken: body?.lessonToken ?? null,
      authAccessToken: body?.authAccessToken ?? null,
    });

    const language = body?.language_preference as AppLanguage | undefined;
    const email = (body?.email as string | undefined)?.trim();
    const emailNotificationsEnabled = body?.email_notifications_enabled as boolean | undefined;

    const update: Record<string, any> = {};
    if (language && (language === 'ru' || language === 'en')) update.language_preference = language;
    if (typeof email === 'string' && email.length > 3) update.email = email;

    const supabaseAdmin = getSupabaseAdmin();

    // Always attempt to update language/email (these columns exist).
    if (Object.keys(update).length > 0) {
      const { error } = await supabaseAdmin.from('subscription_users').update(update).eq('id', userId);
      if (error) throw error;
    }

    // Try to update optional column (may not exist in older DBs). Ignore if DB doesn't have it.
    if (typeof emailNotificationsEnabled === 'boolean') {
      const { error: notifError } = await supabaseAdmin
        .from('subscription_users')
        .update({ email_notifications_enabled: emailNotificationsEnabled })
        .eq('id', userId);
      if (notifError) {
        // Do not fail request if this column doesn't exist yet
        console.warn('email_notifications_enabled update failed (ignored):', notifError.message);
      }
    }

    const { data: user, error: readError } = await supabaseAdmin
      .from('subscription_users')
      .select('*')
      .eq('id', userId)
      .limit(1)
      .maybeSingle();

    if (readError || !user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      settings: {
        email: user.email ?? null,
        language_preference: user.language_preference ?? 'ru',
        email_notifications_enabled:
          typeof user.email_notifications_enabled === 'boolean' ? user.email_notifications_enabled : null,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to save settings' },
      { status: 400 }
    );
  }
}


