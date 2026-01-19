'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppLanguage, syncUserLanguageFromDB } from '@/lib/language-context';
import LessonContent from '@/components/subscription/LessonContent';

function LessonPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language: appLanguage, setLanguage } = useAppLanguage();
  const day = parseInt(params.day as string);
  const token = params.token as string;
  const taskId = searchParams.get('task');
  const phraseId = searchParams.get('phraseId');
  const indexParam = searchParams.get('index');

  const [lesson, setLesson] = useState<any>(null);
  const [userProgress, setUserProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!day || !token) {
      setError('Invalid lesson link');
      setLoading(false);
      return;
    }

    // If no task specified, start from Task 1 (old /overview page is deprecated)
    if (!taskId) {
      const sp = new URLSearchParams();
      sp.set('task', '1');
      if (phraseId) sp.set('phraseId', phraseId);
      if (indexParam) sp.set('index', indexParam);
      router.replace(`/pt/lesson/${day}/${token}?${sp.toString()}`);
      return;
    }

    loadLesson();
  }, [day, token, taskId, router]);

  const loadLesson = async () => {
    try {
      setLoading(true);

      // Verify token and get user
      const { data: tokenRows, error: tokenError } = await supabase
        .from('lesson_access_tokens')
        .select('user_id, lesson_id, expires_at, used_at')
        .eq('token', token)
        .limit(1);

      const tokenData = tokenRows && tokenRows.length > 0 ? tokenRows[0] : null;

      if (tokenError || !tokenData) {
        setError('Invalid or expired link');
        setLoading(false);
        return;
      }

      if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
        setError('Link has expired');
        setLoading(false);
        return;
      }

      // Sync user language from database
      await syncUserLanguageFromDB(tokenData.user_id, setLanguage);

      // Check subscription status
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('status, paid_at')
        .eq('user_id', tokenData.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Check if user is trying to access lesson > 3 with trial subscription
      // Redirect to payment page if so
      if (day > 3) {
        const hasPaidAccess = subscriptionData?.status === 'active' || subscriptionData?.status === 'paid' || subscriptionData?.paid_at;
        if (!hasPaidAccess) {
          // Redirect to payment page
          router.push(`/pt/payment?day=${day}&token=${token}`);
          return;
        }
      }

      // Get lesson
      const { data: lessonRows, error: lessonError } = await supabase
        .from('lessons')
        .select('*')
        .eq('day_number', day)
        .limit(1);

      const lessonData = lessonRows && lessonRows.length > 0 ? lessonRows[0] : null;

      if (lessonError || !lessonData) {
        setError('Lesson not found');
        setLoading(false);
        return;
      }

      // Get or create user progress
      let { data: progressRows, error: progressError } = await supabase
        .from('user_progress')
        .select('*, task_progress(*)')
        .eq('user_id', tokenData.user_id)
        .eq('lesson_id', lessonData.id)
        .limit(1);

      let progressData = progressRows && progressRows.length > 0 ? progressRows[0] : null;

      if ((progressError && progressError.code === 'PGRST116') || (!progressError && !progressData)) {
        // Create new progress
        const { data: createdRows, error: createError } = await supabase
          .from('user_progress')
          .insert({
            user_id: tokenData.user_id,
            lesson_id: lessonData.id,
            day_number: day,
            status: 'not_started',
            total_tasks: 5,
          })
          .select('*, task_progress(*)')
          .limit(1);

        if (createError) {
          throw createError;
        }

        progressData = createdRows && createdRows.length > 0 ? createdRows[0] : null;
      } else if (progressError) {
        throw progressError;
      }

      if (!progressData) {
        setError('Failed to load progress');
        setLoading(false);
        return;
      }

      setLesson(lessonData);
      setUserProgress(progressData);
    } catch (err) {
      console.error('Error loading lesson:', err);
      setError(err instanceof Error ? err.message : 'Failed to load lesson');
    } finally {
      setLoading(false);
    }

  };

  const refreshProgressSilent = async () => {
    try {
      // Avoid full-page reload UX: only refetch progress silently.
      if (!userProgress?.id) return;
      const { data: progressRows, error: progressError } = await supabase
        .from('user_progress')
        .select('*, task_progress(*)')
        .eq('id', userProgress.id)
        .limit(1);

      if (progressError) {
        console.error('Silent progress refresh error:', progressError);
        return;
      }

      const progressData = progressRows && progressRows.length > 0 ? progressRows[0] : null;
      if (progressData) setUserProgress(progressData);
    } catch (err) {
      console.error('Silent progress refresh failed:', err);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!lesson || !userProgress) {
    return null;
  }


  return (
    <LessonContent
      lesson={lesson}
      userProgress={userProgress}
      token={token}
      onProgressUpdate={refreshProgressSilent}
    />
  );
}

export default function LessonPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <LessonPageContent />
    </Suspense>
  );
}

