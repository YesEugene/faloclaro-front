'use client';

import { useState } from 'react';

interface WritingTaskProps {
  task: any;
  language: string;
  onComplete: (completionData?: any) => void;
  isCompleted: boolean;
}

export default function WritingTask({ task, language, onComplete, isCompleted }: WritingTaskProps) {
  const [writtenText, setWrittenText] = useState('');
  const [speakOutLoud, setSpeakOutLoud] = useState(false);

  const handleComplete = () => {
    onComplete({
      writtenText: speakOutLoud ? null : writtenText,
      speakOutLoud,
      completedAt: new Date().toISOString(),
    });
  };

  if (isCompleted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <p className="text-green-800 font-semibold">
          {task.completion_message || 'Задание выполнено'}
        </p>
      </div>
    );
  }

  const translations = {
    ru: {
      instruction: task.instruction || 'Можно написать от руки или просто сказать вслух',
      writeHere: 'Напишите здесь...',
      orSpeak: 'Или скажите вслух:',
      phrase: task.alternative?.phrase || '',
      complete: 'Завершить',
    },
    en: {
      instruction: task.instruction || 'You can write by hand or just say it out loud',
      writeHere: 'Write here...',
      orSpeak: 'Or say out loud:',
      phrase: task.alternative?.phrase || '',
      complete: 'Complete',
    },
    pt: {
      instruction: task.instruction || 'Podes escrever à mão ou apenas dizer em voz alta',
      writeHere: 'Escreve aqui...',
      orSpeak: 'Ou diz em voz alta:',
      phrase: task.alternative?.phrase || '',
      complete: 'Concluir',
    },
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  return (
    <div className="space-y-4">
      {/* Instruction */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 text-sm">{t.instruction}</p>
      </div>

      {/* Template */}
      {task.template && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-2">
            {language === 'ru' ? 'Шаблон:' : language === 'en' ? 'Template:' : 'Modelo:'}
          </p>
          {task.template.map((line: string, index: number) => (
            <p key={index} className="text-black font-mono text-sm mb-1">
              {line}
            </p>
          ))}
        </div>
      )}

      {/* Writing Area */}
      {!speakOutLoud && (
        <div>
          <textarea
            value={writtenText}
            onChange={(e) => setWrittenText(e.target.value)}
            placeholder={t.writeHere}
            className="w-full h-32 p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none text-black"
          />
        </div>
      )}

      {/* Alternative: Speak Out Loud */}
      {task.alternative?.speak_out_loud && (
        <div className="bg-gray-50 rounded-lg p-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={speakOutLoud}
              onChange={(e) => setSpeakOutLoud(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-gray-700">{t.orSpeak}</span>
          </label>
          {speakOutLoud && (
            <div className="mt-2 p-3 bg-white rounded border border-gray-200">
              <p className="text-black font-medium">{t.phrase}</p>
            </div>
          )}
        </div>
      )}

      {/* Hints */}
      {task.hints && task.hints.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800 mb-2">
            {language === 'ru' ? 'Подсказки:' : language === 'en' ? 'Hints:' : 'Dicas:'}
          </p>
          <div className="flex flex-wrap gap-2">
            {task.hints.map((hint: string, index: number) => (
              <span key={index} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">
                {hint}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Complete Button */}
      <button
        onClick={handleComplete}
        disabled={!speakOutLoud && !writtenText.trim()}
        className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {t.complete}
      </button>
    </div>
  );
}

