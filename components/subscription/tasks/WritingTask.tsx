'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppLanguage } from '@/lib/language-context';
import { getTranslatedText } from '@/lib/lesson-translations';
import { BottomLessonNav } from '@/components/subscription/ui/BottomLessonNav';
import { ReplayPill } from '@/components/subscription/ui/ReplayPill';

interface WritingTaskProps {
  task: any;
  language: string;
  onComplete: (completionData?: any) => void;
  isCompleted: boolean;
  savedWrittenText?: string | null;
  savedSpeakOutLoud?: boolean;
  onNextTask?: () => void;
  onPreviousTask?: () => void;
  onNextLesson?: () => void;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  isLastTask?: boolean;
  progressCompleted?: number;
  progressTotal?: number;
  dayNumber?: number;
  onOpenLessonMenu?: () => void;
  lessonMenuOpen?: boolean;
}

export default function WritingTask({ task, language, onComplete, isCompleted, savedWrittenText, savedSpeakOutLoud, onNextTask, onPreviousTask, onNextLesson, canGoNext = false, canGoPrevious = false, isLastTask = false, progressCompleted = 0, progressTotal = 5, dayNumber, onOpenLessonMenu, lessonMenuOpen }: WritingTaskProps) {
  const { language: appLanguage } = useAppLanguage();
  const [writtenText, setWrittenText] = useState(savedWrittenText || '');
  const [speakOutLoud, setSpeakOutLoud] = useState(savedSpeakOutLoud || false);
  const [showExample, setShowExample] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [localIsCompleted, setLocalIsCompleted] = useState(isCompleted);
  const [showTooltip, setShowTooltip] = useState(false);

  // Get progress message based on completed tasks
  const getProgressMessage = (completed: number, total: number) => {
    if (appLanguage === 'ru') {
      if (completed === 1) return 'Назад дороги нет.';
      if (completed === 2) return 'Поймали ритм.';
      if (completed === 3) return 'Ты просто Вау!';
      if (completed === 4) return 'Почти финиш.';
      if (completed === 5) return 'Можно собой гордиться.';
      return '';
    } else if (appLanguage === 'en') {
      if (completed === 1) return 'No turning back.';
      if (completed === 2) return 'Catching the rhythm.';
      if (completed === 3) return "You're just Wow!";
      if (completed === 4) return 'Almost finish.';
      if (completed === 5) return 'You can be proud.';
      return '';
    } else {
      if (completed === 1) return 'Não há volta.';
      if (completed === 2) return 'Pegando o ritmo.';
      if (completed === 3) return 'Você é simplesmente Uau!';
      if (completed === 4) return 'Quase no fim.';
      if (completed === 5) return 'Pode se orgulhar.';
      return '';
    }
  };

  // Load saved data on mount
  const [hasLoadedSavedData, setHasLoadedSavedData] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!hasLoadedSavedData) {
      if (savedWrittenText !== undefined && savedWrittenText !== null) {
        setWrittenText(savedWrittenText);
      }
      if (savedSpeakOutLoud !== undefined) {
        setSpeakOutLoud(savedSpeakOutLoud);
      }
      setHasLoadedSavedData(true);
    }
  }, [savedWrittenText, savedSpeakOutLoud, hasLoadedSavedData]);

  // Auto-resize textarea when writtenText changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(120, textareaRef.current.scrollHeight)}px`;
    }
  }, [writtenText]);

  // Update local completion state when prop changes
  useEffect(() => {
    if (!isReplaying) {
      setLocalIsCompleted(isCompleted);
    }
  }, [isCompleted, isReplaying]);
  
  // Save answers to completion_data whenever they change (for persistence)
  // BUT only if task is not completed yet - don't overwrite completion
  useEffect(() => {
    if (hasLoadedSavedData && !isReplaying && !localIsCompleted && (writtenText.trim() || speakOutLoud)) {
      // Save current state to completion_data without marking as completed
      onComplete({
        writtenText: speakOutLoud ? null : writtenText,
        speakOutLoud,
        saved: true, // Flag to indicate this is just saving, not completing
      });
    }
  }, [writtenText, speakOutLoud, hasLoadedSavedData, localIsCompleted]);

  const handleComplete = (forceSpeakOutLoud?: boolean) => {
    // Writing task is optional - can be completed without filling the form
    // If user clicked "I said it out loud" button, complete immediately
    // Otherwise, allow completion even if form is empty
    const shouldComplete = !!(forceSpeakOutLoud || speakOutLoud); // Complete only on "I said it out loud"
    if (shouldComplete) {
      // Update local state first to show "Пройти заново" button immediately
      if (forceSpeakOutLoud) {
        setSpeakOutLoud(true);
      }
      
      // Set local completion state immediately
      setLocalIsCompleted(true);
      
      // Call onComplete to update database and parent state
      onComplete({
        writtenText: (forceSpeakOutLoud || speakOutLoud) ? null : writtenText,
        speakOutLoud: forceSpeakOutLoud || speakOutLoud,
        completedAt: new Date().toISOString(),
      });
      setIsReplaying(false);
    }
  };

  const handleReplay = () => {
    setWrittenText('');
    setSpeakOutLoud(false);
    setShowExample(false);
    setIsReplaying(true);
    setLocalIsCompleted(false);
    
    onComplete({
      writtenText: '',
      speakOutLoud: false,
      replay: true,
    });
    
    setTimeout(() => {
      setIsReplaying(false);
    }, 100);
  };

  // Don't hide task when completed - show it so user can replay
  if (!task) {
    return (
      <div className="text-center text-gray-500">
        {appLanguage === 'ru' ? 'Задание не найдено' : appLanguage === 'en' ? 'Task not found' : 'Tarefa não encontrada'}
      </div>
    );
  }

  const instructionText = getTranslatedText(task.instruction?.text || task.instruction, appLanguage);
  const mainTask = task.main_task || {};
  // Template can be:
  // - string[] (frontend format)
  // - parts[] from admin modal: [{ type: 'text', text }, { type: 'input', placeholder }]
  // Normalize to string[] so we never render objects (React #31).
  const normalizeTemplateToLines = (tpl: any): string[] => {
    if (!tpl) return [];
    if (!Array.isArray(tpl)) return [];
    if (tpl.length === 0) return [];

    // If it's already string[]
    if (typeof tpl[0] === 'string') {
      return tpl.map((x: any) => String(x ?? '')).filter(Boolean);
    }

    // If it's parts[]
    if (typeof tpl[0] === 'object') {
      let s = '';
      for (const part of tpl) {
        if (!part || typeof part !== 'object') continue;
        if (part.type === 'text') {
          s += String(part.text ?? '');
        } else if (part.type === 'input') {
          // Render input as blanks
          s += '__________';
        } else {
          // Unknown part type - ignore safely
        }
      }
      return s
        .split('\n')
        .map(line => line.trimEnd())
        .filter(line => line.trim().length > 0);
    }

    return [];
  };

  const template = normalizeTemplateToLines(mainTask.template || task.template || mainTask.template_parts || []);
  const hints = mainTask.hints || task.hints || [];
  const example = task.example || {};
  const alternative = task.alternative || {};
  const reflection = task.reflection || {};

  const taskTitle =
    getTranslatedText(task.title, appLanguage) ||
    (appLanguage === 'ru'
      ? 'Напиши от руки или проговори вслух'
      : appLanguage === 'en'
        ? 'Write by hand or say out loud'
        : 'Escreva à mão ou diga em voz alta');

  const taskSubtitle =
    getTranslatedText(task.subtitle, appLanguage) ||
    instructionText ||
    '';

  const writeAnswerTitle =
    getTranslatedText(task.ui_texts?.write_answer_title, appLanguage) ||
    (appLanguage === 'ru' ? 'Напиши ответ' : appLanguage === 'en' ? 'Write your answer' : 'Escreva sua resposta');

  const showExampleLabel =
    getTranslatedText(task.ui_texts?.show_example_label, appLanguage) ||
    getTranslatedText(example.button_text, appLanguage) ||
    (appLanguage === 'ru' ? 'Показать пример' : appLanguage === 'en' ? 'Show example' : 'Mostrar exemplo');

  const speakSubtitle =
    getTranslatedText(task.ui_texts?.speak_subtitle, appLanguage) ||
    getTranslatedText(alternative.instruction, appLanguage) ||
    (appLanguage === 'ru'
      ? 'Если не хочется писать, тогда просто скажи всё вслух, как цельную речь.'
      : appLanguage === 'en'
        ? "If you don’t want to write, just say everything out loud as one coherent speech."
        : 'Se não quiser escrever, diga tudo em voz alta como uma fala completa.');

  return (
    <div className="space-y-6 w-full" style={{ paddingBottom: '140px' }}>
      {/* Task Content - Full width - Always show, even if completed */}
      <div
        className="border-2 border-gray-200 p-6 w-full"
        style={{ backgroundColor: '#F4F5F8', borderRadius: '20px' }}
      >
        <div className="space-y-4">
          {/* Block indicator - Writing task is always block 1/1 */}
          <div className="text-sm text-gray-500 mb-2">
            {appLanguage === 'ru' 
              ? `Блок 1 / 1`
              : appLanguage === 'en'
              ? `Block 1 / 1`
              : `Bloco 1 / 1`}
          </div>
          
          {/* Title (editable in admin via task.title) */}
          <h3 className="text-xl font-bold text-black mb-4">
            {taskTitle}
          </h3>

          {/* Subtitle (editable in admin via task.subtitle) */}
          {taskSubtitle && (
            <p className="text-gray-700 whitespace-pre-line mb-4" style={{ fontSize: '18px', lineHeight: '1.35' }}>
              {taskSubtitle}
            </p>
          )}

          {/* Template */}
          {template.length > 0 && (
            <div className="space-y-2">
              <div
                className="w-full rounded-2xl px-6 py-5"
                style={{
                  backgroundColor: 'white',
                  border: '1px solid rgba(194, 194, 194, 1)',
                }}
              >
                {template.map((line: string, index: number) => (
                  <p
                    key={index}
                    className="text-black font-bold"
                    style={{
                      fontSize: '26px',
                      lineHeight: '1.35',
                      letterSpacing: '-0.01em',
                      marginTop: index === 0 ? 0 : '10px',
                    }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Writing Area (if not using speak out loud alternative) */}
          {!speakOutLoud && (
            <div>
              <p className="text-black font-semibold" style={{ fontSize: '22px' }}>
                {writeAnswerTitle}
              </p>
              <textarea
                ref={textareaRef}
                value={writtenText}
                onChange={(e) => {
                  setWrittenText(e.target.value);
                  // Auto-resize textarea to fit content
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.max(120, e.target.scrollHeight)}px`;
                }}
                placeholder={appLanguage === 'ru' ? 'Напишите здесь...' : appLanguage === 'en' ? 'Write here...' : 'Escreve aqui...'}
                className="w-full px-4 py-3 rounded-lg resize-none text-black overflow-hidden"
                style={{
                  minHeight: '120px',
                  backgroundColor: 'white',
                  border: 'none',
                  height: 'auto'
                }}
              />
            </div>
          )}

          {/* Show example button + example content */}
          {example.show_by_button && Array.isArray(example.content) && example.content.length > 0 && (
            <div className="space-y-2">
              {!showExample ? (
                <button
                  onClick={() => setShowExample(true)}
                  className="flex items-center gap-3 text-left"
                  style={{ color: '#111827' }}
                >
                  <span style={{ fontSize: '22px', lineHeight: '22px' }}>👁</span>
                  <span style={{ fontSize: '20px', fontWeight: 500 }}>{showExampleLabel}</span>
                </button>
              ) : (
                <div
                  className="rounded-lg p-4"
                  style={{
                    borderWidth: '1px',
                    borderColor: 'rgba(194, 194, 194, 1)',
                    borderStyle: 'solid',
                    backgroundColor: '#F4F5F8',
                  borderRadius: '20px',
                  }}
                >
                  <p className="text-sm font-semibold text-black mb-2">
                    {appLanguage === 'ru' ? 'Пример:' : appLanguage === 'en' ? 'Example:' : 'Exemplo:'}
                  </p>
                  {example.content.map((line: string, index: number) => (
                    <p key={index} className="text-black font-medium mb-1">
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Speak out loud section */}
          {alternative.action_button && (
            <div className="space-y-4">
              {/* Subtitle before button (editable via task.ui_texts.speak_subtitle or alternative.instruction) */}
              {speakSubtitle && (
                <p className="text-gray-700 whitespace-pre-line mb-4">
                  {speakSubtitle}
                </p>
              )}

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (speakOutLoud) return; // uncheck only via Replay
                  setSpeakOutLoud(true);
                  handleComplete(true);
                }}
                disabled={speakOutLoud}
                className="w-full text-left transition-colors flex items-center"
                style={{
                  backgroundColor: 'white',
                  border: '1.5px solid #CED2D6',
                  borderRadius: '18px',
                  height: '50px',
                  padding: '0 18px',
                  gap: '14px',
                  cursor: speakOutLoud ? 'default' : 'pointer',
                }}
              >
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    border: '1.5px solid #1A8CFF',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    background: '#fff',
                  }}
                >
                  {speakOutLoud ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34BF5D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : null}
                </span>
                <span style={{ fontSize: '16px', fontWeight: 500, color: '#000' }}>
                  {String(getTranslatedText(alternative.action_button?.text, appLanguage) || (appLanguage === 'ru' ? 'Я сказал(а) вслух' : 'I said it out loud')).replace(/^[✔✓]\s*/u, '')}
                </span>
              </button>
            </div>
          )}

          {/* Reflection (optional) */}
          {reflection.text && reflection.optional && speakOutLoud && (
            <div 
              className="rounded-lg p-4 mt-4"
              style={{ 
                borderWidth: '1px',
                borderColor: 'rgba(194, 194, 194, 1)',
                borderStyle: 'solid',
                backgroundColor: '#F4F5F8',
                  borderRadius: '20px'
              }}
            >
              <p className="text-black font-medium whitespace-pre-line">{getTranslatedText(reflection.text, appLanguage)}</p>
            </div>
          )}
        </div>
      </div>




      {/* Replay Button - Floating above navigation panel, show after completion */}
      {localIsCompleted && !isReplaying && (
        <ReplayPill lang={appLanguage} onClick={handleReplay} />
      )}

{/* Navigation Panel */}
      <BottomLessonNav
            taskId={task?.task_id || 5}
            lang={appLanguage}
            canGoPrevious={canGoPrevious && !!onPreviousTask}
            canGoNext={localIsCompleted && ((isLastTask && !!onNextLesson) || (!isLastTask && !!onNextTask))}
            onPrevious={onPreviousTask}
            onNext={onNextTask}
            isLastTask={isLastTask}
            onNextLesson={onNextLesson}
            onOpenMenu={onOpenLessonMenu}
            menuOpen={!!lessonMenuOpen}
          />
    </div>
  );
}
