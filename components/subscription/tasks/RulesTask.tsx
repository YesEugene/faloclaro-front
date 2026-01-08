'use client';

import { useState } from 'react';

interface RulesTaskProps {
  task: any;
  language: string;
  onComplete: (completionData?: any) => void;
  isCompleted: boolean;
}

export default function RulesTask({ task, language, onComplete, isCompleted }: RulesTaskProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const rules = task.rules || [];
  const reinforcement = task.reinforcement;

  const handleAnswerSelect = (optionText: string) => {
    setSelectedAnswer(optionText);
    setShowResult(true);
  };

  const handleComplete = () => {
    const correctAnswer = reinforcement?.options?.find((opt: any) => opt.correct)?.text;
    onComplete({
      selectedAnswer,
      correctAnswer,
      isCorrect: selectedAnswer === correctAnswer,
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

  return (
    <div className="space-y-6">
      {/* Rules */}
      {rules.map((rule: any, index: number) => (
        <div key={rule.rule_id || index} className="bg-gray-50 rounded-lg p-4">
          <p className="text-gray-700 mb-3">{rule.explanation}</p>
          {rule.examples && (
            <div className="space-y-2">
              {rule.examples.map((example: any, exIndex: number) => (
                <div key={exIndex} className="bg-white rounded p-2 border border-gray-200">
                  <p className="text-black font-medium">{example.text}</p>
                  {example.audio && (
                    <p className="text-xs text-gray-500 mt-1">
                      {language === 'ru' ? 'Аудио доступно' : language === 'en' ? 'Audio available' : 'Áudio disponível'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Reinforcement Question */}
      {reinforcement && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-semibold text-black mb-4">{reinforcement.question}</p>
          <div className="space-y-2">
            {reinforcement.options?.map((option: any, index: number) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(option.text)}
                disabled={showResult}
                className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                  showResult
                    ? option.correct
                      ? 'bg-green-100 border-green-500'
                      : selectedAnswer === option.text
                      ? 'bg-red-100 border-red-500'
                      : 'bg-gray-100 border-gray-300'
                    : 'bg-white border-gray-300 hover:border-blue-500'
                }`}
              >
                {option.text}
              </button>
            ))}
          </div>
          {showResult && (
            <div className="mt-4">
              <button
                onClick={handleComplete}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {language === 'ru' ? 'Продолжить' : language === 'en' ? 'Continue' : 'Continuar'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

