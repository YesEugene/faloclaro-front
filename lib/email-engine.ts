import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { load as yamlLoad } from 'js-yaml';

export type EmailLang = 'ru' | 'en';

type TemplateRow = {
  key: string;
  name: string;
  category: string;
  is_active: boolean;
  subject_ru: string;
  subject_en: string;
  body_ru: string;
  body_en: string;
  cta_enabled: boolean;
  cta_text_ru: string | null;
  cta_text_en: string | null;
  cta_url_template: string | null;
};

type EnrollmentRow = {
  id: string;
  user_id: string;
  campaign_key: string;
  status: string;
  current_step_index: number;
  enrolled_at: string;
  next_send_at: string | null;
  context: any;
};

type CampaignStepRow = {
  campaign_key: string;
  step_index: number;
  template_key: string;
  delay_hours: number;
  stop_conditions: any;
};

function nowIso() {
  return new Date().toISOString();
}

function addHours(d: Date, hours: number): Date {
  const out = new Date(d.getTime());
  out.setHours(out.getHours() + hours);
  return out;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeTemplateText(s: string): string {
  // Support templates stored with escaped newlines (e.g. "\n\n") as well as real newlines.
  // Postgres seed often stores literal backslash sequences, so convert them.
  return s
    .replaceAll('\r\n', '\n')
    .replaceAll('\\r\\n', '\n')
    .replaceAll('\\n', '\n')
    .replaceAll('\\t', '\t');
}

function extractTask1Cards(task: any): any[] {
  if (!task) return [];

  // Most common (frontend canonical)
  if (Array.isArray(task?.content?.cards)) return task.content.cards;

  // Some imports/variants
  if (Array.isArray(task?.cards)) return task.cards;

  // CRM-like blocks
  const cards: any[] = [];
  if (Array.isArray(task?.blocks)) {
    for (const b of task.blocks) {
      if (Array.isArray(b?.content?.cards)) cards.push(...b.content.cards);
      else if (Array.isArray(b?.cards)) cards.push(...b.cards);
    }
  }
  if (cards.length) return cards;

  // Legacy split lists
  const mw = task?.main_words ?? task?.content?.main_words;
  const aw = task?.additional_words ?? task?.content?.additional_words;
  if (Array.isArray(mw) || Array.isArray(aw)) return [...(mw || []), ...(aw || [])];

  return [];
}

function parseLessonYamlContent(raw: any): any | null {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;

  // Try JSON first
  try {
    return JSON.parse(s);
  } catch {}

  // Try YAML
  try {
    return yamlLoad(s) as any;
  } catch {
    return null;
  }
}

function buildWeeklyStatsHtml(input: {
  title: string;
  lessonsCompleted: number;
  totalWordsLearned: number;
  topics: string[];
  footerText: string;
  ctaUrl?: string | null;
  ctaText?: string | null;
}): string {
  const topicsHtml = input.topics.length
    ? `<ul style="margin: 10px 0 0 18px; padding: 0;">${input.topics
        .map((t) => `<li style="margin: 6px 0;">${escapeHtml(t)}</li>`)
        .join('')}</ul>`
    : `<div style="color:#666;margin-top:10px;">${escapeHtml('—')}</div>`;

  return `
    <div style="font-family: Inter, Arial, sans-serif; color:#111; max-width: 720px; margin: 0 auto; padding: 22px;">
      <div style="font-size: 22px; font-weight: 800; margin-bottom: 14px;">${escapeHtml(input.title)}</div>
      <div style="height:1px;background:#E6E8EB;margin: 12px 0 18px;"></div>

      <div style="display:flex; gap: 14px; flex-wrap: wrap;">
        <div style="flex: 1 1 220px; background:#7CF0A0; border-radius: 22px; padding: 18px 18px;">
          <div style="font-size: 52px; font-weight: 900; line-height: 1;">${escapeHtml(String(input.lessonsCompleted))}</div>
          <div style="font-size: 22px; font-weight: 700; margin-top: 8px;">Уроков пройдено</div>
        </div>
        <div style="flex: 2 1 320px; background:#B277FF; border-radius: 22px; padding: 18px 18px; color:#fff;">
          <div style="font-size: 52px; font-weight: 900; line-height: 1;">${escapeHtml(String(input.totalWordsLearned))}</div>
          <div style="font-size: 22px; font-weight: 700; margin-top: 8px;">Новых слов</div>
        </div>
      </div>

      <div style="margin-top: 16px; background:#fff; border: 1px solid #111; border-radius: 22px; padding: 18px;">
        <div style="font-size: 26px; font-weight: 900; margin-bottom: 10px;">Пройденные темы уроков</div>
        ${topicsHtml}
      </div>

      <div style="height:1px;background:#E6E8EB;margin: 18px 0 18px;"></div>
      <div style="font-size: 16px; font-weight: 600; margin-bottom: 16px;">${escapeHtml(input.footerText)}</div>
      ${
        input.ctaUrl
          ? `<a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 22px;border-radius:14px;font-weight:800;">
              ${escapeHtml(input.ctaText || '')}
            </a>`
          : ''
      }
    </div>
  `;
}

export function renderPlaceholders(template: string, vars: Record<string, string | number | null | undefined>): string {
  let out = normalizeTemplateText(template);
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v == null ? '' : String(v));
  }
  return out;
}

async function getUserLang(userId: string): Promise<EmailLang> {
  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from('subscription_users')
    .select('language_preference')
    .eq('id', userId)
    .limit(1)
    .maybeSingle();
  return (user?.language_preference === 'en' ? 'en' : 'ru') as EmailLang;
}

async function getUserEmail(userId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from('subscription_users')
    .select('email')
    .eq('id', userId)
    .limit(1)
    .maybeSingle();
  return user?.email ?? null;
}

async function isEmailEnabled(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from('subscription_users')
    .select('email_notifications_enabled')
    .eq('id', userId)
    .limit(1)
    .maybeSingle();
  if (!user) return true;
  return (user as any)?.email_notifications_enabled !== false;
}

async function hasPaidAccess(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, paid_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return !!(sub?.paid_at || sub?.status === 'paid' || sub?.status === 'active');
}

async function getTemplate(templateKey: string): Promise<TemplateRow | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('email_templates').select('*').eq('key', templateKey).limit(1).maybeSingle();
  return (data as any) || null;
}

async function getCampaignSteps(campaignKey: string): Promise<CampaignStepRow[]> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('email_campaign_steps')
    .select('campaign_key, step_index, template_key, delay_hours, stop_conditions')
    .eq('campaign_key', campaignKey)
    .order('step_index', { ascending: true });
  return (data as any[]) || [];
}

async function getOrCreateDay1Token(userId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data: day1Lesson } = await supabase.from('lessons').select('id, day_number').eq('day_number', 1).limit(1).maybeSingle();
  if (!day1Lesson?.id) return null;
  const { data: existing } = await supabase
    .from('lesson_access_tokens')
    .select('token')
    .eq('user_id', userId)
    .eq('lesson_id', day1Lesson.id)
    .limit(1)
    .maybeSingle();
  if (existing?.token) return existing.token;
  // Create token
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 365);
  const { error } = await supabase.from('lesson_access_tokens').insert({
    user_id: userId,
    lesson_id: day1Lesson.id,
    token,
    expires_at: expiresAt.toISOString(),
  });
  if (error) return null;
  return token;
}

export async function buildDefaultVarsForUser(userId: string): Promise<{ intro_url: string; payment_url: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.faloclaro.com';
  const day1Token = await getOrCreateDay1Token(userId);
  const intro_url = day1Token ? `${baseUrl}/pt/intro?day=1&token=${day1Token}` : `${baseUrl}`;
  const payment_url = day1Token ? `${baseUrl}/pt/payment?day=4&token=${day1Token}` : `${baseUrl}/pt/payment`;
  return { intro_url, payment_url };
}

export function computeModuleInfo(dayNumber: number): { moduleNumber: number; moduleLabelRu: string; moduleLabelEn: string } | null {
  if (dayNumber >= 1 && dayNumber <= 14) return { moduleNumber: 1, moduleLabelRu: 'Модуль 1 (A1)', moduleLabelEn: 'Module 1 (A1)' };
  if (dayNumber >= 15 && dayNumber <= 30) return { moduleNumber: 2, moduleLabelRu: 'Модуль 2 (A2)', moduleLabelEn: 'Module 2 (A2)' };
  if (dayNumber >= 31 && dayNumber <= 45) return { moduleNumber: 3, moduleLabelRu: 'Модуль 3 (A2+)', moduleLabelEn: 'Module 3 (A2+)' };
  if (dayNumber >= 46 && dayNumber <= 60) return { moduleNumber: 4, moduleLabelRu: 'Модуль 4 (B1)', moduleLabelEn: 'Module 4 (B1)' };
  return null;
}

export async function sendTemplateEmail(input: {
  userId: string;
  templateKey: string;
  vars?: Record<string, string | number | null | undefined>;
  campaignKey?: string | null;
  campaignStepIndex?: number | null;
  lessonId?: string | null;
  dayNumber?: number | null;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const emailEnabled = await isEmailEnabled(input.userId);
  if (!emailEnabled) {
    await logEmail({
      userId: input.userId,
      templateKey: input.templateKey,
      status: 'skipped',
      error: 'email_notifications_disabled',
      campaignKey: input.campaignKey ?? null,
      campaignStepIndex: input.campaignStepIndex ?? null,
      lessonId: input.lessonId ?? null,
      dayNumber: input.dayNumber ?? null,
    });
    return { ok: true, skipped: true };
  }

  const template = await getTemplate(input.templateKey);
  if (!template || !template.is_active) {
    return { ok: false, error: 'Template not found or inactive' };
  }

  const toEmail = await getUserEmail(input.userId);
  if (!toEmail) return { ok: false, error: 'User email not found' };

  const lang = await getUserLang(input.userId);

  const subjectRaw = lang === 'en' ? template.subject_en : template.subject_ru;
  const bodyRaw = lang === 'en' ? template.body_en : template.body_ru;
  const ctaTextRaw = lang === 'en' ? template.cta_text_en : template.cta_text_ru;

  const vars = input.vars || {};
  const subject = renderPlaceholders(subjectRaw, vars);
  const bodyText = renderPlaceholders(bodyRaw, vars);

  const ctaEnabled = !!template.cta_enabled && !!template.cta_url_template;
  const ctaUrl = ctaEnabled ? renderPlaceholders(template.cta_url_template!, vars) : null;
  const ctaText = ctaEnabled ? renderPlaceholders(ctaTextRaw || '', vars) : null;

  if (!process.env.RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY not configured' };
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'FaloClaro <noreply@faloclaro.com>';

  try {
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    let html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111; max-width: 640px; margin: 0 auto; padding: 20px;">
        <div style="white-space: pre-line;">${escapeHtml(bodyText)}</div>
        ${
          ctaEnabled && ctaUrl
            ? `<div style="margin-top: 24px;">
                 <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">
                   ${escapeHtml(ctaText || '')}
                 </a>
               </div>`
            : ''
        }
      </div>
    `;

    // Weekly stats: nicer layout
    if (input.templateKey === 'core_weekly_stats') {
      const topics = String(vars.weekly_topics || '')
        .split(';')
        .map((x) => x.trim())
        .filter(Boolean);
      html = buildWeeklyStatsHtml({
        title: subject,
        lessonsCompleted: Number(vars.weekly_lessons_completed || 0),
        totalWordsLearned: Number(vars.total_words_learned || 0),
        topics,
        footerText: bodyText.split('\n').slice(-1)[0] || bodyText,
        ctaUrl: ctaEnabled ? ctaUrl : null,
        ctaText: ctaEnabled ? ctaText : null,
      });
    }

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject,
      html,
      text: bodyText + (ctaEnabled && ctaUrl ? `\n\n${ctaText || ''}: ${ctaUrl}` : ''),
    });

    if (error) {
      await logEmail({
        userId: input.userId,
        templateKey: input.templateKey,
        status: 'failed',
        error: error.message || 'resend_failed',
        campaignKey: input.campaignKey ?? null,
        campaignStepIndex: input.campaignStepIndex ?? null,
        lessonId: input.lessonId ?? null,
        dayNumber: input.dayNumber ?? null,
      });
      return { ok: false, error: error.message || 'Failed to send' };
    }

    await logEmail({
      userId: input.userId,
      templateKey: input.templateKey,
      status: 'sent',
      error: null,
      campaignKey: input.campaignKey ?? null,
      campaignStepIndex: input.campaignStepIndex ?? null,
      lessonId: input.lessonId ?? null,
      dayNumber: input.dayNumber ?? null,
    });
    return { ok: true };
  } catch (e: any) {
    await logEmail({
      userId: input.userId,
      templateKey: input.templateKey,
      status: 'failed',
      error: e?.message || 'send_failed',
      campaignKey: input.campaignKey ?? null,
      campaignStepIndex: input.campaignStepIndex ?? null,
      lessonId: input.lessonId ?? null,
      dayNumber: input.dayNumber ?? null,
    });
    return { ok: false, error: e?.message || 'send_failed' };
  }
}

async function logEmail(input: {
  userId: string;
  templateKey: string;
  status: 'sent' | 'skipped' | 'failed';
  error: string | null;
  campaignKey: string | null;
  campaignStepIndex: number | null;
  lessonId: string | null;
  dayNumber: number | null;
}) {
  const supabase = getSupabaseAdmin();
  await supabase.from('email_logs').insert({
    user_id: input.userId,
    lesson_id: input.lessonId,
    day_number: input.dayNumber ?? 0,
    email_type: input.campaignKey ? 'campaign' : 'event',
    template_key: input.templateKey,
    campaign_key: input.campaignKey,
    campaign_step_index: input.campaignStepIndex,
    status: input.status,
    error: input.error,
  });
}

export async function enrollCampaign(input: {
  userId: string;
  campaignKey: string;
  context?: any;
  startAt?: Date; // if not provided -> now + first step delay
}) {
  const supabase = getSupabaseAdmin();
  const steps = await getCampaignSteps(input.campaignKey);
  if (!steps.length) throw new Error('Campaign has no steps');
  const first = steps[0];
  const base = input.startAt ?? addHours(new Date(), first.delay_hours);
  const { error } = await supabase
    .from('email_enrollments')
    .upsert(
      {
        user_id: input.userId,
        campaign_key: input.campaignKey,
        status: 'active',
        current_step_index: 1,
        enrolled_at: nowIso(),
        next_send_at: base.toISOString(),
        context: input.context || {},
        updated_at: nowIso(),
      },
      { onConflict: 'user_id,campaign_key' }
    );
  if (error) throw error;
}

export async function stopCampaign(input: { userId: string; campaignKey: string }) {
  const supabase = getSupabaseAdmin();
  await supabase
    .from('email_enrollments')
    .update({ status: 'stopped', updated_at: nowIso() })
    .eq('user_id', input.userId)
    .eq('campaign_key', input.campaignKey);
}

async function isActivitySinceEnroll(userId: string, enrolledAtIso: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from('subscription_users')
    .select('last_learning_activity_at')
    .eq('id', userId)
    .limit(1)
    .maybeSingle();
  const last = (user as any)?.last_learning_activity_at;
  if (!last) return false;
  return new Date(last).getTime() > new Date(enrolledAtIso).getTime();
}

export async function runDispatcherOnce(limit = 50): Promise<{ processed: number; sent: number; stopped: number; skipped: number; failed: number }> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: rows } = await supabase
    .from('email_enrollments')
    .select('id, user_id, campaign_key, status, current_step_index, enrolled_at, next_send_at, context')
    .eq('status', 'active')
    .lte('next_send_at', now)
    .order('next_send_at', { ascending: true })
    .limit(limit);

  const due = (rows as any as EnrollmentRow[]) || [];
  let sent = 0;
  let stopped = 0;
  let skipped = 0;
  let failed = 0;

  for (const enr of due) {
    const steps = await getCampaignSteps(enr.campaign_key);
    const step = steps.find((s) => s.step_index === enr.current_step_index);
    if (!step) {
      await supabase.from('email_enrollments').update({ status: 'completed', updated_at: nowIso() }).eq('id', enr.id);
      continue;
    }

    const stopConds = step.stop_conditions || {};
    if (stopConds.stop_on_email_off) {
      const enabled = await isEmailEnabled(enr.user_id);
      if (!enabled) {
        await supabase.from('email_enrollments').update({ status: 'stopped', updated_at: nowIso() }).eq('id', enr.id);
        stopped++;
        continue;
      }
    }

    if (stopConds.stop_on_paid) {
      const paid = await hasPaidAccess(enr.user_id);
      if (paid) {
        await supabase.from('email_enrollments').update({ status: 'stopped', updated_at: nowIso() }).eq('id', enr.id);
        stopped++;
        continue;
      }
    }

    if (stopConds.stop_on_activity) {
      const active = await isActivitySinceEnroll(enr.user_id, enr.enrolled_at);
      if (active) {
        await supabase.from('email_enrollments').update({ status: 'stopped', updated_at: nowIso() }).eq('id', enr.id);
        stopped++;
        continue;
      }
    }

    // Build standard vars
    const { intro_url: introUrl, payment_url: paymentUrl } = await buildDefaultVarsForUser(enr.user_id);

    const vars: Record<string, any> = {
      intro_url: introUrl,
      payment_url: paymentUrl,
      ...(enr.context || {}),
    };

    // Weekly stats enrichment
    if (step.template_key === 'core_weekly_stats') {
      const stats = await computeWeeklyStats(enr.user_id);
      vars.weekly_lessons_completed = stats.weeklyLessonsCompleted;
      vars.weekly_topics = stats.weeklyTopics || (await (async () => {
        const lang = await getUserLang(enr.user_id);
        return lang === 'en' ? 'No completed lessons this week' : 'Нет завершённых уроков за неделю';
      })());
      vars.total_words_learned = stats.totalWordsLearned;
    }

    const res = await sendTemplateEmail({
      userId: enr.user_id,
      templateKey: step.template_key,
      vars,
      campaignKey: enr.campaign_key,
      campaignStepIndex: step.step_index,
      dayNumber: 0,
    });

    if (res.skipped) skipped++;
    else if (!res.ok) failed++;
    else sent++;

    // move to next step
    const nextIndex = enr.current_step_index + 1;
    const nextStep = steps.find((s) => s.step_index === nextIndex);
    if (!nextStep) {
      const repeat = !!(step.stop_conditions || {})?.repeat;
      const repeatDelayHours = Number((step.stop_conditions || {})?.repeat_delay_hours || 168);
      if (repeat) {
        const nextAt = addHours(new Date(), Number.isFinite(repeatDelayHours) ? repeatDelayHours : 168).toISOString();
        await supabase
          .from('email_enrollments')
          .update({ current_step_index: 1, next_send_at: nextAt, updated_at: nowIso() })
          .eq('id', enr.id);
      } else {
        await supabase.from('email_enrollments').update({ status: 'completed', updated_at: nowIso() }).eq('id', enr.id);
      }
    } else {
      const nextAt = addHours(new Date(), nextStep.delay_hours).toISOString();
      await supabase
        .from('email_enrollments')
        .update({ current_step_index: nextIndex, next_send_at: nextAt, updated_at: nowIso() })
        .eq('id', enr.id);
    }
  }

  return { processed: due.length, sent, stopped, skipped, failed };
}

export async function markLearningActivityByToken(lessonToken: string) {
  const supabase = getSupabaseAdmin();
  const { data: tokenRow } = await supabase
    .from('lesson_access_tokens')
    .select('user_id')
    .eq('token', lessonToken)
    .limit(1)
    .maybeSingle();
  if (!tokenRow?.user_id) return;
  await supabase.from('subscription_users').update({ last_learning_activity_at: nowIso() }).eq('id', tokenRow.user_id);
}

export async function computeWeeklyStats(userId: string): Promise<{ weeklyLessonsCompleted: number; weeklyTopics: string; totalWordsLearned: number }> {
  const supabase = getSupabaseAdmin();
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceIso = since.toISOString();

  const { data: progressRows } = await supabase
    .from('user_progress')
    .select('lesson_id, day_number, status, completed_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('completed_at', sinceIso);
  const completed = (progressRows as any[]) || [];
  const weeklyLessonsCompleted = completed.length;

  const lessonIds = completed.map((r) => r.lesson_id).filter(Boolean);
  let weeklyTopics = '';
  if (lessonIds.length) {
    const { data: lessons } = await supabase.from('lessons').select('id, day_number, title_ru, title_en').in('id', lessonIds);
    const lang = await getUserLang(userId);
    weeklyTopics = ((lessons as any[]) || [])
      .sort((a, b) => (a.day_number || 0) - (b.day_number || 0))
      .map((l) => `Урок ${l.day_number}: ${lang === 'en' ? l.title_en : l.title_ru}`)
      .join('; ');
  }

  // Total words learned: sum Task 1 vocabulary card count for completed lessons
  const { data: allCompleted } = await supabase
    .from('user_progress')
    .select('lesson_id')
    .eq('user_id', userId)
    .eq('status', 'completed');
  const allLessonIds = ((allCompleted as any[]) || []).map((r) => r.lesson_id).filter(Boolean);
  let totalWordsLearned = 0;
  if (allLessonIds.length) {
    const { data: lessons } = await supabase.from('lessons').select('id, yaml_content').in('id', allLessonIds);
    for (const l of (lessons as any[]) || []) {
      const parsed = parseLessonYamlContent(l.yaml_content);
      const tasks = parsed?.tasks || parsed?.day?.tasks || [];
      const vocab = (Array.isArray(tasks) ? tasks : []).find((t: any) => t?.type === 'vocabulary' || t?.task_id === 1);
      const cards = extractTask1Cards(vocab);
      totalWordsLearned += Array.isArray(cards) ? cards.length : 0;
    }
  }

  return { weeklyLessonsCompleted, weeklyTopics, totalWordsLearned };
}


