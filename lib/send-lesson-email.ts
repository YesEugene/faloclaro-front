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
    // IMPORTANT: Use lesson.day_number from database, not dayNumber parameter (which might be incorrect)
    const isRegistrationEmail = dayNumber === 1; // Registration email is always for day 1
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.faloclaro.com';
    // Use lesson.day_number from database to ensure correct URL
    const lessonDayNumber = lesson.day_number || dayNumber;
    const lessonsUrl = isRegistrationEmail
      ? `${baseUrl}/pt/lesson/${lessonDayNumber}/${accessToken}/overview`
      : `${baseUrl}/pt/lesson/${lessonDayNumber}/${accessToken}/overview`;

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

/**
 * Send email about full access granted to all lessons
 */
export async function sendFullAccessEmail(userId: string, token: string) {
  console.log('=== sendFullAccessEmail CALLED ===', {
    userId,
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

    // Get first lesson for URL
    const { data: firstLesson } = await supabase
      .from('lessons')
      .select('id, day_number')
      .eq('day_number', 1)
      .single();

    if (!firstLesson) {
      return { success: false, error: 'First lesson not found' };
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.faloclaro.com';
    const lessonsUrl = `${baseUrl}/pt/lesson/1/${token}/overview`;

    // Validate token exists
    if (!token || token.length < 10) {
      console.error('❌ Invalid access token:', { token, tokenLength: token?.length });
      return { success: false, error: 'Invalid access token' };
    }

    // Send email via Resend
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured. Email not sent.');
      return { success: false, error: 'Resend not configured' };
    }

    const emailContent = getFullAccessEmailContent(user.language_preference, lessonsUrl);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'FaloClaro <noreply@faloclaro.com>';

    console.log('Sending full access email via Resend:', {
      from: fromEmail,
      to: user.email,
      subject: emailContent.subject,
      lessonsUrl,
    });

    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    if (error) {
      console.error('Resend API error:', error);
      return { success: false, error: error.message || 'Failed to send email' };
    }

    console.log('Full access email sent successfully:', {
      emailId: data?.id,
      to: user.email,
    });

    return { success: true, emailId: data?.id, lessonsUrl };
  } catch (error) {
    console.error('Error in sendFullAccessEmail:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Generate email content for full access notification
 */
function getFullAccessEmailContent(language: string, lessonsUrl: string) {
  const translations = {
    ru: {
      subject: '🎉 Полный доступ к курсу открыт!',
      greeting: 'Привет! 👋',
      message: 'Отлично! Тебе открыт полный доступ ко всем 60 урокам курса португальского! 🚀',
      details: 'Ты можешь учиться в своем темпе, проходить уроки в любом порядке (хотя мы рекомендуем по порядку 😉) и возвращаться к пройденным материалам когда захочешь.',
      motivation: 'Ты уже сделал важный шаг! Теперь осталось только практиковаться. Удачи! 🎓',
      cta: 'Начать учиться',
      footer: 'Удачи в изучении португальского! 🇵🇹✨',
    },
    en: {
      subject: '🎉 Full Course Access Unlocked!',
      greeting: 'Hello! 👋',
      message: 'Awesome! You now have full access to all 60 lessons of the Portuguese course! 🚀',
      details: 'You can learn at your own pace, go through lessons in any order (though we recommend following the sequence 😉), and revisit completed materials whenever you want.',
      motivation: 'You\'ve already taken the important step! Now all that\'s left is to practice. Good luck! 🎓',
      cta: 'Start Learning',
      footer: 'Good luck learning Portuguese! 🇵🇹✨',
    },
    pt: {
      subject: '🎉 Acesso Completo ao Curso Desbloqueado!',
      greeting: 'Olá! 👋',
      message: 'Excelente! Agora tens acesso completo a todas as 60 lições do curso de português! 🚀',
      details: 'Podes aprender ao teu ritmo, fazer as lições em qualquer ordem (embora recomendemos seguir a sequência 😉), e revisitar materiais completados sempre que quiseres.',
      motivation: 'Já deste o passo importante! Agora só falta praticar. Boa sorte! 🎓',
      cta: 'Começar a Aprender',
      footer: 'Boa sorte a aprender português! 🇵🇹✨',
    },
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #2563eb; font-size: 28px; margin-bottom: 10px;">${t.greeting}</h1>
          <p style="font-size: 18px; margin-bottom: 20px; color: #1f2937;">${t.message}</p>
          <p style="color: #4b5563; margin-bottom: 20px; line-height: 1.8;">${t.details}</p>
          <p style="color: #059669; font-weight: 600; margin-bottom: 30px;">${t.motivation}</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${lessonsUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
              ${t.cta}
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 14px; margin-top: 40px; text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">${t.footer}</p>
        </div>
      </body>
    </html>
  `;

  const text = `
${t.greeting}

${t.message}

${t.details}

${t.motivation}

${t.cta}: ${lessonsUrl}

${t.footer}
  `;

  return {
    subject: t.subject,
    html,
    text,
  };
}

