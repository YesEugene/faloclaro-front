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
      heroTitle: 'Португальский для жизни',
      heroSubtitle: 'Говори и понимаешь то, что происходит вокруг — уже с первых уроков',
      heroDescription: 'Не учебный словарь, а язык настоящих ситуаций — магазин, кафе, таблички, разговоры.',
      emailLabel: '📩 Введите email, чтобы получить доступ бесплатно и сразу',
      ctaButton: 'Получить доступ бесплатно →',
      
      whatIsTitle: '🚀 Что это за курс',
      whatIsBrief: 'Это курс португальского, который учит не словам, а реальному пониманию и речи в живых ситуациях.',
      whatIsLearn: 'Ты научишься:',
      whatIsItems: [
        'понимать объявления и таблички',
        'спрашивать цену, время, место',
        'делать покупки и оплачивать',
        'говорить в ситуациях, как если бы ты был(а) в Португалии',
      ],
      
      lessonTitle: '🧠 Как устроен урок',
      lessonDescription: 'Каждый урок — это короткая ситуация, которую ты можешь встретить в жизни.',
      lessonInside: 'Внутри:',
      lessonItems: [
        'Слова, нужные именно в этой ситуации',
        'Фразы, которые реально говорят люди',
        'Аудио для понимания речи без переводов',
        'Понимание смысла',
        'Практика произношения',
      ],
      
      methodTitle: '📅 Методология обучения',
      methodNotRecommend: 'Мы не рекомендуем «прогнать всё за один день».',
      methodRecommend: 'Мы рекомендуем:',
      methodItems: [
        '1–2 урока в день.',
        'И практиковать то, что выучил(а), в течение дня.',
      ],
      methodResult: 'Так знания оседают в голове и становятся навыком.',
      
      whyWorksTitle: '💡 Почему это работает',
      whyWorksOld: 'Обычные курсы учат:',
      whyWorksOldItem: '🔹 слово → перевод → забывается',
      whyWorksNew: 'Наш подход:',
      whyWorksNewItem: '🎧 слышишь → понимаешь → говоришь → закрепляешь',
      whyWorksDescription: 'Ты не переводишь по-русски — ты узнаёшь португальский как живой язык.',
      
      benefitsTitle: '✔ Что ты получишь',
      benefitsAfter: 'После курса ты сможешь:',
      benefitsItems: [
        'Понимать сообщения, таблички и объявления',
        'Спрашивать и узнавать цену',
        'Ориентироваться в магазине и кафе',
        'Общаться без страха',
      ],
      benefitsResult: 'Не просто «знать слова» — а ориентироваться в реальности.',
      
      finalCtaTitle: '📩 Получи доступ бесплатно',
      finalCtaDescription: 'Введи email ниже и начни уже сегодня.',
      finalCtaButton: 'Получить доступ бесплатно →',
      finalCtaNote: 'Доступ придёт на почту сразу.',
      
      emailPlaceholder: 'Email',
      successMessage: 'Мы отправили тебе первый урок на почту.',
      successSubtext: 'Проверь почту и перейди по ссылке в письме.',
    },
    en: {
      heroTitle: 'Portuguese for Life',
      heroSubtitle: 'Speak and understand what\'s happening around you — from the very first lessons',
      heroDescription: 'Not a textbook dictionary, but the language of real situations — shops, cafes, signs, conversations.',
      emailLabel: '📩 Enter your email to get free access right away',
      ctaButton: 'Get Free Access →',
      
      whatIsTitle: '🚀 What This Course Is',
      whatIsBrief: 'This is a Portuguese course that teaches not words, but real understanding and speech in live situations.',
      whatIsLearn: 'You will learn to:',
      whatIsItems: [
        'understand announcements and signs',
        'ask about price, time, location',
        'make purchases and pay',
        'speak in situations as if you were in Portugal',
      ],
      
      lessonTitle: '🧠 How a Lesson Works',
      lessonDescription: 'Each lesson is a short situation you might encounter in life.',
      lessonInside: 'Inside:',
      lessonItems: [
        'Words needed specifically for this situation',
        'Phrases that people actually say',
        'Audio for understanding speech without translations',
        'Understanding meaning',
        'Pronunciation practice',
      ],
      
      methodTitle: '📅 Learning Methodology',
      methodNotRecommend: 'We don\'t recommend "cramming everything in one day".',
      methodRecommend: 'We recommend:',
      methodItems: [
        '1–2 lessons per day.',
        'And practice what you\'ve learned throughout the day.',
      ],
      methodResult: 'This way knowledge settles in your head and becomes a skill.',
      
      whyWorksTitle: '💡 Why This Works',
      whyWorksOld: 'Regular courses teach:',
      whyWorksOldItem: '🔹 word → translation → forgotten',
      whyWorksNew: 'Our approach:',
      whyWorksNewItem: '🎧 hear → understand → speak → reinforce',
      whyWorksDescription: 'You don\'t translate into Russian — you learn Portuguese as a living language.',
      
      benefitsTitle: '✔ What You\'ll Get',
      benefitsAfter: 'After the course you\'ll be able to:',
      benefitsItems: [
        'Understand messages, signs and announcements',
        'Ask and find out prices',
        'Navigate shops and cafes',
        'Communicate without fear',
      ],
      benefitsResult: 'Not just "knowing words" — but navigating reality.',
      
      finalCtaTitle: '📩 Get Free Access',
      finalCtaDescription: 'Enter your email below and start today.',
      finalCtaButton: 'Get Free Access →',
      finalCtaNote: 'Access will arrive in your email immediately.',
      
      emailPlaceholder: 'Email',
      successMessage: 'We\'ve sent you the first lesson by email.',
      successSubtext: 'Check your email and click the link in the message.',
    },
    pt: {
      heroTitle: 'Português para a Vida',
      heroSubtitle: 'Fala e compreendes o que acontece à tua volta — desde as primeiras lições',
      heroDescription: 'Não um dicionário de livro, mas a língua de situações reais — lojas, cafés, placas, conversas.',
      emailLabel: '📩 Introduz o teu email para obteres acesso grátis imediatamente',
      ctaButton: 'Obter Acesso Grátis →',
      
      whatIsTitle: '🚀 O Que É Este Curso',
      whatIsBrief: 'Este é um curso de português que ensina não palavras, mas compreensão real e fala em situações ao vivo.',
      whatIsLearn: 'Vais aprender a:',
      whatIsItems: [
        'compreender anúncios e placas',
        'perguntar sobre preço, hora, localização',
        'fazer compras e pagar',
        'falar em situações como se estivesses em Portugal',
      ],
      
      lessonTitle: '🧠 Como Funciona uma Lição',
      lessonDescription: 'Cada lição é uma situação curta que podes encontrar na vida.',
      lessonInside: 'Dentro:',
      lessonItems: [
        'Palavras necessárias especificamente para esta situação',
        'Frases que as pessoas realmente dizem',
        'Áudio para compreender a fala sem traduções',
        'Compreensão do significado',
        'Prática de pronúncia',
      ],
      
      methodTitle: '📅 Metodologia de Aprendizagem',
      methodNotRecommend: 'Não recomendamos "fazer tudo num dia".',
      methodRecommend: 'Recomendamos:',
      methodItems: [
        '1–2 lições por dia.',
        'E praticar o que aprendeste durante o dia.',
      ],
      methodResult: 'Assim o conhecimento fixa-se na tua cabeça e torna-se uma competência.',
      
      whyWorksTitle: '💡 Por Que Isto Funciona',
      whyWorksOld: 'Os cursos regulares ensinam:',
      whyWorksOldItem: '🔹 palavra → tradução → esquecido',
      whyWorksNew: 'A nossa abordagem:',
      whyWorksNewItem: '🎧 ouves → compreendes → falas → reforças',
      whyWorksDescription: 'Não traduzes para russo — aprendes português como uma língua viva.',
      
      benefitsTitle: '✔ O Que Vais Obter',
      benefitsAfter: 'Após o curso poderás:',
      benefitsItems: [
        'Compreender mensagens, placas e anúncios',
        'Perguntar e descobrir preços',
        'Orientar-te em lojas e cafés',
        'Comunicar sem medo',
      ],
      benefitsResult: 'Não apenas "saber palavras" — mas orientar-te na realidade.',
      
      finalCtaTitle: '📩 Obtém Acesso Grátis',
      finalCtaDescription: 'Introduz o teu email abaixo e começa hoje.',
      finalCtaButton: 'Obter Acesso Grátis →',
      finalCtaNote: 'O acesso chegará ao teu email imediatamente.',
      
      emailPlaceholder: 'Email',
      successMessage: 'Enviamos-te a primeira lição por email.',
      successSubtext: 'Verifica o teu email e clica no link da mensagem.',
    },
  };

  const t = translations[appLanguage] || translations.ru;

  const handleSubmit = async (e: React.FormEvent, source: 'hero' | 'final') => {
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
          <p className="text-gray-600">{t.successSubtext}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-white pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Logo */}
            <div className="mb-12">
              <Image
                src="/Img/Logo FaloClaro.svg"
                alt="FaloClaro"
                width={150}
                height={50}
                className="h-12 w-auto mx-auto"
              />
            </div>

            {/* Hero Title */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              {t.heroTitle}
            </h1>
            
            {/* Hero Subtitle */}
            <p className="text-xl md:text-2xl text-gray-700 mb-6 max-w-3xl mx-auto leading-relaxed">
              {t.heroSubtitle}
            </p>

            {/* Hero Description */}
            <p className="text-lg md:text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
              {t.heroDescription}
            </p>

            {/* Email Form */}
            <div className="max-w-lg mx-auto">
              <p className="text-sm text-gray-600 mb-4">{t.emailLabel}</p>
              <form onSubmit={(e) => handleSubmit(e, 'hero')} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  required
                  className="flex-1 px-6 py-4 rounded-lg border-2 border-gray-300 focus:border-blue-600 focus:outline-none text-gray-900 text-lg"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isSubmitting ? '...' : t.ctaButton}
                </button>
              </form>
              {error && (
                <div className="text-red-600 text-sm mt-3 text-center">{error}</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* What Is This Course */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 text-center">
            {t.whatIsTitle}
          </h2>
          <p className="text-xl text-gray-700 mb-8 text-center max-w-3xl mx-auto">
            {t.whatIsBrief}
          </p>
          <div className="max-w-2xl mx-auto">
            <p className="text-lg font-semibold text-gray-900 mb-4">{t.whatIsLearn}</p>
            <ul className="space-y-3">
              {t.whatIsItems.map((item, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-600 mr-3 text-xl mt-1">•</span>
                  <span className="text-lg text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How Lesson Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 text-center">
            {t.lessonTitle}
          </h2>
          <p className="text-xl text-gray-700 mb-8 text-center max-w-3xl mx-auto">
            {t.lessonDescription}
          </p>
          <div className="max-w-2xl mx-auto">
            <p className="text-lg font-semibold text-gray-900 mb-4">{t.lessonInside}</p>
            <ul className="space-y-3">
              {t.lessonItems.map((item, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-green-600 mr-3 text-xl mt-1">✔</span>
                  <span className="text-lg text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Learning Methodology */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 text-center">
            {t.methodTitle}
          </h2>
          <div className="max-w-2xl mx-auto space-y-6">
            <p className="text-xl text-gray-700 text-center">
              {t.methodNotRecommend}
            </p>
            <p className="text-lg font-semibold text-gray-900 text-center">
              {t.methodRecommend}
            </p>
            <ul className="space-y-3">
              {t.methodItems.map((item, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-600 mr-3 text-xl mt-1">{index + 1}.</span>
                  <span className="text-lg text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-xl text-gray-700 text-center font-medium">
              {t.methodResult}
            </p>
          </div>
        </div>
      </section>

      {/* Why This Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 text-center">
            {t.whyWorksTitle}
          </h2>
          <div className="max-w-2xl mx-auto space-y-8">
            <div>
              <p className="text-lg font-semibold text-gray-900 mb-3">{t.whyWorksOld}</p>
              <p className="text-xl text-gray-700">{t.whyWorksOldItem}</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900 mb-3">{t.whyWorksNew}</p>
              <p className="text-xl text-gray-700">{t.whyWorksNewItem}</p>
            </div>
            <p className="text-lg text-gray-700 text-center">
              {t.whyWorksDescription}
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 text-center">
            {t.benefitsTitle}
          </h2>
          <p className="text-xl text-gray-700 mb-8 text-center max-w-3xl mx-auto">
            {t.benefitsAfter}
          </p>
          <div className="max-w-2xl mx-auto">
            <ul className="space-y-4">
              {t.benefitsItems.map((item, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-green-600 mr-3 text-xl mt-1">🎯</span>
                  <span className="text-lg text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-xl text-gray-700 mt-8 text-center font-medium">
              {t.benefitsResult}
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 text-center">
            {t.finalCtaTitle}
          </h2>
          <p className="text-xl text-gray-700 mb-8 text-center">
            {t.finalCtaDescription}
          </p>
          
          <form onSubmit={(e) => handleSubmit(e, 'final')} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              required
              className="w-full px-6 py-4 rounded-lg border-2 border-gray-300 focus:border-blue-600 focus:outline-none text-gray-900 text-lg"
            />
            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '...' : t.finalCtaButton}
            </button>
          </form>
          
          <p className="text-sm text-gray-600 text-center mt-4">
            {t.finalCtaNote}
          </p>
        </div>
      </section>
    </div>
  );
}
