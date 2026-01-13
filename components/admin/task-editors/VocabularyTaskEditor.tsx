'use client';

import { useState, useEffect, useRef } from 'react';

interface VocabularyTaskEditorProps {
  task: any;
  onChange: (task: any) => void;
  lessonDay: number;
}

export default function VocabularyTaskEditor({ task, onChange, lessonDay }: VocabularyTaskEditorProps) {
  // Support both old structure (content.cards) and new structure (blocks[0].content.cards)
  const getCards = () => {
    if (task.blocks && Array.isArray(task.blocks) && task.blocks.length > 0) {
      // New structure: blocks array
      const listenBlock = task.blocks.find((b: any) => b.block_type === 'listen_and_repeat');
      return listenBlock?.content?.cards || [];
    }
    // Old structure: content.cards
    return task.content?.cards || [];
  };

  const [cards, setCards] = useState<any[]>(getCards());
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [generatingAudio, setGeneratingAudio] = useState<{ [key: number]: boolean }>({});
  const [isPlayingAudio, setIsPlayingAudio] = useState<{ [key: number]: boolean }>({});

  // Update task when cards change
  const updateTask = (newCards: any[]) => {
    setCards(newCards);
    
    // Update based on structure
    if (task.blocks && Array.isArray(task.blocks)) {
      // New structure: update blocks array
      const updatedBlocks = task.blocks.map((block: any) => {
        if (block.block_type === 'listen_and_repeat') {
          return {
            ...block,
            content: {
              ...block.content,
              cards: newCards,
            },
          };
        }
        return block;
      });
      
      // If no listen_and_repeat block exists, create one
      if (!updatedBlocks.some((b: any) => b.block_type === 'listen_and_repeat')) {
        updatedBlocks.push({
          block_id: 'block_1',
          block_type: 'listen_and_repeat',
          content: {
            cards: newCards,
          },
          ui: task.ui || {
            show_audio_settings: true,
            show_timer: true,
            allow_repeat: true,
          },
          completion_rule: task.completion_rule || 'auto_after_audio_10_min',
        });
      }
      
      onChange({
        ...task,
        blocks: updatedBlocks,
      });
    } else {
      // Old structure: update content.cards
      onChange({
        ...task,
        content: {
          ...task.content,
          cards: newCards,
        },
      });
    }
  };

  const handleToggleCard = (index: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedCards(newExpanded);
  };

  const handleUpdateCard = (index: number, field: string, value: string) => {
    const newCards = [...cards];
    newCards[index] = {
      ...newCards[index],
      [field]: value,
    };
    updateTask(newCards);
  };

  const handleAddCard = () => {
    const newCard = {
      word: '',
      transcription: '',
      example_sentence: '',
      sentence_translation_ru: '',
      sentence_translation_en: '',
      word_translation_ru: '',
      word_translation_en: '',
    };
    const newCards = [...cards, newCard];
    updateTask(newCards);
    // Auto-expand the new card
    setExpandedCards(new Set([...expandedCards, cards.length]));
  };

  const handleDeleteCard = (index: number) => {
    if (confirm('Вы уверены, что хотите удалить это слово?')) {
      const newCards = cards.filter((_, i) => i !== index);
      updateTask(newCards);
      // Remove from expanded set
      const newExpanded = new Set(expandedCards);
      newExpanded.delete(index);
      // Adjust indices for cards after deleted one
      const adjustedExpanded = new Set<number>();
      newExpanded.forEach(idx => {
        if (idx > index) {
          adjustedExpanded.add(idx - 1);
        } else {
          adjustedExpanded.add(idx);
        }
      });
      setExpandedCards(adjustedExpanded);
      // Clean up audio state
      setGeneratingAudio(prev => {
        const newState: { [key: number]: boolean } = {};
        Object.keys(prev).forEach(key => {
          const idx = parseInt(key);
          if (idx < index) {
            newState[idx] = prev[idx];
          } else if (idx > index) {
            newState[idx - 1] = prev[idx];
          }
        });
        return newState;
      });
      setIsPlayingAudio(prev => {
        const newState: { [key: number]: boolean } = {};
        Object.keys(prev).forEach(key => {
          const idx = parseInt(key);
          if (idx < index) {
            newState[idx] = prev[idx];
          } else if (idx > index) {
            newState[idx - 1] = prev[idx];
          }
        });
        return newState;
      });
    }
  };

  const handleGenerateAudio = async (index: number) => {
    const card = cards[index];
    if (!card || !card.word || !card.word.trim()) {
      alert('Пожалуйста, сначала добавьте слово');
      return;
    }

    setGeneratingAudio(prev => ({ ...prev, [index]: true }));

    try {
      const response = await fetch('/api/admin/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: card.word.trim(),
          lessonId: lessonDay.toString(),
          taskId: 1, // Vocabulary task
          blockId: 'listen_and_repeat',
          itemId: `card_${index}_${Date.now()}`,
        }),
      });

      const data = await response.json();
      if (data.success && data.audioUrl) {
        // Update card with audio_url
        const newCards = [...cards];
        newCards[index] = {
          ...newCards[index],
          audio_url: data.audioUrl,
        };
        setCards(newCards);
        updateTask(newCards);
      } else {
        alert('Ошибка при генерации аудио: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      alert('Ошибка при генерации аудио');
    } finally {
      setGeneratingAudio(prev => ({ ...prev, [index]: false }));
    }
  };

  const handlePlayAudio = (index: number) => {
    const card = cards[index];
    const audioUrl = card?.audio_url;
    if (!audioUrl) return;

    setIsPlayingAudio(prev => ({ ...prev, [index]: true }));
    const audio = new Audio(audioUrl);
    audio.play().catch(err => {
      console.error('Error playing audio:', err);
      setIsPlayingAudio(prev => ({ ...prev, [index]: false }));
    });
    audio.onended = () => setIsPlayingAudio(prev => ({ ...prev, [index]: false }));
    audio.onerror = () => setIsPlayingAudio(prev => ({ ...prev, [index]: false }));
  };

  const handleMoveCard = (index: number, direction: 'up' | 'down') => {
    const newCards = [...cards];
    if (direction === 'up' && index > 0) {
      [newCards[index - 1], newCards[index]] = [newCards[index], newCards[index - 1]];
      // Update expanded set
      const newExpanded = new Set(expandedCards);
      const wasExpanded1 = newExpanded.has(index - 1);
      const wasExpanded2 = newExpanded.has(index);
      newExpanded.delete(index - 1);
      newExpanded.delete(index);
      if (wasExpanded1) newExpanded.add(index);
      if (wasExpanded2) newExpanded.add(index - 1);
      setExpandedCards(newExpanded);
    } else if (direction === 'down' && index < newCards.length - 1) {
      [newCards[index], newCards[index + 1]] = [newCards[index + 1], newCards[index]];
      // Update expanded set
      const newExpanded = new Set(expandedCards);
      const wasExpanded1 = newExpanded.has(index);
      const wasExpanded2 = newExpanded.has(index + 1);
      newExpanded.delete(index);
      newExpanded.delete(index + 1);
      if (wasExpanded1) newExpanded.add(index + 1);
      if (wasExpanded2) newExpanded.add(index);
      setExpandedCards(newExpanded);
    }
    updateTask(newCards);
  };

  return (
    <div className="space-y-6">
      {/* Vocabulary Cards */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Слова ({cards.length})</h2>
          <button
            onClick={handleAddCard}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Добавить слово
          </button>
        </div>

        {cards.length === 0 ? (
          <p className="text-gray-600 text-center py-8">
            Слова еще не добавлены. Нажмите "Добавить слово", чтобы начать.
          </p>
        ) : (
          <div className="space-y-2">
            {cards.map((card, index) => {
              const isExpanded = expandedCards.has(index);
              return (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors"
                >
                  {/* Collapsed Header - Clickable */}
                  <div
                    onClick={() => handleToggleCard(index)}
                    className="flex items-center justify-between p-4 cursor-pointer bg-white hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-semibold text-gray-900">
                          {card.word || 'Без слова'}
                        </span>
                        {card.word_translation_ru && (
                          <span className="text-sm text-gray-600">
                            — {card.word_translation_ru}
                          </span>
                        )}
                        {card.word_translation_en && (
                          <span className="text-sm text-gray-600">
                            — {card.word_translation_en}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Group 1: Audio buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateAudio(index);
                          }}
                          disabled={generatingAudio[index] || !card.word?.trim()}
                          className="px-2 py-1 text-xs text-green-600 hover:text-green-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Сгенерировать аудио"
                        >
                          {generatingAudio[index] ? '⏳' : 'Генерировать аудио'}
                        </button>
                        {card.audio_url && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayAudio(index);
                            }}
                            disabled={isPlayingAudio[index]}
                            className="w-8 h-8 flex items-center justify-center text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            title="Воспроизвести аудио"
                          >
                            {isPlayingAudio[index] ? '⏸️' : '▶️'}
                          </button>
                        )}
                      </div>
                      {/* Group 2: Move buttons */}
                      <div className="flex items-center gap-1">
                        {index > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveCard(index, 'up');
                            }}
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900"
                            title="Переместить вверх"
                          >
                            ↑
                          </button>
                        )}
                        {index < cards.length - 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveCard(index, 'down');
                            }}
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900"
                            title="Переместить вниз"
                          >
                            ↓
                          </button>
                        )}
                      </div>
                      {/* Group 3: Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCard(index);
                        }}
                        className="w-8 h-8 flex items-center justify-center text-red-600 hover:text-red-800"
                        title="Удалить"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-4">
                      {/* Word and Translations Row */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <input
                            type="text"
                            value={card.word || ''}
                            onChange={(e) => handleUpdateCard(index, 'word', e.target.value)}
                            placeholder="Португальское слово"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={card.word_translation_ru || ''}
                            onChange={(e) => handleUpdateCard(index, 'word_translation_ru', e.target.value)}
                            placeholder="Перевод слова (RU)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={card.word_translation_en || ''}
                            onChange={(e) => handleUpdateCard(index, 'word_translation_en', e.target.value)}
                            placeholder="Перевод слова (EN)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>

                      {/* Transcription */}
                      <div>
                        <input
                          type="text"
                          value={card.transcription || ''}
                          onChange={(e) => handleUpdateCard(index, 'transcription', e.target.value)}
                          placeholder="Транскрипция (IPA)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      {/* Sentence and Translations Row */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <input
                            type="text"
                            value={card.example_sentence || ''}
                            onChange={(e) => handleUpdateCard(index, 'example_sentence', e.target.value)}
                            placeholder="Пример предложения (PT)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={card.sentence_translation_ru || ''}
                            onChange={(e) => handleUpdateCard(index, 'sentence_translation_ru', e.target.value)}
                            placeholder="Перевод предложения (RU)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={card.sentence_translation_en || ''}
                            onChange={(e) => handleUpdateCard(index, 'sentence_translation_en', e.target.value)}
                            placeholder="Перевод предложения (EN)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
