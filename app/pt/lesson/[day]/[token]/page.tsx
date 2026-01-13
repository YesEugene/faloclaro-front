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

    // If no task specified, redirect to overview
    if (!taskId) {
      router.replace(`/pt/lesson/${day}/${token}/overview`);
      return;
    }

    loadLesson();
  }, [day, token, taskId, router]);

  const loadLesson = async () => {
    try {
      setLoading(true);

      // Verify token and get user
      const { data: tokenData, error: tokenError } = await supabase
        .from('lesson_access_tokens')
        .select('user_id, lesson_id, expires_at, used_at')
        .eq('token', token)
        .single();

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

      // Get lesson
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('*')
        .eq('day_number', day)
        .single();

      if (lessonError || !lessonData) {
        setError('Lesson not found');
        setLoading(false);
        return;
      }

      // Get or create user progress
      let { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('*, task_progress(*)')
        .eq('user_id', tokenData.user_id)
        .eq('lesson_id', lessonData.id)
        .single();

      if (progressError && progressError.code === 'PGRST116') {
        // Create new progress
        const { data: newProgress, error: createError } = await supabase
          .from('user_progress')
          .insert({
            user_id: tokenData.user_id,
            lesson_id: lessonData.id,
            day_number: day,
            status: 'not_started',
            total_tasks: 5,
          })
          .select('*, task_progress(*)')
          .single();

        if (createError) {
          throw createError;
        }

        progressData = newProgress;
      } else if (progressError) {
        throw progressError;
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
      onProgressUpdate={loadLesson}
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

