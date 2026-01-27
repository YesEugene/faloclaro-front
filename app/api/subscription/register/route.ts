import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { buildDefaultVarsForUser, enrollCampaign, sendTemplateEmail } from '@/lib/email-engine';

export async function POST(request: NextRequest) {
  try {
    const { email, language } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    const admin = getSupabaseAdmin();

    // Get or create user
    let { data: user, error: userError } = await admin
      .from('subscription_users')
      .select('id, email, language_preference')
      .eq('email', normalizedEmail)
      .single();

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create new
      const { data: newUser, error: createError } = await admin
        .from('subscription_users')
        .insert({
          email: normalizedEmail,
          language_preference: language || 'ru',
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }

      user = newUser;
    } else if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json(
        { error: 'Failed to process request' },
        { status: 500 }
      );
    } else if (user && language) {
      // User exists, update language preference if provided
      const { error: updateError } = await admin
        .from('subscription_users')
        .update({ language_preference: language })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating language preference:', updateError);
        // Don't fail registration if language update fails
      } else {
        console.log('Language preference updated:', { userId: user.id, language });
        // Update user object with new language
        user.language_preference = language;
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 500 }
      );
    }

    // Ensure registered_at is set (requires service role because subscription_users has no public update policy)
    try {
      await admin
        .from('subscription_users')
        .update({ registered_at: new Date().toISOString() })
        .eq('id', user.id);
    } catch (e) {
      // don't block registration if this fails
      console.warn('Failed to set registered_at (non-blocking)');
    }

    // Check or create subscription
    let { data: subscription, error: subError } = await admin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subError && subError.code === 'PGRST116') {
      // No subscription, create trial
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 3);

      const { data: newSub, error: createSubError } = await admin
        .from('subscriptions')
        .insert({
          user_id: user.id,
          status: 'trial',
          trial_started_at: new Date().toISOString(),
          trial_ends_at: trialEndsAt.toISOString(),
        })
        .select()
        .single();

      if (createSubError) {
        console.error('Error creating subscription:', createSubError);
        return NextResponse.json(
          { error: 'Failed to create subscription' },
          { status: 500 }
        );
      }

      subscription = newSub;
    } else if (subError) {
      console.error('Error fetching subscription:', subError);
      return NextResponse.json(
        { error: 'Failed to process request' },
        { status: 500 }
      );
    }

    // Get first 3 lessons (days 1, 2, 3) - free access
    const { data: lessons, error: lessonsError } = await admin
      .from('lessons')
      .select('*')
      .in('day_number', [1, 2, 3])
      .order('day_number', { ascending: true });

    if (lessonsError || !lessons || lessons.length === 0) {
      console.error('Error fetching lessons:', lessonsError);
      return NextResponse.json(
        { error: 'Lessons not found' },
        { status: 500 }
      );
    }

    // Create access tokens for first 3 lessons
    const tokens: string[] = [];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 365); // Token valid for 1 year

    for (const lesson of lessons) {
      // Reuse existing token if already created (avoid duplicates)
      const { data: existing, error: existingError } = await admin
        .from('lesson_access_tokens')
        .select('id, token')
        .eq('user_id', user.id)
        .eq('lesson_id', lesson.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!existingError && existing?.token) {
        tokens.push(existing.token);
        continue;
      }

      const token = crypto.randomBytes(32).toString('hex');
      const { data: inserted, error: tokenError } = await admin
        .from('lesson_access_tokens')
        .insert({
          user_id: user.id,
          lesson_id: lesson.id,
          token,
          expires_at: expiresAt.toISOString(),
        })
        .select('id, token')
        .limit(1)
        .maybeSingle();

      if (tokenError || !inserted?.token) {
        console.error(`❌ Error creating token for lesson ${lesson.day_number}:`, tokenError);
        continue;
      }

      tokens.push(inserted.token);
    }

    // Validate that at least first token was created and saved
    if (tokens.length === 0 || !tokens[0]) {
      console.error('❌ No tokens created for lessons');
      return NextResponse.json(
        { error: 'Failed to create access tokens' },
        { status: 500 }
      );
    }

    // Verify first token exists in database before sending email
    const firstToken = tokens[0];
    const { data: verifyToken, error: verifyError } = await admin
      .from('lesson_access_tokens')
      .select('id, token, lesson_id, user_id')
      .eq('token', firstToken)
      .eq('user_id', user.id)
      .single();

    if (verifyError || !verifyToken) {
      console.error('❌ Token verification failed:', verifyError);
      return NextResponse.json(
        { error: 'Failed to verify access token' },
        { status: 500 }
      );
    }

    console.log('✅ Token verified in database:', {
      tokenId: verifyToken.id,
      token: verifyToken.token?.substring(0, 8) + '...',
      lessonId: verifyToken.lesson_id,
      userId: verifyToken.user_id,
    });

    // Welcome email from DB template + enroll campaigns
    try {
      const vars = await buildDefaultVarsForUser(user.id);
      await sendTemplateEmail({
        userId: user.id,
        templateKey: 'core_welcome',
        vars,
        dayNumber: 1,
        lessonId: lessons[0]?.id || null,
      });
      // enroll inactivity reminders + weekly stats
      await enrollCampaign({ userId: user.id, campaignKey: 'campaign_neg_inactivity', context: {} });
      await enrollCampaign({ userId: user.id, campaignKey: 'campaign_core_weekly_stats', context: {} });
    } catch (e) {
      console.warn('Email engine failed (non-blocking):', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      // In development, return token for testing
      ...(process.env.NODE_ENV === 'development' && { 
        token: firstToken, 
        lessonsUrl: `/pt/lessons?token=${firstToken}` 
      }),
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

