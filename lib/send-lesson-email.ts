/**
 * Shared function for sending lesson emails
 * Can be called directly from other API routes without HTTP fetch
 */

import { supabase } from './supabase';
import crypto from 'crypto';

export async function sendLessonEmail(userId: string, lessonId: string, dayNumber: number, token?: string) {
  console.log('=== sendLessonEmail CALLED ===', {
    userId,
    lessonId,
    dayNumber,
    timestamp: new Date().toISOString(),
  });

  try {
    // Get user
    const { data: user, error: userError } = await supabase
      .from('subscription_users')
      .select('email, language_preference')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return { success: false, error: 'User not found' };
    }

    // Get lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      console.error('Error fetching lesson:', lessonError);
      return { success: false, error: 'Lesson not found' };
    }

    // Use provided token or get/create access token
    let accessToken: string;
    
    if (token) {
      // Use provided token (for registration with multiple lessons)
      accessToken = token;
    } else {
      // Create or get access token for this specific lesson
      let { data: tokenData, error: tokenError } = await supabase
        .from('lesson_access_tokens')
        .select('token')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .single();

      if (tokenError && tokenError.code === 'PGRST116') {
        // Create new token
        const newToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 365); // 1 year

        const { error: createError } = await supabase
          .from('lesson_access_tokens')
          .insert({
            user_id: userId,
            lesson_id: lessonId,
            token: newToken,
            expires_at: expiresAt.toISOString(),
          });

        if (createError) {
          throw createError;
        }

        tokenData = { token: newToken };
      } else if (tokenError) {
        throw tokenError;
      }

      if (!tokenData || !tokenData.token) {
        return { success: false, error: 'Failed to create access token' };
      }

      accessToken = tokenData.token;
    }

    // For registration email (first lesson with dayNumber === 1), link directly to lesson 1 overview
    // This page shows the overview of lesson 1 with navigation to all lessons (first 3 unlocked)
    // For other lessons, link to specific lesson overview
    const isRegistrationEmail = dayNumber === 1; // Registration email is always for day 1
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.faloclaro.com';
    const lessonsUrl = isRegistrationEmail
      ? `${baseUrl}/pt/lesson/1/${accessToken}/overview`
      : `${baseUrl}/pt/lesson/${dayNumber}/${accessToken}/overview`;

    console.log('📧 Email link generation:', {
      isRegistrationEmail,
      dayNumber,
      lessonDayNumber: lesson.day_number,
      accessToken: accessToken ? `${accessToken.substring(0, 8)}...` : 'MISSING',
      lessonsUrl,
      baseUrl,
    });

    // Validate token exists
    if (!accessToken || accessToken.length < 10) {
      console.error('❌ Invalid access token:', { accessToken, tokenLength: accessToken?.length });
      return { success: false, error: 'Invalid access token' };
    }

    // Send email via Resend
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured. Email not sent.');
      return { success: false, error: 'Resend not configured' };
    }

    console.log('Starting email send:', {
      userId,
      lessonId,
      dayNumber,
      lessonDayNumber: lesson.day_number,
      userEmail: user.email,
      hasResendKey: !!process.env.RESEND_API_KEY,
      resendKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 5) + '...',
      lessonsUrl,
    });

    try {
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      const emailContent = getEmailContent(lesson, user.language_preference, lessonsUrl);
      
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'FaloClaro <noreply@faloclaro.com>';
      
      console.log('Sending email via Resend:', {
        from: fromEmail,
        to: user.email,
        subject: emailContent.subject,
        lessonsUrl,
      });
      
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      if (error) {
        console.error('Resend API error:', {
          error,
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
        return { success: false, error: error.message || 'Failed to send email' };
      }

      console.log('Email sent successfully via Resend:', {
        emailId: data?.id,
        to: user.email,
        from: fromEmail,
      });

      // Log email sent
      const { error: logError } = await supabase
        .from('email_logs')
        .insert({
          user_id: userId,
          lesson_id: lessonId,
          day_number: dayNumber,
          email_type: 'lesson',
        });

      if (logError) {
        console.error('Error logging email:', logError);
      }

      return { success: true, emailId: data?.id, lessonsUrl };
    } catch (err) {
      console.error('Exception sending email:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        name: err instanceof Error ? err.name : undefined,
      });
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  } catch (error) {
    console.error('Error in sendLessonEmail:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Generate email content based on language
 */
function getEmailContent(lesson: any, language: string, lessonsUrl: string) {
  const dayInfo = lesson.yaml_content?.day || {};
  const emailInfo = lesson.yaml_content?.email || {};

  const translations = {
    ru: {
      subject: emailInfo.subject || `День ${lesson.day_number} из 60 — новый урок`,
      preview: emailInfo.preview || 'Короткий урок португальского',
      greeting: 'Привет!',
      message: `Сегодня у тебя новый урок: ${dayInfo.title || ''}`,
      cta: 'Начать урок',
      footer: 'Удачи в изучении португальского!',
    },
    en: {
      subject: emailInfo.subject || `Day ${lesson.day_number} of 60 — new lesson`,
      preview: emailInfo.preview || 'Short Portuguese lesson',
      greeting: 'Hello!',
      message: `Today you have a new lesson: ${dayInfo.title_en || dayInfo.title || ''}`,
      cta: 'Start lesson',
      footer: 'Good luck learning Portuguese!',
    },
    pt: {
      subject: emailInfo.subject || `Dia ${lesson.day_number} de 60 — nova lição`,
      preview: emailInfo.preview || 'Lição curta de português',
      greeting: 'Olá!',
      message: `Hoje tens uma nova lição: ${dayInfo.title_pt || dayInfo.title || ''}`,
      cta: 'Começar lição',
      footer: 'Boa sorte a aprender português!',
    },
  };

      const t = translations[language as keyof typeof translations] || translations.en;

  // Update message for registration email (first 3 lessons unlocked)
  // Registration email is for day 1 - check if day_number is 1
  const isRegistrationEmail = lesson.day_number === 1;
  const message = isRegistrationEmail 
    ? (language === 'ru' 
        ? 'Ты получил доступ к первым 3 урокам бесплатно. Остальные уроки доступны после оплаты.'
        : language === 'en'
        ? 'You got access to the first 3 lessons for free. The rest of the lessons are available after payment.'
        : 'Tens acesso às primeiras 3 lições grátis. O resto das lições está disponível após pagamento.')
    : t.message;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">${t.greeting}</h1>
        <p>${message}</p>
        <p style="color: #666;">${t.preview}</p>
        <div style="margin: 30px 0;">
          <a href="${lessonsUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            ${t.cta}
          </a>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">${t.footer}</p>
      </body>
    </html>
  `;

  const text = `
${t.greeting}

${message}

${t.preview}

${t.cta}: ${lessonsUrl}

${t.footer}
  `;

  return {
    subject: t.subject,
    html,
    text,
  };
}

