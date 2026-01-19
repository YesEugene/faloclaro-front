'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

type Lang = 'ru' | 'en' | 'pt' | string;

type Labels = {
  level1: { ru: string; en: string };
  level2: { ru: string; en: string };
};

const LABELS_BY_TASK_ID: Record<number, Labels> = {
  1: {
    level1: { ru: 'Учим слова', en: 'Learn words' },
    level2: { ru: 'Слушай и повторяй 10 мин', en: 'Listen and repeat (10 min)' },
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
    level2: { ru: 'Учимся выделять главное', en: 'Find the main idea' },
  },
  5: {
    level1: { ru: 'Практикуемся', en: 'Practice' },
    level2: { ru: 'Доводим речь до автоматизма', en: 'Make it automatic' },
  },
};

function pickText(t: { ru: string; en: string }, lang: Lang): string {
  if (lang === 'ru') return t.ru;
  return t.en;
}

function CheckIcon() {
  return (
    <span
      className="inline-flex items-center justify-center"
      style={{
        width: '20px',
        height: '20px',
        borderRadius: '999px',
        border: '2px solid #34BF5D',
        color: '#34BF5D',
        fontSize: '12px',
        lineHeight: '20px',
        fontWeight: 800,
      }}
    >
      ✓
    </span>
  );
}

function ArrowDownIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ArrowRightIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function LessonMenuSheet(props: {
  open: boolean;
  lang: Lang;
  tasks: Array<{ task_id: number }>;
  currentTaskId: number;
  completedTaskIds: Set<number>;
  onSelectTaskId: (taskId: number) => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const taskIds = useMemo(() => {
    const ids = props.tasks
      .map((t) => Number(t?.task_id))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 5);
    // Keep 1..5 ordering and uniqueness
    const out: number[] = [];
    for (let i = 1; i <= 5; i++) {
      if (ids.includes(i)) out.push(i);
    }
    // Fallback if tasks missing: show 1..5 anyway
    if (out.length === 0) return [1, 2, 3, 4, 5];
    return out;
  }, [props.tasks]);

  if (!mounted || !props.open) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes faloclaroSheetIn {
          0% { transform: translateY(100%); }
          72% { transform: translateY(-10px); }
          100% { transform: translateY(0); }
        }
      `}</style>
      <div
        className="fixed inset-0 z-40"
        role="dialog"
        aria-modal="true"
        aria-label={props.lang === 'ru' ? 'Меню урока' : 'Lesson menu'}
        onClick={props.onClose}
        style={{ background: 'rgba(0,0,0,0.35)' }}
      >
        <div
          className="fixed left-0 right-0"
          style={{
            bottom: 0,
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            paddingLeft: '16px',
            paddingRight: '16px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="mx-auto max-w-md bg-white shadow-2xl"
            style={{
              borderTopLeftRadius: '28px',
              borderTopRightRadius: '28px',
              borderBottomLeftRadius: '28px',
              borderBottomRightRadius: '28px',
              padding: '16px',
              animation: 'faloclaroSheetIn 280ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {/* Handle */}
            <div className="flex items-center justify-center" style={{ marginBottom: '12px' }}>
              <div
                style={{
                  width: '44px',
                  height: '5px',
                  borderRadius: '999px',
                  background: '#E5E7EB',
                }}
              />
            </div>

            <div className="space-y-3">
              {taskIds.map((taskId) => {
                const labels = LABELS_BY_TASK_ID[taskId] || LABELS_BY_TASK_ID[1];
                const isCurrent = props.currentTaskId === taskId;
                const isCompleted = props.completedTaskIds.has(taskId);

                return (
                  <button
                    key={taskId}
                    type="button"
                    onClick={() => props.onSelectTaskId(taskId)}
                    className="w-full text-left"
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '999px',
                      border: `2px solid ${isCurrent ? '#1A8CFF' : '#CED2D6'}`,
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <span className="inline-flex items-center justify-center" style={{ width: '20px', height: '20px' }}>
                      {isCurrent ? <ArrowRightIcon color="#34BF5D" /> : null}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '16px', fontWeight: 700, lineHeight: '1.2', color: '#111' }}>
                        {pickText(labels.level1, props.lang)}
                      </div>
                      <div style={{ fontSize: '14px', lineHeight: '1.2', color: '#5A5E65', marginTop: '4px' }}>
                        {pickText(labels.level2, props.lang)}
                      </div>
                    </div>

                    <span className="inline-flex items-center justify-center" style={{ width: '20px', height: '20px' }}>
                      {isCompleted ? <CheckIcon /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}


