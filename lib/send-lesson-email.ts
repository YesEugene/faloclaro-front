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
    // Get user (select * to stay compatible with optional settings columns)
    const { data: user, error: userError } = await supabase
      .from('subscription_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return { success: false, error: 'User not found' };
    }

    // Optional: allow users to disable emails globally
    if ((user as any)?.email_notifications_enabled === false) {
      console.log('📭 Email notifications disabled for user. Skipping send.', { userId });
      return { success: true, skipped: true };
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

    // IMPORTANT: Use lesson.day_number from database, not dayNumber parameter (which might be incorrect)
    // We always land users on the Intro (onboarding) page first.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.faloclaro.com';
    // Use lesson.day_number from database to ensure correct URL
    const lessonDayNumber = lesson.day_number || dayNumber;
    const lessonsUrl = `${baseUrl}/pt/intro?day=${lessonDayNumber}&token=${accessToken}`;

    console.log('📧 Email link generation:', {
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

  // Registration email is for day 1
  const isRegistrationEmail = lesson.day_number === 1;

  if (isRegistrationEmail) {
    // Welcome email content
    const welcomeTranslations = {
      ru: {
        subject: 'Добро пожаловать в FaloClaro. Начнем!',
        greeting: 'Привет!',
        intro: 'Это Ye из FaloClaro!',
        body: `Спасибо, что зарегистрировались и начали свои первые три дня.
Мне очень приятно, что вы решили попробовать этот способ изучения португальского.

Давайте я расскажу, как устроен курс и как получить от него максимум.

Каждый день, это короткий урок из пяти частей.
Он сделан лёгким по ощущению, но это не значит, что его нужно проходить на скорости.

Не спешите.

Первый блок каждого урока — это словарь.
Здесь вы собираете слова, которые будете использовать дальше в этом же уроке.
Мы рекомендуем уделить этому около 10 минут.
В углу экрана вы увидите таймер, используйте его как ориентир, а не как давление.

Если какие-то слова вам уже знакомы, отлично, можно идти дальше.
Если нет — повторяйте, слушайте ещё раз, дайте им уложиться.

Все следующие задания в уроке строятся именно на этих словах.
К концу урока цель не просто узнавать слова, а уметь собирать из них живые фразы.

Уроки специально сделаны короткими.
Это позволяет встроить их в обычный день, но важно не превращать их в пролистывание.
Оставайтесь в задании до тех пор, пока вы действительно не почувствуете, что понимаете, что происходит.

Именно так язык начинает закрепляться.

Ещё раз спасибо, что вы здесь.
Надеюсь, эти три урока дадут вам настоящее ощущение того, как спокойно и естественно можно учить португальский.

Приятного обучения
и добро пожаловать в FaloClaro 🇵🇹`,
        cta: 'Начать урок',
      },
      en: {
        subject: 'Welcome to FaloClaro. Let\'s start.',
        greeting: 'Hi,',
        intro: 'This is Ye from FaloClaro.',
        body: `Thank you for signing up and starting your first three days with us.
I'm really glad you decided to try this way of learning Portuguese.

Let me quickly explain how the course works and how to get the most out of it.

Each day is a short lesson made of five parts.
It feels light and simple, but that doesn't mean you should rush through it.

Take your time.

The first block of every lesson is vocabulary.
This is where you build the set of words you will use in the rest of that lesson.
We recommend spending about 10 minutes here.
You will see a timer in the corner of the screen. Use it as a guide, not as pressure.

If you already know some of the words, great, you can move on.
If not, listen again, repeat them, and let them settle.

All the following tasks in the lesson are built from these words.
By the end of the lesson, the goal is not just to recognize them, but to turn them into real phrases.

The lessons are intentionally short.
They are designed to fit into a normal day, but it's important not to treat them like something to scroll through.
Stay with each task until you truly feel you understand what is happening.

That is how the language starts to stick.

Thank you again for being here.
I hope these three lessons give you a real sense of how calm and natural learning Portuguese can be.

Enjoy your learning,
and welcome to FaloClaro 🇵🇹`,
        cta: 'Start lesson',
      },
      pt: {
        subject: 'Bem-vindo ao FaloClaro. Vamos começar.',
        greeting: 'Olá,',
        intro: 'Sou o Ye do FaloClaro.',
        body: `Obrigado por te registares e começares os teus primeiros três dias connosco.
Fico muito feliz por teres decidido experimentar esta forma de aprender português.

Deixa-me explicar rapidamente como funciona o curso e como tirar o máximo proveito dele.

Cada dia é uma lição curta composta por cinco partes.
Parece leve e simples, mas isso não significa que deves passar por ela com pressa.

Toma o teu tempo.

O primeiro bloco de cada lição é vocabulário.
É aqui que constróis o conjunto de palavras que usarás no resto dessa lição.
Recomendamos passar cerca de 10 minutos aqui.
Verás um temporizador no canto do ecrã. Usa-o como guia, não como pressão.

Se já conheces algumas das palavras, ótimo, podes avançar.
Se não, ouve novamente, repete-as e deixa-as assentar.

Todas as tarefas seguintes na lição são construídas a partir destas palavras.
No final da lição, o objetivo não é apenas reconhecê-las, mas transformá-las em frases reais.

As lições são intencionalmente curtas.
Foram concebidas para caber num dia normal, mas é importante não as tratar como algo para percorrer rapidamente.
Fica com cada tarefa até sentires verdadeiramente que compreendes o que está a acontecer.

É assim que a língua começa a fixar-se.

Obrigado novamente por estares aqui.
Espero que estas três lições te dêem uma sensação real de como aprender português pode ser calmo e natural.

Aproveita a tua aprendizagem,
e bem-vindo ao FaloClaro 🇵🇹`,
        cta: 'Começar lição',
      },
    };

    const t = welcomeTranslations[language as keyof typeof welcomeTranslations] || welcomeTranslations.en;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #3A2E1F; font-size: 24px; margin-bottom: 20px; font-weight: 600;">${t.subject}</h1>
            <p style="font-size: 16px; margin-bottom: 10px;">${t.greeting}</p>
            <p style="font-size: 16px; margin-bottom: 20px;">${t.intro}</p>
            <div style="font-size: 15px; line-height: 1.8; color: #4b5563; margin-bottom: 30px; white-space: pre-line;">${t.body}</div>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${lessonsUrl}" style="background-color: #45C240; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
                ${t.cta}
              </a>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
${t.subject}

${t.greeting}
${t.intro}

${t.body}

${t.cta}: ${lessonsUrl}
    `;

    return {
      subject: t.subject,
      html,
      text,
    };
  }

  // Regular lesson email (not registration)
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

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">${t.greeting}</h1>
        <p>${t.message}</p>
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

${t.message}

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
    // Get user (select * to stay compatible with optional settings columns)
    const { data: user, error: userError } = await supabase
      .from('subscription_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return { success: false, error: 'User not found' };
    }

    // Optional: allow users to disable emails globally
    if ((user as any)?.email_notifications_enabled === false) {
      console.log('📭 Email notifications disabled for user. Skipping send.', { userId });
      return { success: true, skipped: true };
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
    const lessonsUrl = `${baseUrl}/pt/intro?day=1&token=${token}`;

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

