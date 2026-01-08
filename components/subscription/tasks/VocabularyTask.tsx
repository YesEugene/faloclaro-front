'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import AudioPlayer from '../AudioPlayer';

interface VocabularyTaskProps {
  task: any;
  language: string;
  onComplete: (completionData?: any) => void;
  isCompleted: boolean;
}

export default function VocabularyTask({ task, language, onComplete, isCompleted }: VocabularyTaskProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [audioUrls, setAudioUrls] = useState<{ [key: string]: string }>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const cards = task.content?.cards || [];
  const currentCard = cards[currentCardIndex];
  const requiredTime = task.completion_rule === 'auto_after_audio_10_min' ? 10 * 60 * 1000 : 0; // 10 minutes in ms

  useEffect(() => {
    if (!isCompleted && startTime) {
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        setElapsedTime(elapsed);
        
        if (elapsed >= requiredTime && requiredTime > 0) {
          handleComplete();
        }
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [startTime, requiredTime, isCompleted]);

  useEffect(() => {
    // Start timer when task is first viewed
    if (!isCompleted && !startTime && cards.length > 0) {
      setStartTime(Date.now());
    }
  }, []);

  useEffect(() => {
    // Load audio URLs for cards
    const loadAudioUrls = async () => {
      const urls: { [key: string]: string } = {};
      
      for (const card of cards) {
        if (card.example_sentence) {
          // Try to find phrase in database
          // Use limit(1) instead of single() to avoid 406 errors when phrase doesn't exist
          const { data: phraseArray } = await supabase
            .from('phrases')
            .select('audio_url')
            .eq('portuguese_text', card.example_sentence)
            .limit(1);
          
          if (phraseArray && phraseArray.length > 0 && phraseArray[0]?.audio_url) {
            urls[card.example_sentence] = phraseArray[0].audio_url;
          }
        }
      }
      
      setAudioUrls(urls);
    };

    if (cards.length > 0) {
      loadAudioUrls();
    }
  }, [cards]);

  const handleComplete = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    onComplete({
      elapsedTime,
      cardsViewed: currentCardIndex + 1,
      completedAt: new Date().toISOString(),
    });
  };

  const handleNextCard = () => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    }
  };

  const handlePreviousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };


  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

  if (!currentCard) {
    return <div>No cards available</div>;
  }

  return (
    <div className="space-y-4">
      {/* Timer */}
      {task.ui?.show_timer && requiredTime > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <div className="text-sm text-blue-600 mb-1">
            {language === 'ru' ? 'Время:' : language === 'en' ? 'Time:' : 'Tempo:'}
          </div>
          <div className="text-2xl font-bold text-blue-800">
            {formatTime(elapsedTime)} / {formatTime(requiredTime)}
          </div>
        </div>
      )}

      {/* Card */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
        {/* Word */}
        {task.card_format?.show_word && currentCard.word && (
          <div className="text-4xl font-bold text-center mb-4 text-black">
            {currentCard.word}
          </div>
        )}

        {/* Transcription */}
        {task.card_format?.show_transcription && currentCard.transcription && (
          <div className="text-lg text-center mb-4 font-mono text-gray-600">
            {currentCard.transcription}
          </div>
        )}

        {/* Example Sentence */}
        {task.card_format?.show_example_sentence && currentCard.example_sentence && (
          <div className="text-lg text-center mb-4 text-black">
            {currentCard.example_sentence}
          </div>
        )}

        {/* Translations */}
        <div className="space-y-2 mb-4">
          {task.card_format?.show_sentence_translation_ru && currentCard.sentence_translation_ru && (
            <div className="text-base text-center text-gray-700">
              {currentCard.sentence_translation_ru}
            </div>
          )}
          {task.card_format?.show_sentence_translation_en && currentCard.sentence_translation_en && (
            <div className="text-base text-center text-gray-700">
              {currentCard.sentence_translation_en}
            </div>
          )}
          {task.card_format?.show_word_translation_ru && currentCard.word_translation_ru && (
            <div className="text-sm text-center text-gray-600 italic">
              {currentCard.word_translation_ru}
            </div>
          )}
        </div>

        {/* Audio Player */}
        {task.ui?.show_audio_settings && currentCard.example_sentence && audioUrls[currentCard.example_sentence] && (
          <div className="mb-4">
            <AudioPlayer
              audioUrl={audioUrls[currentCard.example_sentence]}
              playbackSpeed={1.0}
            />
          </div>
        )}

        {/* Card Navigation */}
        <div className="flex gap-2 justify-center">
          <button
            onClick={handlePreviousCard}
            disabled={currentCardIndex === 0}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ←
          </button>
          <span className="px-4 py-2 text-gray-600">
            {currentCardIndex + 1} / {cards.length}
          </span>
          <button
            onClick={handleNextCard}
            disabled={currentCardIndex === cards.length - 1}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      </div>

      {/* Completion Message */}
      {elapsedTime >= requiredTime && requiredTime > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-green-800 font-semibold mb-2">
            {task.completion_message || 'Задание выполнено'}
          </p>
          <button
            onClick={handleComplete}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            {language === 'ru' ? 'Завершить' : language === 'en' ? 'Complete' : 'Concluir'}
          </button>
        </div>
      )}
    </div>
  );
}

