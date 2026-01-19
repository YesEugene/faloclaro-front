'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppLanguage } from '@/lib/language-context';
import Link from 'next/link';
import Image from 'next/image';
import { SettingsPanel } from '@/components/subscription/ui/SettingsPanel';

function PaymentPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language: appLanguage } = useAppLanguage();
  const day = searchParams.get('day');
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const loadUserData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Get user from token
        const { data: tokenRows } = await supabase
          .from('lesson_access_tokens')
          .select('user_id')
          .eq('token', token)
          .limit(1);

        const tokenData = tokenRows && tokenRows.length > 0 ? tokenRows[0] : null;

        if (tokenData?.user_id) {
          // Get user email
          const { data: userRows } = await supabase
            .from('subscription_users')
            .select('email')
            .eq('id', tokenData.user_id)
            .limit(1);

          const userData = userRows && userRows.length > 0 ? userRows[0] : null;

          if (userData?.email) {
            setUserEmail(userData.email);
          }
        }
      } catch (err) {
        console.error('Error loading user data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [token]);

  const handlePayment = async () => {
    if (!userEmail) {
      alert(appLanguage === 'ru' 
        ? 'Email не найден. Пожалуйста, обновите страницу.'
        : appLanguage === 'en'
        ? 'Email not found. Please refresh the page.'
        : 'Email não encontrado. Por favor, atualize a página.');
      return;
    }

    try {
      // Create Stripe checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          day: day ? parseInt(day) : null,
          token: token,
        }),
      });

      const data = await response.json();

      if (data.success && data.sessionUrl) {
        // Redirect to Stripe Checkout
        window.location.href = data.sessionUrl;
      } else {
        alert(data.error || (appLanguage === 'ru' 
          ? 'Не удалось создать сессию оплаты'
          : appLanguage === 'en'
          ? 'Failed to create payment session'
          : 'Falha ao criar sessão de pagamento'));
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert(appLanguage === 'ru'
        ? 'Ошибка при обработке платежа. Пожалуйста, попробуйте еще раз.'
        : appLanguage === 'en'
        ? 'Failed to process payment. Please try again.'
        : 'Falha ao processar pagamento. Por favor, tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 md:px-8">
        <a href="https://faloclaro.com" className="flex items-center gap-2">
          <div className="relative w-24 h-24 md:w-32 md:h-32">
            <Image src="/Img/Website/logo.svg" alt="Falo Claro" fill className="object-contain" />
          </div>
        </a>
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          style={{ width: '29px', height: '29px', padding: 0, background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <Image
            src="/Img/Website/Settings.svg"
            alt="Settings"
            width={29}
            height={29}
            style={{ width: '29px', height: '29px' }}
          />
        </button>
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} lessonToken={token} />

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {appLanguage === 'ru' 
              ? 'Откройте доступ ко всем урокам' 
              : appLanguage === 'en'
              ? 'Unlock Access to All Lessons'
              : 'Desbloquear Acesso a Todas as Lições'}
          </h1>
          <p className="text-lg text-gray-600">
            {appLanguage === 'ru'
              ? 'Вы завершили первые 3 урока. Продолжите обучение и получите доступ ко всем 60 урокам курса.'
              : appLanguage === 'en'
              ? 'You\'ve completed the first 3 lessons. Continue learning and get access to all 60 course lessons.'
              : 'Você completou as primeiras 3 lições. Continue aprendendo e obtenha acesso a todas as 60 lições do curso.'}
          </p>
        </div>

        {/* Pricing Card */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-8 md:p-12 mb-8">
          <div className="text-center mb-8">
            <div className="text-5xl md:text-6xl font-bold text-green-600 mb-2">
              €20
            </div>
            <div className="text-gray-600 text-lg">
              {appLanguage === 'ru'
                ? 'Одноразовая оплата'
                : appLanguage === 'en'
                ? 'One-time payment'
                : 'Pagamento único'}
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <div className="font-semibold text-gray-900">
                  {appLanguage === 'ru'
                    ? 'Доступ ко всем 60 урокам'
                    : appLanguage === 'en'
                    ? 'Access to all 60 lessons'
                    : 'Acesso a todas as 60 lições'}
                </div>
                <div className="text-sm text-gray-600">
                  {appLanguage === 'ru'
                    ? 'Полный курс португальского языка'
                    : appLanguage === 'en'
                    ? 'Complete Portuguese language course'
                    : 'Curso completo de português'}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <div className="font-semibold text-gray-900">
                  {appLanguage === 'ru'
                    ? 'Будущие обновления'
                    : appLanguage === 'en'
                    ? 'Future updates'
                    : 'Atualizações futuras'}
                </div>
                <div className="text-sm text-gray-600">
                  {appLanguage === 'ru'
                    ? 'Новые уроки и материалы бесплатно'
                    : appLanguage === 'en'
                    ? 'New lessons and materials for free'
                    : 'Novas lições e materiais gratuitamente'}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <div className="font-semibold text-gray-900">
                  {appLanguage === 'ru'
                    ? 'Пожизненный доступ'
                    : appLanguage === 'en'
                    ? 'Lifetime access'
                    : 'Acesso vitalício'}
                </div>
                <div className="text-sm text-gray-600">
                  {appLanguage === 'ru'
                    ? 'Учитесь в своем темпе, без ограничений'
                    : appLanguage === 'en'
                    ? 'Learn at your own pace, no restrictions'
                    : 'Aprenda no seu próprio ritmo, sem restrições'}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Button */}
          <button
            onClick={handlePayment}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg text-lg transition-colors"
          >
            {appLanguage === 'ru'
              ? 'Оплатить €20'
              : appLanguage === 'en'
              ? 'Pay €20'
              : 'Pagar €20'}
          </button>

          <p className="text-center text-sm text-gray-500 mt-4">
            {appLanguage === 'ru'
              ? 'Безопасная оплата через Stripe'
              : appLanguage === 'en'
              ? 'Secure payment via Stripe'
              : 'Pagamento seguro via Stripe'}
          </p>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link
            href={day && token ? `/pt/lesson/${day}/${token}?task=1` : '/pt'}
            className="text-green-600 hover:text-green-700 font-medium"
          >
            {appLanguage === 'ru'
              ? '← Вернуться к урокам'
              : appLanguage === 'en'
              ? '← Back to lessons'
              : '← Voltar às lições'}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <PaymentPageContent />
    </Suspense>
  );
}

