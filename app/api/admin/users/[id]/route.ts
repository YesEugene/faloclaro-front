import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// DELETE /api/admin/users/[id] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { id: userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Delete user progress and related data (cascade should handle most)
    // But we'll explicitly delete to be safe
    const { error: progressError } = await supabaseAdmin
      .from('user_progress')
      .delete()
      .eq('user_id', userId);

    if (progressError) {
      console.error('Error deleting user progress:', progressError);
    }

    // Delete lesson access tokens
    const { error: tokensError } = await supabaseAdmin
      .from('lesson_access_tokens')
      .delete()
      .eq('user_id', userId);

    if (tokensError) {
      console.error('Error deleting lesson access tokens:', tokensError);
    }

    // Delete subscriptions
    const { error: subscriptionsError } = await supabaseAdmin
      .from('subscriptions')
      .delete()
      .eq('user_id', userId);

    if (subscriptionsError) {
      console.error('Error deleting subscriptions:', subscriptionsError);
    }

    // Finally, delete the user
    const { error: userError } = await supabaseAdmin
      .from('subscription_users')
      .delete()
      .eq('id', userId);

    if (userError) {
      console.error('Error deleting user:', userError);
      return NextResponse.json(
        { error: 'Failed to delete user', details: userError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/users/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

