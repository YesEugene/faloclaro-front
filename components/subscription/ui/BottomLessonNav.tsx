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
    <svg className="w-6 h-6" fill="none" stroke={color} viewBox="0 0 24 24" strokeWidth={3}>
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

  const prevVisible = props.taskId !== 1;
  const prevEnabled = !!(props.canGoPrevious && props.onPrevious) && prevVisible;

  const nextHandler = props.isLastTask ? props.onNextLesson : props.onNext;
  const nextEnabled = !!(props.canGoNext && nextHandler);

  const pillBg = 'rgba(255, 255, 255, 0.8)';
  const inactivePillBg = 'rgba(255, 255, 255, 0.5)';

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30"
      style={{
        height: 'calc(120px + env(safe-area-inset-bottom, 0px))',
        background: 'linear-gradient(to top, rgba(77, 143, 255, 1) 0%, rgba(77, 143, 255, 0) 100%)',
      }}
    >
      <div
        className="max-w-md mx-auto"
        style={{
          height: 'calc(120px + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: '16px',
          paddingRight: '16px',
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        <div className="w-full" style={{ paddingBottom: '12px' }}>
          <div className="flex items-center justify-between gap-4">
            {prevVisible ? (
              <button
              onClick={props.onPrevious}
              disabled={!prevEnabled}
              className="w-[50px] h-[50px] rounded-full flex items-center justify-center transition-colors"
              style={{
                backgroundColor: prevEnabled ? pillBg : inactivePillBg,
              }}
              aria-label={props.lang === 'ru' ? 'Предыдущее задание' : 'Previous task'}
            >
              <ArrowIcon direction="left" color={prevEnabled ? '#34BF5D' : '#9CA3AF'} />
            </button>
            ) : (
              <div style={{ width: '50px', height: '50px' }} />
            )}


            <div
              className="flex-1 rounded-full text-center"
              style={{
                backgroundColor: pillBg,
                height: '50px',
                paddingLeft: '16px',
                paddingRight: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              <div style={{ fontSize: '14px', lineHeight: '1.25', color: 'rgba(0,0,0,1)' }}>
                {pickText(labels.level1, props.lang)}
              </div>
              <div style={{ fontSize: '12px', lineHeight: '1.25', color: '#5A5E65' }}>
                {pickText(labels.level2, props.lang)}
              </div>
            </div>

            <button
              onClick={nextHandler}
              disabled={!nextEnabled}
              className="w-[50px] h-[50px] rounded-full flex items-center justify-center transition-colors"
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
