'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAppLanguage } from '@/lib/language-context';

export default function SubscriptionLandingPage() {
  const router = useRouter();
  const { language: appLanguage } = useAppLanguage();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const translations = {
    ru: {
      title: 'Португальский — просто.',
      subtitle: '15–30 минут в день. 60 дней.',
      description: 'Каждый день — один короткий урок с понятной структурой.',
      description2: 'Ты просто открываешь день и делаешь задания — мы уже решили за тебя, что учить сегодня.',
      bullets: [
        'Каждый день — новый урок по email или в Telegram',
        '15–30 минут, без перегруза',
        'Фокус на слух и речь, а не на заучивание',
        'Подходит для жизни в Португалии и подготовки к языковому экзамену',
      ],
      formatTitle: 'Формат обучения:',
      formatDescription: '60 дней — 60 коротких уроков.',
      formatItems: [
        'новые слова и фразы',
        'простые правила',
        'понимание речи на слух',
        'задания на внимательность',
        'короткое письмо (по желанию)',
      ],
      cta: 'Попробовать бесплатно',
      ctaSubtext: '3 дня обучения бесплатно.',
      ctaSubtext2: 'Без карты. Можно отменить в любой момент.',
      emailPlaceholder: 'Email',
      buttonText: 'Начать бесплатные 3 дня',
      successMessage: 'Мы отправили тебе первый урок на почту.',
    },
    en: {
      title: 'Portuguese — simple.',
      subtitle: '15–30 minutes a day. 60 days.',
      description: 'Every day — one short lesson with a clear structure.',
      description2: 'You just open the day and do the tasks — we\'ve already decided what to learn today.',
      bullets: [
        'Every day — a new lesson via email or Telegram',
        '15–30 minutes, no overload',
        'Focus on listening and speaking, not memorization',
        'Suitable for life in Portugal and language exam preparation',
      ],
      formatTitle: 'Learning format:',
      formatDescription: '60 days — 60 short lessons.',
      formatItems: [
        'new words and phrases',
        'simple rules',
        'listening comprehension',
        'attention tasks',
        'short writing (optional)',
      ],
      cta: 'Try for free',
      ctaSubtext: '3 days of learning for free.',
      ctaSubtext2: 'No card required. Can cancel anytime.',
      emailPlaceholder: 'Email',
      buttonText: 'Start free 3 days',
      successMessage: 'We\'ve sent you the first lesson by email.',
    },
    pt: {
      title: 'Português — simples.',
      subtitle: '15–30 minutos por dia. 60 dias.',
      description: 'Todos os dias — uma lição curta com uma estrutura clara.',
      description2: 'Apenas abres o dia e fazes as tarefas — já decidimos o que aprender hoje.',
      bullets: [
        'Todos os dias — uma nova lição por email ou Telegram',
        '15–30 minutos, sem sobrecarga',
        'Foco na audição e fala, não na memorização',
        'Adequado para viver em Portugal e preparação para exame de língua',
      ],
      formatTitle: 'Formato de aprendizagem:',
      formatDescription: '60 dias — 60 lições curtas.',
      formatItems: [
        'novas palavras e frases',
        'regras simples',
        'compreensão auditiva',
        'tarefas de atenção',
        'escrita curta (opcional)',
      ],
      cta: 'Experimentar grátis',
      ctaSubtext: '3 dias de aprendizagem grátis.',
      ctaSubtext2: 'Sem cartão. Podes cancelar a qualquer momento.',
      emailPlaceholder: 'Email',
      buttonText: 'Começar 3 dias grátis',
      successMessage: 'Enviamos-te a primeira lição por email.',
    },
  };

  const t = translations[appLanguage] || translations.ru;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/subscription/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, language: appLanguage }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-6">
            <Image
              src="/Img/Logo FaloClaro.svg"
              alt="FaloClaro"
              width={120}
              height={40}
              className="h-10 w-auto mx-auto"
            />
          </div>
          <h1 className="text-2xl font-bold mb-4 text-black">{t.successMessage}</h1>
          <p className="text-gray-600">
            {appLanguage === 'ru' 
              ? 'Проверь почту и перейди по ссылке в письме.'
              : appLanguage === 'en'
              ? 'Check your email and click the link in the message.'
              : 'Verifica o email e clica no link na mensagem.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <Image
            src="/Img/Logo FaloClaro.svg"
            alt="FaloClaro"
            width={120}
            height={40}
            className="h-10 w-auto mx-auto mb-6"
          />
        </div>

        {/* Main Content */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-black">
            {t.title}
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 mb-8">
            {t.subtitle}
          </p>
          <p className="text-lg text-gray-600 mb-4 max-w-2xl mx-auto">
            {t.description}
          </p>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            {t.description2}
          </p>
        </div>

        {/* Bullets */}
        <div className="mb-12 max-w-2xl mx-auto">
          <ul className="space-y-4 text-left">
            {t.bullets.map((bullet, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-600 mr-3 text-xl">•</span>
                <span className="text-gray-700 text-lg">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Format Section */}
        <div className="mb-12 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-4 text-black text-center">
            {t.formatTitle}
          </h2>
          <p className="text-lg text-gray-700 mb-4 text-center">
            {t.formatDescription}
          </p>
          <div className="text-left">
            <p className="text-gray-600 mb-2">
              {appLanguage === 'ru' 
                ? 'В каждом уроке:'
                : appLanguage === 'en'
                ? 'In each lesson:'
                : 'Em cada lição:'}
            </p>
            <ul className="space-y-2">
              {t.formatItems.map((item, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-600 mr-3">—</span>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA Form */}
        <div className="max-w-md mx-auto bg-gray-50 rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-2 text-center text-black">
            {t.cta}
          </h2>
          <p className="text-sm text-gray-600 text-center mb-2">
            {t.ctaSubtext}
          </p>
          <p className="text-sm text-gray-600 text-center mb-6">
            {t.ctaSubtext2}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                required
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none text-black"
              />
            </div>
            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting 
                ? (appLanguage === 'ru' ? 'Отправка...' : appLanguage === 'en' ? 'Submitting...' : 'A enviar...')
                : t.buttonText}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

