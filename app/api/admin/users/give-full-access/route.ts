import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { buildDefaultVarsForUser, sendTemplateEmail, stopCampaign } from '@/lib/email-engine';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from('subscription_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update or create subscription to "paid" status
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingSubscription) {
      // Update existing subscription to active (full access)
      await supabase
        .from('subscriptions')
        .update({
          status: 'active', // Use 'active' instead of 'paid' to match schema
          paid_at: new Date().toISOString(),
          expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
          trial_started_at: null,
          trial_ends_at: null,
        })
        .eq('id', existingSubscription.id);
    } else {
      // Create new active subscription (full access)
      await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          status: 'active', // Use 'active' instead of 'paid' to match schema
          paid_at: new Date().toISOString(),
          expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        });
    }

    // Get all lessons (1-60)
    const { data: allLessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, day_number')
      .order('day_number', { ascending: true });

    if (lessonsError || !allLessons || allLessons.length === 0) {
      return NextResponse.json(
        { error: 'Lessons not found' },
        { status: 500 }
      );
    }

    // Get existing tokens for this user
    const { data: existingTokens, error: tokensError } = await supabase
      .from('lesson_access_tokens')
      .select('lesson_id')
      .eq('user_id', userId);

    if (tokensError) {
      console.error('Error fetching existing tokens:', tokensError);
      // Continue anyway
    }

    const existingLessonIds = new Set(
      (existingTokens || []).map((t: any) => t.lesson_id)
    );

    // Create tokens for lessons that don't have them
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 365); // 1 year

    const tokensToCreate = allLessons
      .filter(lesson => !existingLessonIds.has(lesson.id))
      .map(lesson => ({
        user_id: userId,
        lesson_id: lesson.id,
        token: crypto.randomBytes(32).toString('hex'),
        expires_at: expiresAt.toISOString(),
      }));

    if (tokensToCreate.length > 0) {
      const { error: createError } = await supabase
        .from('lesson_access_tokens')
        .insert(tokensToCreate);

      if (createError) {
        console.error('Error creating lesson tokens:', createError);
        return NextResponse.json(
          { error: 'Failed to create access tokens' },
          { status: 500 }
        );
      }
    }

    // Send email about full access with link to first lesson
    const { data: firstLesson } = await supabase
      .from('lessons')
      .select('id, day_number')
      .eq('day_number', 1)
      .single();

    if (firstLesson) {
      // Get token for first lesson (should exist after creating tokens above)
      const { data: firstLessonToken } = await supabase
        .from('lesson_access_tokens')
        .select('token')
        .eq('user_id', userId)
        .eq('lesson_id', firstLesson.id)
        .single();

      if (firstLessonToken?.token) {
        try {
          await stopCampaign({ userId, campaignKey: 'campaign_neg_no_payment_after_day3' });
          const vars = await buildDefaultVarsForUser(userId);
          await sendTemplateEmail({ userId, templateKey: 'admin_full_access_granted', vars, dayNumber: 0 });
        } catch (emailError) {
          console.error('Error sending full access email:', emailError);
          // Don't fail if email fails
        }
      } else {
        console.warn('First lesson token not found after creating tokens');
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Full access granted successfully',
      tokensCreated: tokensToCreate.length,
      totalLessons: allLessons.length,
    });
  } catch (error) {
    console.error('Error in POST /api/admin/users/give-full-access:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

