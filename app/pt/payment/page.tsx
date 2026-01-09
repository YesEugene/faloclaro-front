'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppLanguage } from '@/lib/language-context';
import { LanguageSelector } from '@/components/LanguageSelector';
import Link from 'next/link';
import Image from 'next/image';

function PaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language: appLanguage } = useAppLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const lessonDay = searchParams.get('lesson');

  useEffect(() => {
    // Try to get userId from localStorage or URL token
    const token = searchParams.get('token');
    if (token) {
      loadUserFromToken(token);
    } else {
      // Try to get from localStorage
      const storedUserId = localStorage.getItem('userId');
      if (storedUserId) {
        setUserId(storedUserId);
      } else {
        // If no userId, redirect to registration
        router.push('/pt');
      }
    }
  }, []);

  const loadUserFromToken = async (token: string) => {
    try {
      const { data: tokenData, error: tokenError } = await supabase
        .from('lesson_access_tokens')
        .select('user_id')
        .eq('token', token)
        .single();

      if (!tokenError && tokenData) {
        setUserId(tokenData.user_id);
        localStorage.setItem('userId', tokenData.user_id);
      }
    } catch (err) {
      console.error('Error loading user from token:', err);
    }
  };

  const handlePayment = async () => {
    if (!userId) {
      setError(appLanguage === 'ru' 
        ? 'Необходимо войти в систему' 
        : appLanguage === 'en'
        ? 'You need to log in'
        : 'Precisa de fazer login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get user email
      const { data: userData, error: userError } = await supabase
        .from('subscription_users')
        .select('email')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        throw new Error('User not found');
      }

      // Create checkout session
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          email: userData.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Payment error');
      setLoading(false);
    }
  };

  const translations = {
    ru: {
      title: 'Откройте все уроки',
      description: 'Оплатите 15€ и получите доступ ко всем 60 урокам португальского языка.',
      button: 'Оплатить 15€',
      loading: 'Загрузка...',
      back: 'Назад к урокам',
    },
    en: {
      title: 'Unlock all lessons',
      description: 'Pay €15 and get access to all 60 Portuguese language lessons.',
      button: 'Pay €15',
      loading: 'Loading...',
      back: 'Back to lessons',
    },
    pt: {
      title: 'Desbloquear todas as lições',
      description: 'Pague 15€ e obtenha acesso a todas as 60 lições de português.',
      button: 'Pagar 15€',
      loading: 'A carregar...',
      back: 'Voltar às lições',
    },
  };

  const t = translations[appLanguage] || translations.ru;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="max-w-md mx-auto px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <Link href="/pt">
            <Image
              src="/Img/Logo FaloClaro.svg"
              alt="FaloClaro"
              width={120}
              height={40}
              className="h-10 w-auto"
            />
          </Link>
          <LanguageSelector />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-black mb-4 text-center">
          {t.title}
        </h1>
        <p className="text-gray-700 mb-8 text-center">
          {t.description}
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handlePayment}
            disabled={loading || !userId}
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t.loading : t.button}
          </button>

          <Link
            href="/pt/lessons"
            className="block w-full text-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            {t.back}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <PaymentPageContent />
    </Suspense>
  );
}

