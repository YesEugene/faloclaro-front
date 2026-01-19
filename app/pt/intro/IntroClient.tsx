'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAppLanguage } from '@/lib/language-context';

export default function IntroClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { language } = useAppLanguage();

  const t = {
    ru: {
      title: 'Вступление',
      back: '← Назад',
      h1: 'Как устроен курс FaloClaro',
      p1: 'Курс состоит из модулей и уроков. Каждый урок — это 5 заданий, которые ведут тебя от слов к связной речи.',
      p2: 'Навигация: снизу ты видишь текущее задание. Нажми на центральную плашку — откроется меню урока и можно быстро переключиться.',
      p3: 'Стрелка показывает текущее задание. Галочка — что уже выполнено. Кнопка Replay позволяет пройти заново.',
      p4: 'В настройках можно выбрать язык интерфейса и управлять email‑уведомлениями.',
    },
    en: {
      title: 'Introduction',
      back: '← Back',
      h1: 'How the FaloClaro course works',
      p1: 'The course is split into modules and lessons. Each lesson has 5 tasks that lead you from words to fluent speech.',
      p2: 'Navigation: the bottom bar shows your current task. Tap the center pill to open the lesson menu and switch quickly.',
      p3: 'The arrow shows your current task. The checkmark shows completed tasks. Replay lets you do it again.',
      p4: 'In Settings you can change the interface language and manage email notifications.',
    },
  } as const;

  const langKey = language === 'ru' ? 'ru' : 'en';
  const tr = t[langKey];

  const day = params.get('day');
  const token = params.get('token');

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 bg-white z-20">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <a href="https://faloclaro.com" className="flex items-center cursor-pointer">
            <Image src="/Img/Website/logo.svg" alt="FaloClaro" width={120} height={40} className="h-10 w-auto" />
          </a>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pb-12">
        <button
          type="button"
          onClick={() => {
            if (day && token) {
              router.push(`/pt/lesson/${day}/${token}?task=1`);
              return;
            }
            router.back();
          }}
          className="text-black"
          style={{ fontSize: '16px', fontWeight: 400, lineHeight: '1.2', background: 'transparent', padding: 0, marginTop: '8px' }}
        >
          {tr.back}
        </button>

        <div style={{ marginTop: '18px' }}>
          <div style={{ fontSize: '16px', color: '#6B7280', fontWeight: 600 }}>{tr.title}</div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111', marginTop: '10px', lineHeight: '1.15' }}>{tr.h1}</h1>
          <div style={{ marginTop: '14px', fontSize: '16px', color: '#111', lineHeight: '1.5' }}>{tr.p1}</div>
          <div style={{ marginTop: '10px', fontSize: '16px', color: '#111', lineHeight: '1.5' }}>{tr.p2}</div>
          <div style={{ marginTop: '10px', fontSize: '16px', color: '#111', lineHeight: '1.5' }}>{tr.p3}</div>
          <div style={{ marginTop: '10px', fontSize: '16px', color: '#111', lineHeight: '1.5' }}>{tr.p4}</div>
        </div>
      </div>
    </div>
  );
}


