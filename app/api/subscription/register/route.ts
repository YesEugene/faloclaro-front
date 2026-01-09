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

    // Get first 3 lessons (days 1, 2, 3) - free access
    const { data: lessons, error: lessonsError } = await supabase
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
      const token = crypto.randomBytes(32).toString('hex');
      tokens.push(token);

      const { error: tokenError } = await supabase
        .from('lesson_access_tokens')
        .insert({
          user_id: user.id,
          lesson_id: lesson.id,
          token,
          expires_at: expiresAt.toISOString(),
        });

      if (tokenError) {
        console.error(`Error creating token for lesson ${lesson.day_number}:`, tokenError);
        // Continue with other lessons even if one fails
      }
    }

    // Send email with link to lessons page
    // IMPORTANT: In Vercel Serverless Functions, we need to await the email
    // Otherwise the function may terminate before email is sent
    const firstToken = tokens[0]; // Use first token for email link
    console.log('About to send email:', {
      userId: user.id,
      lessonIds: lessons.map(l => l.id),
      dayNumbers: lessons.map(l => l.day_number),
    });
    
    try {
      // Send email with link to lessons page
      const emailResult = await sendLessonEmail(user.id, lessons[0].id, 1, firstToken);
      
      console.log('Email send completed:', {
        success: emailResult.success,
        emailId: emailResult.emailId,
        error: emailResult.error,
      });
      
      if (!emailResult.success) {
        console.error('Email sending failed:', emailResult.error);
        // Don't fail registration if email fails, but log it
      }
    } catch (emailError) {
      console.error('Exception during email send:', emailError);
      // Don't fail registration if email fails
    }

    // Log email attempt (even if it failed)
    await supabase
      .from('email_logs')
      .insert({
        user_id: user.id,
        lesson_id: lessons[0].id,
        day_number: 1,
        email_type: 'lesson',
      });

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

