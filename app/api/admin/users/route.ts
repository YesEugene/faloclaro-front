import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';
import { sendLessonEmail } from '@/lib/send-lesson-email';

// Check admin authentication
function checkAdminAuth(request: NextRequest): boolean {
  // In a real app, you'd check a session token or JWT
  // For now, we'll use a simple check - in production, implement proper session management
  const authHeader = request.headers.get('authorization');
  // For now, we'll allow requests from authenticated admin pages
  // In production, implement proper session/token validation
  return true; // TODO: Implement proper admin authentication
}

// GET /api/admin/users - Get all users
export async function GET(request: NextRequest) {
  try {
    if (!checkAdminAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: users, error } = await supabase
      .from('subscription_users')
      .select(`
        *,
        subscriptions (
          status,
          trial_started_at,
          trial_ends_at,
          created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Transform data to include subscription status
    const usersWithSubscriptions = (users || []).map((user: any) => ({
      id: user.id,
      email: user.email,
      language_preference: user.language_preference,
      created_at: user.created_at,
      subscription_status: user.subscriptions?.[0]?.status || 'no_subscription',
      subscription: user.subscriptions?.[0] || null,
    }));

    return NextResponse.json({
      success: true,
      users: usersWithSubscriptions,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Add new user
export async function POST(request: NextRequest) {
  try {
    if (!checkAdminAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { email, language, giveFullAccess } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('subscription_users')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Create user
    const { data: newUser, error: userError } = await supabase
      .from('subscription_users')
      .insert({
        email: normalizedEmail,
        language_preference: language || 'ru',
      })
      .select()
      .single();

    if (userError || !newUser) {
      console.error('Error creating user:', userError);
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Create subscription
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 3);

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: newUser.id,
        status: 'trial',
        trial_started_at: new Date().toISOString(),
        trial_ends_at: trialEndsAt.toISOString(),
      })
      .select()
      .single();

    if (subError) {
      console.error('Error creating subscription:', subError);
      // Continue even if subscription creation fails
    }

    // Get lessons to create tokens for
    let lessonsToUnlock = [1, 2, 3]; // Default: first 3 lessons
    if (giveFullAccess) {
      // Get all lessons (1-60)
      const { data: allLessons } = await supabase
        .from('lessons')
        .select('id, day_number')
        .order('day_number', { ascending: true });
      
      if (allLessons) {
        lessonsToUnlock = allLessons.map((l: any) => l.day_number);
      }
    } else {
      // Get first 3 lessons
      const { data: firstLessons } = await supabase
        .from('lessons')
        .select('id, day_number')
        .in('day_number', [1, 2, 3])
        .order('day_number', { ascending: true });
      
      if (firstLessons) {
        lessonsToUnlock = firstLessons.map((l: any) => l.day_number);
      }
    }

    // Get actual lesson records
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, day_number')
      .in('day_number', lessonsToUnlock)
      .order('day_number', { ascending: true });

    if (!lessons || lessons.length === 0) {
      return NextResponse.json(
        { error: 'No lessons found' },
        { status: 500 }
      );
    }

    // Create access tokens for lessons
    const tokens: string[] = [];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 365); // 1 year

    for (const lesson of lessons) {
      const token = crypto.randomBytes(32).toString('hex');
      
      const { error: tokenError } = await supabase
        .from('lesson_access_tokens')
        .insert({
          user_id: newUser.id,
          lesson_id: lesson.id,
          token,
          expires_at: expiresAt.toISOString(),
        });

      if (!tokenError) {
        tokens.push(token);
      }
    }

    // Send email with link to first lesson
    const firstToken = tokens[0];
    if (firstToken && lessons[0]) {
      try {
        await sendLessonEmail(newUser.id, lessons[0].id, 1, firstToken);
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Continue even if email fails
      }
    }

    return NextResponse.json({
      success: true,
      user: newUser,
      message: 'User created and email sent successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



