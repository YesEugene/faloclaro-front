import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';
import { sendLessonEmail } from '@/lib/send-lesson-email';

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

    // Get or create user
    let { data: user, error: userError } = await supabase
      .from('subscription_users')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create new
      const { data: newUser, error: createError } = await supabase
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
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 500 }
      );
    }

    // Check or create subscription
    let { data: subscription, error: subError } = await supabase
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

      const { data: newSub, error: createSubError } = await supabase
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

    // Get first lesson (day 1)
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('day_number', 1)
      .single();

    if (lessonError || !lesson) {
      console.error('Error fetching lesson:', lessonError);
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 500 }
      );
    }

    // Create access token for first lesson
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Token valid for 30 days

    const { error: tokenError } = await supabase
      .from('lesson_access_tokens')
      .insert({
        user_id: user.id,
        lesson_id: lesson.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error('Error creating token:', tokenError);
      return NextResponse.json(
        { error: 'Failed to create access token' },
        { status: 500 }
      );
    }

    // Send email with lesson link (async, don't wait)
    // Call function directly instead of HTTP fetch to avoid connection issues
    sendLessonEmail(user.id, lesson.id, 1)
      .then(result => {
        if (result.success) {
          console.log('Email sent successfully:', result);
        } else {
          console.error('Email sending failed:', result.error);
        }
      })
      .catch(err => {
        console.error('Error sending email (non-blocking):', err);
      });

    // Log email sent
    await supabase
      .from('email_logs')
      .insert({
        user_id: user.id,
        lesson_id: lesson.id,
        day_number: 1,
        email_type: 'lesson',
      });

    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      // In development, return token for testing
      ...(process.env.NODE_ENV === 'development' && { token, lessonUrl: `/pt/lesson/1/${token}` }),
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

