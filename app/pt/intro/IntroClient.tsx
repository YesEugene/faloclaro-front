'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAppLanguage } from '@/lib/language-context';
import { SettingsPanel } from '@/components/subscription/ui/SettingsPanel';
import { CourseMenuDrawer } from '@/components/subscription/ui/CourseMenuDrawer';

function SectionChevron({ open }: { open: boolean }) {
  const d = open ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function PlaceholderGraphic({ height = 140 }: { height?: number }) {
  return (
    <div
      style={{
        width: '100%',
        height: `${height}px`,
        borderRadius: '16px',
        background: 'linear-gradient(180deg, #F3F4F6 0%, #E5E7EB 100%)',
        border: '1px solid #E5E7EB',
      }}
    />
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul
      style={{
        marginTop: '10px',
        paddingLeft: '22px',
        color: '#111',
        fontSize: '18px',
        lineHeight: '1.6',
        listStyleType: 'disc',
        listStylePosition: 'outside',
      }}
    >
      {items.map((it, idx) => (
        <li key={idx} style={{ marginTop: idx === 0 ? '0px' : '6px' }}>
          {it}
        </li>
      ))}
    </ul>
  );
}

export default function IntroClient() {
  const params = useSearchParams();
  const { language } = useAppLanguage();

  const day = Number(params.get('day') || '1');
  const token = String(params.get('token') || '');

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [courseMenuOpen, setCourseMenuOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    course: true,
  });

  const langKey = language === 'ru' ? 'ru' : 'en';

  const strings = useMemo(
    () => ({
      ru: {
        menuCourse: 'Меню курса',
        introLabel: 'Введение',
        hero: 'Добро пожаловать в FaloClaro',
        lead:
          'Ты уже внутри. Отлично!\nСейчас мы коротко покажем, как устроен курс и интерфейс, чтобы тебе было легко ориентироваться и учиться без лишнего напряжения.',
        note:
          'FaloClaro — это практический курс.\nЗдесь ты постепенно учишься понимать речь и говорить связно, а не просто запоминать отдельные слова.',
        sections: {
          course: 'Как устроен курс',
          find: 'Как найти уроки',
          settings: 'Настройки и профиль',
          how: 'Как проходить уроки',
          t1: 'Задание «Учим слова»',
          taskmenu: 'Меню заданий урока',
          t234: 'Задания 2, 3 и 4',
          t5: 'Задание «Практикуемся»',
          start: 'Можно начинать',
        },
      },
      en: {
        menuCourse: 'Course menu',
        introLabel: 'Intro',
        hero: 'Welcome to FaloClaro',
        lead:
          'You’re in. Great!\nNow we’ll quickly show how the course and interface work, so it’s easy to navigate and learn without extra stress.',
        note:
          'FaloClaro is a practical course.\nHere you gradually learn to understand speech and speak fluently — not just memorize individual words.',
        sections: {
          course: 'How the course is structured',
          find: 'How to find lessons',
          settings: 'Settings and profile',
          how: 'How to take lessons',
          t1: 'Task “Learn words”',
          taskmenu: 'Lesson task menu',
          t234: 'Tasks 2, 3 and 4',
          t5: 'Task “Practice”',
          start: 'You can start now',
        },
      },
    }),
    []
  );

  const s = strings[langKey];

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderRuSectionBody = (key: string) => {
    switch (key) {
      case 'course':
        return (
          <>
            <div style={{ fontSize: '18px', color: '#111', lineHeight: '1.6' }}>Курс состоит из 4 модулей.</div>
            <div style={{ marginTop: '12px' }}>
              <Image
                src="/Img/Website/Onboarding 2 RU.png"
                alt="Как устроен модуль"
                width={1200}
                height={900}
                style={{ width: '100%', height: 'auto', borderRadius: '16px', border: '1px solid #E5E7EB' }}
              />
            </div>
            <div style={{ marginTop: '10px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Каждый модуль — это отдельный этап обучения:
            </div>
            <BulletList
              items={[
                'привыкание к звучанию языка',
                'понимание смысла',
                'развитие связной речи',
              ]}
            />
            <div style={{ marginTop: '12px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              В каждом модуле 14–15 уроков.
              <br />
              Каждый такой блок дает тебе новый уровень уверенности в языке.
            </div>
          </>
        );
      case 'find':
        return (
          <>
            <div style={{ fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Чтобы увидеть все уроки, нажми кнопку «Меню курса».
            </div>
            <div style={{ marginTop: '12px' }}>
              <Image
                src="/Img/Website/Onboarding 1 RU.png"
                alt="Как найти урок"
                width={1200}
                height={900}
                style={{ width: '100%', height: 'auto', borderRadius: '16px', border: '1px solid #E5E7EB' }}
              />
            </div>
            <div style={{ marginTop: '10px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Откроется боковое меню, где ты увидишь:
            </div>
            <BulletList
              items={[
                'текущий урок',
                'какие уроки уже пройдены',
                'куда можно вернуться',
              ]}
            />
            <div style={{ marginTop: '12px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Это основная навигация по курсу.
            </div>
          </>
        );
      case 'settings':
        return (
          <>
            <div style={{ fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              В правом верхнем углу есть иконка шестеренки. Это настройки.
            </div>
            <div style={{ marginTop: '12px' }}>
              <Image
                src="/Img/Website/Onboarding 3 RU.png"
                alt="Настройки и профиль"
                width={1200}
                height={900}
                style={{ width: '100%', height: 'auto', borderRadius: '16px', border: '1px solid #E5E7EB' }}
              />
            </div>
            <div style={{ marginTop: '10px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Здесь ты можешь:
            </div>
            <BulletList
              items={[
                'выбрать язык интерфейса',
                'изменить e-mail',
                'управлять подпиской и уведомлениями',
              ]}
            />
            <div style={{ marginTop: '12px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Все основные параметры находятся в одном месте.
            </div>
          </>
        );
      case 'how':
        return (
          <>
            <div style={{ fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              В каждом уроке есть 5 заданий.
            </div>
            <div style={{ marginTop: '10px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Ты можешь открыть любое, но мы рекомендуем идти по порядку от первого до пятого.
            </div>
            <div style={{ marginTop: '10px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Так обучение работает лучше:
            </div>
            <BulletList
              items={[
                'сначала ты набираешь словарный запас',
                'затем учишься соединять слова',
                'в конце начинаешь говорить связно',
              ]}
            />
            <div style={{ marginTop: '12px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Не спеши проходить много уроков подряд.
              <br />
              Лучше хорошо закрепить один, чем быстро пролистать несколько.
            </div>
          </>
        );
      case 't1':
        return (
          <>
            <div style={{ fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Это основа каждого урока.
            </div>
            <div style={{ marginTop: '10px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Мы рекомендуем уделять этому заданию минимум 10 минут. Для этого есть таймер.
            </div>
            <div style={{ marginTop: '10px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Обычно ты изучаешь около 10 новых слов, но:
            </div>
            <BulletList
              items={[
                'слова могут повторяться, это нормально и полезно',
                'эти же слова используются в следующих заданиях',
              ]}
            />
            <div style={{ marginTop: '12px' }}>
              <Image
                src="/Img/Website/Onboarding 5 RU.png"
                alt="Задание «Учим слова»"
                width={1200}
                height={900}
                style={{ width: '100%', height: 'auto', borderRadius: '16px', border: '1px solid #E5E7EB' }}
              />
            </div>
            <div style={{ marginTop: '12px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Если ты уверенно понимаешь все слова, переходи дальше.
            </div>

            <div style={{ marginTop: '14px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              А еще под кнопкой ▶ Play есть кнопка с ползунками. Это настройки воспроизведения.
            </div>
            <div style={{ marginTop: '10px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Ты можешь:
            </div>
            <BulletList
              items={[
                'менять скорость речи',
                'настраивать паузы',
                'выбирать количество повторений',
                'включать случайный порядок слов',
              ]}
            />
            <div style={{ marginTop: '12px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Настрой под себя. Так учиться проще и комфортнее.
            </div>
            <div style={{ marginTop: '12px' }}>
              <Image
                src="/Img/Website/Onboarding 6 RU.png"
                alt="Настройки воспроизведения"
                width={1200}
                height={900}
                style={{ width: '100%', height: 'auto', borderRadius: '16px', border: '1px solid #E5E7EB' }}
              />
            </div>
          </>
        );
      case 'taskmenu':
        return (
          <>
            <div style={{ fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Если нажать на нижнюю панель с названием задания, откроется меню урока.
            </div>
            <div style={{ marginTop: '12px' }}>
              <Image
                src="/Img/Website/Onboarding 4 RU.png"
                alt="Меню заданий"
                width={1200}
                height={900}
                style={{ width: '100%', height: 'auto', borderRadius: '16px', border: '1px solid #E5E7EB' }}
              />
            </div>
            <div style={{ marginTop: '10px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Там ты увидишь:
            </div>
            <BulletList
              items={[
                'все 5 заданий',
                'какие уже выполнены',
                'какие еще впереди',
              ]}
            />
            <div style={{ marginTop: '12px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Также можно использовать кнопки «вперед» и «назад».
            </div>
          </>
        );
      case 't234':
        return (
          <>
            <div style={{ fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Во втором, третьем и четвертом заданиях просто следуй шагам на экране.
            </div>
            <div style={{ marginTop: '10px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              После прохождения появится кнопка «Пройти заново».
              <br />
              Если хочешь повторить материал, смело используй ее.
            </div>
            <div style={{ marginTop: '12px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Повтор — это часть обучения.
            </div>
          </>
        );
      case 't5':
        return (
          <>
            <div style={{ fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Это самый важный этап урока.
            </div>
            <div style={{ marginTop: '10px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Здесь ты:
            </div>
            <BulletList
              items={[
                'собираешь фразы',
                'говоришь вслух',
                'используешь все, что выучил(а) в уроке',
              ]}
            />
            <div style={{ marginTop: '12px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Если что-то забыл, есть подсказки.
              <br />
              Главная цель — живая уверенная речь, а не идеальные правила.
            </div>
          </>
        );
      case 'start':
        return (
          <>
            <div style={{ fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Теперь ты знаешь, как все работает.
            </div>
            <div style={{ marginTop: '10px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Двигайся шаг за шагом, не спеши и регулярно возвращайся к практике.
            </div>
            <div style={{ marginTop: '10px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Добро пожаловать в FaloClaro. Давай говорить по-португальски! 🇵🇹
            </div>
          </>
        );
      default:
        return (
          <div style={{ fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
            {langKey === 'ru' ? 'Этот блок скоро будет дополнен.' : 'This section will be filled in soon.'}
          </div>
        );
    }
  };

  const renderEnSectionBody = (key: string) => {
    switch (key) {
      case 'course':
        return (
          <>
            <div style={{ fontSize: '18px', color: '#111', lineHeight: '1.6' }}>The course has 4 modules.</div>
            <div style={{ marginTop: '10px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Each module is a separate learning stage:
            </div>
            <BulletList
              items={[
                'getting used to how the language sounds',
                'understanding meaning',
                'building fluent connected speech',
              ]}
            />
            <div style={{ marginTop: '12px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Each module includes 14–15 lessons.
              <br />
              Each block gives you a new level of confidence in the language.
            </div>
          </>
        );
      case 'find':
        return (
          <>
            <div style={{ fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              To see all lessons, tap “Course menu”.
            </div>
            <div style={{ marginTop: '10px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              A side menu will open where you’ll see:
            </div>
            <BulletList
              items={[
                'your current lesson',
                'which lessons you’ve already completed',
                'where you can return',
              ]}
            />
            <div style={{ marginTop: '12px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              This is the main navigation for the course.
            </div>
          </>
        );
      case 'settings':
        return (
          <>
            <div style={{ fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              In the top-right corner there’s a gear icon — that’s Settings.
            </div>
            <div style={{ marginTop: '10px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Here you can:
            </div>
            <BulletList
              items={[
                'choose the interface language',
                'change your email',
                'manage your subscription and notifications',
              ]}
            />
            <div style={{ marginTop: '12px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              All key settings are in one place.
            </div>
          </>
        );
      case 'how':
        return (
          <>
            <div style={{ fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Each lesson has 5 tasks.
            </div>
            <div style={{ marginTop: '10px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              You can open any task, but we recommend going in order from the first to the fifth.
            </div>
            <div style={{ marginTop: '10px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              This works better because:
            </div>
            <BulletList
              items={[
                'first you build your vocabulary',
                'then you learn to connect words',
                'at the end you start speaking fluently',
              ]}
            />
            <div style={{ marginTop: '12px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Don’t rush through many lessons in a row.
              <br />
              It’s better to fully master one lesson than quickly scroll through several.
            </div>
          </>
        );
      case 't1':
        return (
          <>
            <div style={{ fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              This is the foundation of every lesson.
            </div>
            <div style={{ marginTop: '10px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              We recommend spending at least 10 minutes here — there’s a timer for that.
            </div>
            <div style={{ marginTop: '10px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Usually you learn about 10 new words, but:
            </div>
            <BulletList
              items={[
                'words may repeat — that’s normal and helpful',
                'the same words will be used in the next tasks',
              ]}
            />
            <div style={{ marginTop: '12px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              If you confidently understand all words, move on.
            </div>
            <div style={{ marginTop: '14px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Also, under the ▶ Play button there’s a sliders button — playback settings.
            </div>
            <div style={{ marginTop: '10px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              You can:
            </div>
            <BulletList
              items={[
                'change speech speed',
                'adjust pauses',
                'choose how many repeats',
                'enable random word order',
              ]}
            />
            <div style={{ marginTop: '12px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Tune it for yourself — learning becomes easier and more comfortable.
            </div>
          </>
        );
      case 'taskmenu':
        return (
          <>
            <div style={{ fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              If you tap the bottom panel with the task name, the lesson menu opens.
            </div>
            <div style={{ marginTop: '10px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              There you’ll see:
            </div>
            <BulletList
              items={[
                'all 5 tasks',
                'what’s already completed',
                'what’s still ahead',
              ]}
            />
            <div style={{ marginTop: '12px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              You can also use the “next” and “back” buttons.
            </div>
          </>
        );
      case 't234':
        return (
          <>
            <div style={{ fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              In Tasks 2, 3, and 4, just follow the steps on the screen.
            </div>
            <div style={{ marginTop: '10px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              After finishing, a “Replay” button appears.
              <br />
              If you want to repeat the material — use it freely.
            </div>
            <div style={{ marginTop: '12px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Repetition is part of learning.
            </div>
          </>
        );
      case 't5':
        return (
          <>
            <div style={{ fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              This is the most important part of the lesson.
            </div>
            <div style={{ marginTop: '10px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Here you:
            </div>
            <BulletList
              items={[
                'build phrases',
                'say them out loud',
                'use everything you learned in the lesson',
              ]}
            />
            <div style={{ marginTop: '12px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              If you forget something — there are hints.
              <br />
              The main goal is live, confident speech — not perfect rules.
            </div>
          </>
        );
      case 'start':
        return (
          <>
            <div style={{ fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Now you know how everything works.
            </div>
            <div style={{ marginTop: '10px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Move step by step, don’t rush, and come back to practice regularly.
            </div>
            <div style={{ marginTop: '10px', fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
              Welcome to FaloClaro. Let’s speak Portuguese! 🇵🇹
            </div>
          </>
        );
      default:
        return (
          <div style={{ fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
            This section will be filled in soon.
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header (same style as lessons) */}
      <div className="sticky top-0 bg-white z-20" style={{ borderBottomWidth: '0px', borderWidth: '0px' }}>
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <a href="https://faloclaro.com" className="flex items-center cursor-pointer">
            <Image src="/Img/Website/logo.svg" alt="FaloClaro" width={120} height={40} className="h-10 w-auto" style={{ width: 'auto', height: '40px' }} />
          </a>

          <div className="flex items-center">
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              style={{ width: '29px', height: '29px', padding: 0, background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <Image src="/Img/Website/Settings.svg" alt="Settings" width={29} height={29} style={{ width: '29px', height: '29px' }} />
            </button>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4" style={{ paddingBottom: '10px', position: 'relative', zIndex: 20 }}>
          <div className="flex items-center justify-between" style={{ gap: '12px' }}>
            <button
              onClick={() => setCourseMenuOpen(true)}
              className="text-black"
              style={{
                fontSize: '16px',
                fontWeight: 400,
                lineHeight: '1.2',
                background: 'transparent',
                padding: 0,
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 19l-7-7 7-7" />
                </svg>
                <span>{s.menuCourse}</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} lessonToken={token} />
      <CourseMenuDrawer
        open={courseMenuOpen}
        lang={language}
        currentDay={day}
        currentToken={token}
        activeEntry="intro"
        onClose={() => setCourseMenuOpen(false)}
      />

      {/* Content */}
      <div className="max-w-md mx-auto px-4 pb-12">
        <div style={{ marginTop: '18px' }}>
          <div style={{ fontSize: '16px', color: '#6B7280', fontWeight: 600 }}>{s.introLabel}</div>
          <h1 style={{ fontSize: '40px', fontFamily: 'Orelega One', fontWeight: 400, color: '#111', marginTop: '10px', lineHeight: '1.05' }}>{s.hero}</h1>
          <div style={{ marginTop: '14px', fontSize: '18px', color: '#111', lineHeight: '1.55', whiteSpace: 'pre-line' }}>{s.lead}</div>
          <div style={{ marginTop: '14px', fontSize: '18px', color: '#111', lineHeight: '1.55', whiteSpace: 'pre-line' }}>{s.note}</div>
        </div>

        {/* Accordion sections */}
        <div style={{ marginTop: '16px' }}>
          {(
            [
              { key: 'course', title: s.sections.course },
              { key: 'find', title: s.sections.find },
              { key: 'settings', title: s.sections.settings },
              { key: 'how', title: s.sections.how },
              { key: 't1', title: s.sections.t1 },
              { key: 'taskmenu', title: s.sections.taskmenu },
              { key: 't234', title: s.sections.t234 },
              { key: 't5', title: s.sections.t5 },
              { key: 'start', title: s.sections.start },
            ] as const
          ).map((item) => {
            const isOpen = !!openSections[item.key];
            return (
              <div key={item.key} style={{ borderTop: '1px solid #E5E7EB' }}>
                <button
                  type="button"
                  onClick={() => toggleSection(item.key)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '18px 0',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#111' }}>{item.title}</div>
                  <SectionChevron open={isOpen} />
                </button>

                {isOpen && (
                  <div style={{ paddingBottom: '18px' }}>
                    {langKey === 'ru' ? renderRuSectionBody(item.key) : renderEnSectionBody(item.key)}
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ borderTop: '1px solid #E5E7EB' }} />
        </div>
      </div>
    </div>
  );
}


