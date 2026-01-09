'use client';

import { useState } from 'react';

interface ListeningTaskProps {
  task: any;
  language: string;
  onComplete: (completionData?: any) => void;
  isCompleted: boolean;
}

export default function ListeningTask({ task, language, onComplete, isCompleted }: ListeningTaskProps) {
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [showResults, setShowResults] = useState<{ [key: number]: boolean }>({});

  const items = task.items || [];
  const currentItem = items[currentItemIndex];

  const handleAnswerSelect = (itemIndex: number, optionText: string) => {
    setAnswers({ ...answers, [itemIndex]: optionText });
    setShowResults({ ...showResults, [itemIndex]: true });
  };

  const handleNextItem = () => {
    if (currentItemIndex < items.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    }
  };

  const handlePreviousItem = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
    }
  };

  const handleComplete = () => {
    const allAnswered = items.every((item: any, index: number) => answers[index]);
    if (allAnswered) {
      const correctCount = items.filter((item: any, index: number) => {
        const selectedAnswer = answers[index];
        const correctOption = item.options?.find((opt: any) => opt.correct);
        return selectedAnswer === correctOption?.text;
      }).length;

      onComplete({
        answers,
        correctCount,
        totalItems: items.length,
        completedAt: new Date().toISOString(),
      });
    }
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

  if (!currentItem) {
    return <div>No items available</div>;
  }

  const currentAnswer = answers[currentItemIndex];
  const showResult = showResults[currentItemIndex];
  const correctOption = currentItem.options?.find((opt: any) => opt.correct);

  return (
    <div className="space-y-4">
      {/* Audio Player Placeholder */}
      <div className="bg-gray-100 rounded-lg p-4 text-center">
        <p className="text-gray-600 mb-2">
          {language === 'ru' ? 'Прослушайте аудио' : language === 'en' ? 'Listen to audio' : 'Ouve o áudio'}
        </p>
        <button className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
        </button>
        {currentItem.audio && (
          <p className="text-xs text-gray-500 mt-2">{currentItem.audio}</p>
        )}
      </div>

      {/* Question */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
        <p className="font-semibold text-black mb-4">{currentItem.question}</p>
        <div className="space-y-2">
          {currentItem.options?.map((option: any, index: number) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(currentItemIndex, option.text)}
              disabled={showResult}
              className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                showResult
                  ? option.correct
                    ? 'bg-green-100 border-green-500'
                    : currentAnswer === option.text
                    ? 'bg-red-100 border-red-500'
                    : 'bg-gray-100 border-gray-300'
                  : currentAnswer === option.text
                  ? 'bg-blue-50 border-blue-500'
                  : 'bg-white border-gray-300 hover:border-blue-500'
              }`}
            >
              {option.text}
            </button>
          ))}
        </div>
      </div>

      {/* Show text after answer */}
      {showResult && currentItem.show_text_after_answer && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-black font-medium">{currentItem.audio}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-2 justify-center">
        <button
          onClick={handlePreviousItem}
          disabled={currentItemIndex === 0}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50"
        >
          ←
        </button>
        <span className="px-4 py-2 text-gray-600">
          {currentItemIndex + 1} / {items.length}
        </span>
        <button
          onClick={handleNextItem}
          disabled={currentItemIndex === items.length - 1}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50"
        >
          →
        </button>
      </div>

      {/* Complete Button */}
      {items.every((item: any, index: number) => showResults[index]) && (
        <button
          onClick={handleComplete}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
        >
          {language === 'ru' ? 'Завершить задание' : language === 'en' ? 'Complete task' : 'Concluir tarefa'}
        </button>
      )}
    </div>
  );
}

