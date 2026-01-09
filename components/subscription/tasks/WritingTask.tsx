'use client';

import { useState, useEffect } from 'react';
import { useAppLanguage } from '@/lib/language-context';

interface WritingTaskProps {
  task: any;
  language: string;
  onComplete: (completionData?: any) => void;
  isCompleted: boolean;
}

export default function WritingTask({ task, language, onComplete, isCompleted }: WritingTaskProps) {
  const { language: appLanguage } = useAppLanguage();
  const [writtenText, setWrittenText] = useState('');
  const [speakOutLoud, setSpeakOutLoud] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);

  // Reset state when replaying
  useEffect(() => {
    if (isCompleted && !isReplaying) {
      // Allow replay by resetting state
      setWrittenText('');
      setSpeakOutLoud(false);
      setShowExample(false);
    }
  }, [isCompleted, isReplaying]);

  const handleComplete = () => {
    if (speakOutLoud || writtenText.trim()) {
      onComplete({
        writtenText: speakOutLoud ? null : writtenText,
        speakOutLoud,
        completedAt: new Date().toISOString(),
      });
      setIsReplaying(false);
    }
  };

  // Don't hide task when completed - show it so user can replay
  if (!task) {
    return (
      <div className="text-center text-gray-500">
        {appLanguage === 'ru' ? 'Задание не найдено' : appLanguage === 'en' ? 'Task not found' : 'Tarefa não encontrada'}
      </div>
    );
  }

  const instructionText = task.instruction?.text || task.instruction || '';
  const mainTask = task.main_task || {};
  const template = mainTask.template || task.template || [];
  const hints = mainTask.hints || task.hints || [];
  const example = task.example || {};
  const alternative = task.alternative || {};
  const reflection = task.reflection || {};

  return (
    <div className="space-y-6 w-full">
      {/* Task Content - Full width - Always show, even if completed */}
      <div className="rounded-lg border-2 border-gray-200 p-6 w-full" style={{ backgroundColor: '#F4F5F8' }}>
        <div className="space-y-4">
          {/* Instruction */}
          {instructionText && (
            <div 
              className="rounded-lg p-4"
              style={{ 
                borderWidth: '1px',
                borderColor: 'rgba(194, 194, 194, 1)',
                borderStyle: 'solid',
                backgroundColor: '#F4F5F8'
              }}
            >
              <p className="text-black font-medium whitespace-pre-line">{instructionText}</p>
            </div>
          )}

          {/* Template */}
          {template.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-black mb-2">
                {appLanguage === 'ru' ? 'Шаблон:' : appLanguage === 'en' ? 'Template:' : 'Modelo:'}
              </p>
              {template.map((line: string, index: number) => (
                <div
                  key={index}
                  className="w-full px-4 rounded-lg flex items-center"
                  style={{
                    height: '55px',
                    backgroundColor: 'white',
                    border: 'none'
                  }}
                >
                  <p className="text-black font-mono text-sm">{line}</p>
                </div>
              ))}
            </div>
          )}

          {/* Hints */}
          {hints.length > 0 && (
            <div 
              className="rounded-lg p-4"
              style={{ 
                borderWidth: '1px',
                borderColor: 'rgba(194, 194, 194, 1)',
                borderStyle: 'solid',
                backgroundColor: '#F4F5F8'
              }}
            >
              <p className="text-sm font-semibold text-black mb-2">
                {appLanguage === 'ru' ? 'Подсказки:' : appLanguage === 'en' ? 'Hints:' : 'Dicas:'}
              </p>
              <ul className="list-disc list-inside space-y-1">
                {hints.map((hint: string, index: number) => (
                  <li key={index} className="text-sm text-black" style={{ marginTop: '2px', marginBottom: '2px' }}>
                    {hint}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Writing Area (if not using speak out loud alternative) */}
          {!speakOutLoud && (
            <div>
              <textarea
                value={writtenText}
                onChange={(e) => setWrittenText(e.target.value)}
                placeholder={appLanguage === 'ru' ? 'Напишите здесь...' : appLanguage === 'en' ? 'Write here...' : 'Escreve aqui...'}
                className="w-full px-4 py-3 rounded-lg resize-none text-black"
                style={{
                  minHeight: '120px',
                  backgroundColor: 'white',
                  border: 'none'
                }}
              />
            </div>
          )}

          {/* Example - Show by button */}
          {example.show_by_button && example.content && (
            <div className="space-y-2">
              {!showExample && (
                <button
                  onClick={() => setShowExample(true)}
                  className="w-full px-4 py-3 rounded-lg font-medium transition-colors"
                  style={{
                    backgroundColor: '#EDF3FF',
                    color: 'rgb(55, 65, 81)',
                    border: 'none'
                  }}
                >
                  {example.button_text || (appLanguage === 'ru' ? 'Показать пример' : appLanguage === 'en' ? 'Show example' : 'Mostrar exemplo')}
                </button>
              )}
              
              {showExample && (
                <div 
                  className="rounded-lg p-4"
                  style={{ 
                    borderWidth: '1px',
                    borderColor: 'rgba(194, 194, 194, 1)',
                    borderStyle: 'solid',
                    backgroundColor: '#F4F5F8'
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

          {/* Alternative: Speak Out Loud */}
          {alternative.action_button && (
            <div className="space-y-4">
              {alternative.title && (
                <p className="text-lg font-semibold text-black">{alternative.title}</p>
              )}
              
              {alternative.instruction && (
                <div 
                  className="rounded-lg p-4"
                  style={{ 
                    borderWidth: '1px',
                    borderColor: 'rgba(194, 194, 194, 1)',
                    borderStyle: 'solid',
                    backgroundColor: '#F4F5F8'
                  }}
                >
                  <p className="text-black font-medium whitespace-pre-line">{alternative.instruction}</p>
                </div>
              )}

              <button
                onClick={() => {
                  setSpeakOutLoud(true);
                  if (alternative.action_button?.completes_task) {
                    handleComplete();
                  }
                }}
                disabled={speakOutLoud || isCompleted}
                className="w-full px-4 py-3 rounded-lg font-medium transition-colors"
                style={{
                  height: '55px',
                  backgroundColor: speakOutLoud || isCompleted ? 'rgb(34, 197, 94)' : 'rgb(237, 243, 255)',
                  color: speakOutLoud || isCompleted ? 'white' : 'rgb(55, 65, 81)',
                  border: 'none'
                }}
              >
                {alternative.action_button?.text || (appLanguage === 'ru' ? '✔ Я сказал(а) вслух' : appLanguage === 'en' ? '✔ I said it out loud' : '✔ Disse em voz alta')}
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
                backgroundColor: '#F4F5F8'
              }}
            >
              <p className="text-black font-medium whitespace-pre-line">{reflection.text}</p>
            </div>
          )}
        </div>
      </div>

      {/* Complete Button (if not using alternative speak out loud) */}
      {!alternative.action_button && (
        <button
          onClick={() => {
            if (!isCompleted || isReplaying) {
              handleComplete();
            } else {
              // If already completed, allow replay by resetting
              setWrittenText('');
              setSpeakOutLoud(false);
              setShowExample(false);
              setIsReplaying(true);
            }
          }}
          disabled={!speakOutLoud && !writtenText.trim() && !isCompleted}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            isCompleted && !isReplaying
              ? 'bg-green-600 text-white hover:bg-green-700'
              : (!speakOutLoud && !writtenText.trim())
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isCompleted && !isReplaying
            ? (appLanguage === 'ru' ? 'Пройти заново' : appLanguage === 'en' ? 'Replay' : 'Repetir')
            : (appLanguage === 'ru' ? 'Завершить' : appLanguage === 'en' ? 'Complete' : 'Concluir')}
        </button>
      )}

      {/* Navigation Panel - Fixed at bottom (Cross-task navigation) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div className="max-w-md mx-auto px-4 pt-[10px] pb-3" style={{ height: '70px' }}>
          <div className="flex gap-3">
            {canGoPrevious && onPreviousTask && (
              <button
                onClick={onPreviousTask}
                className="flex-1 px-4 py-3 rounded-[10px] bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors text-center font-medium"
              >
                ← {appLanguage === 'ru' ? 'Предыдущее задание' : appLanguage === 'en' ? 'Previous task' : 'Tarefa anterior'}
              </button>
            )}
            {canGoNext && onNextTask && (
              <button
                onClick={onNextTask}
                className={`${canGoPrevious && onPreviousTask ? 'flex-1' : 'w-full'} px-4 py-3 rounded-[10px] bg-green-500 text-white hover:bg-green-600 transition-colors text-center font-medium`}
              >
                {appLanguage === 'ru' ? 'Следующее задание' : appLanguage === 'en' ? 'Next task' : 'Próxima tarefa'} →
              </button>
            )}
            {!canGoPrevious && !canGoNext && (
              <div className="flex-1"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
