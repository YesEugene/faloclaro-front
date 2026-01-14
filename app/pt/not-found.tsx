'use client';

import { useRouter } from 'next/navigation';
import { useAppLanguage } from '@/lib/language-context';
import { LanguageSelector } from '@/components/LanguageSelector';
import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  const router = useRouter();
  const { language: appLanguage } = useAppLanguage();

  const translations = {
    ru: {
      title: 'Ой-ой-ой! 🐙',
      subtitle: 'Эта страница решила взять отпуск',
      message: 'Похоже, она ушла изучать португальский где-то в Лиссабоне. Мы её искали, но она не отвечает.',
      suggestion: 'Может, она просто потерялась в грамматике?',
      button: 'Вернуться на главную',
      emoji: '🇵🇹',
    },
    en: {
      title: 'Oops! 🐙',
      subtitle: 'This page decided to take a vacation',
      message: 'It seems like it went to learn Portuguese somewhere in Lisbon. We looked for it, but it\'s not answering.',
      suggestion: 'Maybe it just got lost in the grammar?',
      button: 'Back to home',
      emoji: '🇵🇹',
    },
  };

  const t = translations[appLanguage] || translations.en;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#BDF6BB] via-[#FFE3E3] to-[#FAF7BF] flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <div className="flex items-center gap-2">
              <div className="relative w-12 h-12 md:w-16 md:h-16">
                <Image
                  src="/Img/Website/logo.svg"
                  alt="FaloClaro"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </Link>
          <LanguageSelector />
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 border-4 border-dashed border-[#3A2E1F]">
          {/* Big Emoji */}
          <div className="text-8xl md:text-9xl mb-6 animate-bounce">
            {t.emoji}
          </div>

          {/* Title */}
          <h1 
            className="text-4xl md:text-6xl font-bold mb-4 text-[#3A2E1F]"
            style={{ fontFamily: 'var(--font-orelega)' }}
          >
            {t.title}
          </h1>

          {/* Subtitle */}
          <h2 
            className="text-2xl md:text-3xl font-semibold mb-6 text-[#3A2E1F]"
            style={{ fontFamily: 'var(--font-tiktok)' }}
          >
            {t.subtitle}
          </h2>

          {/* Message */}
          <p 
            className="text-lg md:text-xl mb-4 text-gray-700 leading-relaxed"
            style={{ fontFamily: 'var(--font-tiktok)' }}
          >
            {t.message}
          </p>

          {/* Suggestion */}
          <p 
            className="text-base md:text-lg mb-8 text-gray-600 italic"
            style={{ fontFamily: 'var(--font-tiktok)' }}
          >
            {t.suggestion}
          </p>

          {/* Decorative Elements */}
          <div className="flex justify-center gap-4 mb-8">
            <span className="text-4xl animate-pulse">📚</span>
            <span className="text-4xl animate-pulse delay-75">☕</span>
            <span className="text-4xl animate-pulse delay-150">🎓</span>
          </div>

          {/* Button */}
          <Link
            href="/"
            className="inline-block bg-[#45C240] hover:bg-[#3aa835] text-white font-bold py-4 px-8 rounded-xl text-lg transition-all transform hover:scale-105 shadow-lg"
            style={{ fontFamily: 'var(--font-tiktok)' }}
          >
            {t.button} →
          </Link>

          {/* Fun Footer */}
          <div className="mt-8 text-sm text-gray-500" style={{ fontFamily: 'var(--font-tiktok)' }}>
            <p>
              {appLanguage === 'ru' ? 'P.S. Если вы ищете уроки, они здесь: ' : 'P.S. If you\'re looking for lessons, they\'re here: '}
              <Link href="/pt/course" className="text-[#45C240] hover:underline font-semibold">
                /pt/course
              </Link>
            </p>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 text-6xl opacity-20 animate-float hidden md:block">📖</div>
        <div className="absolute bottom-20 right-10 text-6xl opacity-20 animate-float delay-200 hidden md:block">✏️</div>
        <div className="absolute top-1/2 left-20 text-5xl opacity-20 animate-float delay-300 hidden md:block">🗺️</div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .delay-75 {
          animation-delay: 0.75s;
        }
        .delay-150 {
          animation-delay: 1.5s;
        }
        .delay-200 {
          animation-delay: 2s;
        }
        .delay-300 {
          animation-delay: 3s;
        }
      `}</style>
    </div>
  );
}

