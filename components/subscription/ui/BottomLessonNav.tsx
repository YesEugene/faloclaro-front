'use client';

import { useMemo } from 'react';

type Lang = 'ru' | 'en' | 'pt' | string;

type Labels = {
  level1: { ru: string; en: string };
  level2: { ru: string; en: string };
};

const LABELS_BY_TASK_ID: Record<number, Labels> = {
  1: {
    level1: { ru: 'Учим слова', en: 'Learn words' },
    level2: { ru: 'Слушай и повторяй', en: 'Listen and repeat' },
  },
  2: {
    level1: { ru: 'Строим предложения', en: 'Build sentences' },
    level2: { ru: 'Учимся говорить связно', en: 'Speak fluently' },
  },
  3: {
    level1: { ru: 'Узнаем речь', en: 'Recognize speech' },
    level2: { ru: 'Понимаем на слух', en: 'Understand by ear' },
  },
  4: {
    level1: { ru: 'Улавливаем смысл', en: 'Catch meaning' },
    level2: { ru: 'Выделяем главное', en: 'Find the main idea' },
  },
  5: {
    level1: { ru: 'Практикуемся', en: 'Practice' },
    level2: { ru: 'Скажи, когда готов', en: 'Say when ready' },
  },
};

function pickText(t: { ru: string; en: string }, lang: Lang): string {
  if (lang === 'ru') return t.ru;
  // default to EN for pt/unknown
  return t.en;
}

function ArrowIcon({ direction, color }: { direction: 'left' | 'right'; color: string }) {
  const isLeft = direction === 'left';
  return (
    <svg className="w-7 h-7" fill="none" stroke={color} viewBox="0 0 24 24" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d={isLeft ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
    </svg>
  );
}

export function BottomLessonNav(props: {
  taskId: number;
  lang: Lang;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  isLastTask?: boolean;
  onNextLesson?: () => void;
}) {
  const labels = useMemo(() => LABELS_BY_TASK_ID[props.taskId] || LABELS_BY_TASK_ID[1], [props.taskId]);

  const prevEnabled = !!(props.canGoPrevious && props.onPrevious);

  const nextHandler = props.isLastTask ? props.onNextLesson : props.onNext;
  const nextEnabled = !!(props.canGoNext && nextHandler);

  const pillBg = 'rgba(255, 255, 255, 0.8)';
  const inactivePillBg = 'rgba(255, 255, 255, 0.5)';

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30"
      style={{
        height: '140px',
        background: 'linear-gradient(to top, rgba(77, 143, 255, 1) 0%, rgba(77, 143, 255, 0) 100%)',
      }}
    >
      <div
        className="max-w-md mx-auto"
        style={{
          height: '140px',
          paddingBottom: 'env(safe-area-inset-bottom, 12px)',
          paddingLeft: '16px',
          paddingRight: '16px',
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        <div className="w-full" style={{ paddingBottom: '12px' }}>
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={props.onPrevious}
              disabled={!prevEnabled}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-colors"
              style={{
                backgroundColor: prevEnabled ? pillBg : inactivePillBg,
              }}
              aria-label={props.lang === 'ru' ? 'Предыдущее задание' : 'Previous task'}
            >
              <ArrowIcon direction="left" color={prevEnabled ? '#34BF5D' : '#9CA3AF'} />
            </button>

            <div
              className="flex-1 rounded-full text-center"
              style={{
                backgroundColor: pillBg,
                paddingTop: '14px',
                paddingBottom: '14px',
                paddingLeft: '16px',
                paddingRight: '16px',
              }}
            >
              <div className="font-extrabold" style={{ fontSize: '30px', lineHeight: '1.05', color: 'rgba(0,0,0,1)' }}>
                {pickText(labels.level1, props.lang)}
              </div>
              <div style={{ fontSize: '22px', lineHeight: '1.2', color: 'rgba(0,0,0,0.55)' }}>
                {pickText(labels.level2, props.lang)}
              </div>
            </div>

            <button
              onClick={nextHandler}
              disabled={!nextEnabled}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-colors"
              style={{
                backgroundColor: nextEnabled ? pillBg : inactivePillBg,
              }}
              aria-label={props.lang === 'ru' ? 'Следующее задание' : 'Next task'}
            >
              <ArrowIcon direction="right" color={nextEnabled ? '#34BF5D' : '#9CA3AF'} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
