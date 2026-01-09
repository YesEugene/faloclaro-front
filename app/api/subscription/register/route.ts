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
      .select('id, email')
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
      
      const { data: insertedToken, error: tokenError } = await supabase
        .from('lesson_access_tokens')
        .insert({
          user_id: user.id,
          lesson_id: lesson.id,
          token,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (tokenError) {
        console.error(`❌ Error creating token for lesson ${lesson.day_number}:`, tokenError);
        // Continue with other lessons even if one fails
      } else {
        // Use the token from database (may differ from generated one if duplicate)
        const savedToken = insertedToken?.token || token;
        tokens.push(savedToken);
        console.log(`✅ Token created for lesson ${lesson.day_number}:`, {
          tokenId: insertedToken?.id,
          token: savedToken?.substring(0, 8) + '...',
          lessonId: lesson.id,
          dayNumber: lesson.day_number,
        });
      }
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
    const { data: verifyToken, error: verifyError } = await supabase
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

    // Send email with link to lessons page
    // IMPORTANT: In Vercel Serverless Functions, we need to await the email
    // Otherwise the function may terminate before email is sent
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.faloclaro.com';
    const emailUrl = `${baseUrl}/pt/lesson/1/${firstToken}/overview`;
    
    console.log('📧 About to send email:', {
      userId: user.id,
      userEmail: normalizedEmail, // Use normalizedEmail from request
      lessonIds: lessons.map(l => l.id),
      dayNumbers: lessons.map(l => l.day_number),
      firstToken: firstToken?.substring(0, 8) + '...',
      tokenCount: tokens.length,
      emailUrl,
      baseUrl,
    });
    
    try {
      // Send email with link to lessons page
      // Use dayNumber = 1 for registration email (always registration email)
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

