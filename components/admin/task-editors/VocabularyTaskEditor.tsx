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
  const [showAddCard, setShowAddCard] = useState(false);
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);

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

  const handleAddCard = () => {
    setEditingCardIndex(cards.length);
    setShowAddCard(true);
  };

  const handleEditCard = (index: number) => {
    setEditingCardIndex(index);
    setShowAddCard(true);
  };

  const handleSaveCard = (card: any) => {
    const newCards = [...cards];
    if (editingCardIndex !== null && editingCardIndex < cards.length) {
      newCards[editingCardIndex] = card;
    } else {
      newCards.push(card);
    }
    updateTask(newCards);
    setShowAddCard(false);
    setEditingCardIndex(null);
  };

  const handleDeleteCard = (index: number) => {
    if (confirm('Вы уверены, что хотите удалить это слово?')) {
      const newCards = cards.filter((_, i) => i !== index);
      updateTask(newCards);
    }
  };

  const handleMoveCard = (index: number, direction: 'up' | 'down') => {
    const newCards = [...cards];
    if (direction === 'up' && index > 0) {
      [newCards[index - 1], newCards[index]] = [newCards[index], newCards[index - 1]];
    } else if (direction === 'down' && index < newCards.length - 1) {
      [newCards[index], newCards[index + 1]] = [newCards[index + 1], newCards[index]];
    }
    updateTask(newCards);
  };

  return (
    <div className="space-y-6">
      {/* Basic Task Info */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Основная информация</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название (RU)
            </label>
            <input
              type="text"
              value={typeof task.title === 'string' ? task.title : (task.title?.ru || '')}
              onChange={(e) => {
                const title = task.title || {};
                onChange({
                  ...task,
                  title: { ...title, ru: e.target.value },
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Слова и фразы"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название (EN)
            </label>
            <input
              type="text"
              value={typeof task.title === 'string' ? '' : (task.title?.en || '')}
              onChange={(e) => {
                const title = task.title || {};
                onChange({
                  ...task,
                  title: { ...title, en: e.target.value },
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Words and phrases"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Подзаголовок (RU)
            </label>
            <input
              type="text"
              value={typeof task.subtitle === 'string' ? task.subtitle : (task.subtitle?.ru || '')}
              onChange={(e) => {
                const subtitle = task.subtitle || {};
                onChange({
                  ...task,
                  subtitle: { ...subtitle, ru: e.target.value },
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Просьбы и ответы"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Подзаголовок (EN)
            </label>
            <input
              type="text"
              value={typeof task.subtitle === 'string' ? '' : (task.subtitle?.en || '')}
              onChange={(e) => {
                const subtitle = task.subtitle || {};
                onChange({
                  ...task,
                  subtitle: { ...subtitle, en: e.target.value },
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Requests and responses"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Время (примерно)
            </label>
            <input
              type="text"
              value={task.estimated_time || ''}
              onChange={(e) => onChange({ ...task, estimated_time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="≈10"
            />
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={(() => {
                  if (task.blocks && Array.isArray(task.blocks)) {
                    const block = task.blocks.find((b: any) => b.block_type === 'listen_and_repeat');
                    return block?.ui?.show_timer !== false;
                  }
                  return task.ui?.show_timer !== false;
                })()}
                onChange={(e) => {
                  if (task.blocks && Array.isArray(task.blocks)) {
                    const updatedBlocks = task.blocks.map((block: any) => {
                      if (block.block_type === 'listen_and_repeat') {
                        return {
                          ...block,
                          ui: {
                            ...block.ui,
                            show_timer: e.target.checked,
                          },
                        };
                      }
                      return block;
                    });
                    onChange({ ...task, blocks: updatedBlocks });
                  } else {
                    const ui = task.ui || {};
                    onChange({
                      ...task,
                      ui: { ...ui, show_timer: e.target.checked },
                    });
                  }
                }}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Показать таймер</span>
            </label>
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={(() => {
                  if (task.blocks && Array.isArray(task.blocks)) {
                    const block = task.blocks.find((b: any) => b.block_type === 'listen_and_repeat');
                    return block?.ui?.show_audio_settings !== false;
                  }
                  return task.ui?.show_audio_settings !== false;
                })()}
                onChange={(e) => {
                  if (task.blocks && Array.isArray(task.blocks)) {
                    const updatedBlocks = task.blocks.map((block: any) => {
                      if (block.block_type === 'listen_and_repeat') {
                        return {
                          ...block,
                          ui: {
                            ...block.ui,
                            show_audio_settings: e.target.checked,
                          },
                        };
                      }
                      return block;
                    });
                    onChange({ ...task, blocks: updatedBlocks });
                  } else {
                    const ui = task.ui || {};
                    onChange({
                      ...task,
                      ui: { ...ui, show_audio_settings: e.target.checked },
                    });
                  }
                }}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Показать настройки аудио</span>
            </label>
          </div>
        </div>
      </div>

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
          <div className="space-y-3">
            {cards.map((card, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                      <span className="font-semibold text-gray-900">{card.word || 'Без слова'}</span>
                    </div>
                    {card.transcription && (
                      <p className="text-sm text-gray-600 mb-1">[{card.transcription}]</p>
                    )}
                    {card.word_translation_ru && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">RU:</span> {card.word_translation_ru}
                      </p>
                    )}
                    {card.word_translation_en && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">EN:</span> {card.word_translation_en}
                      </p>
                    )}
                    {card.example_sentence && (
                      <p className="text-sm text-gray-600 mt-2 italic">"{card.example_sentence}"</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {index > 0 && (
                      <button
                        onClick={() => handleMoveCard(index, 'up')}
                        className="px-2 py-1 text-gray-600 hover:text-gray-900"
                        title="Переместить вверх"
                      >
                        ↑
                      </button>
                    )}
                    {index < cards.length - 1 && (
                      <button
                        onClick={() => handleMoveCard(index, 'down')}
                        className="px-2 py-1 text-gray-600 hover:text-gray-900"
                        title="Переместить вниз"
                      >
                        ↓
                      </button>
                    )}
                    <button
                      onClick={() => handleEditCard(index)}
                      className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDeleteCard(index)}
                      className="px-3 py-1 text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card Editor Modal */}
      {showAddCard && (
        <CardEditorModal
          card={editingCardIndex !== null && editingCardIndex < cards.length ? cards[editingCardIndex] : null}
          lessonDay={lessonDay}
          onSave={handleSaveCard}
          onCancel={() => {
            setShowAddCard(false);
            setEditingCardIndex(null);
          }}
        />
      )}
    </div>
  );
}

// Card Editor Modal Component
function CardEditorModal({ card, lessonDay, onSave, onCancel }: {
  card: any | null;
  lessonDay: number;
  onSave: (card: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    word: card?.word || '',
    transcription: card?.transcription || '',
    example_sentence: card?.example_sentence || '',
    sentence_translation_ru: card?.sentence_translation_ru || '',
    sentence_translation_en: card?.sentence_translation_en || '',
    word_translation_ru: card?.word_translation_ru || '',
    word_translation_en: card?.word_translation_en || '',
    audioFile: null as File | null,
    audioUrl: card?.audio_url || '', // Store audio URL from card or after generation
  });
  
  const [isCheckingAudio, setIsCheckingAudio] = useState(false);
  const [audioExists, setAudioExists] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Check if audio exists in database when word changes or modal opens
  useEffect(() => {
    const checkAudioExists = async () => {
      if (!formData.word.trim()) {
        setAudioExists(false);
        setFormData(prev => ({ ...prev, audioUrl: '' }));
        return;
      }
      
      setIsCheckingAudio(true);
      try {
        // Try to find audio in phrases table
        const response = await fetch(`/api/phrases?text=${encodeURIComponent(formData.word.trim())}&lessonId=${lessonDay}`);
        const data = await response.json();
        if (data.success && data.exists && data.audioUrl) {
          setAudioExists(true);
          setFormData(prev => ({ ...prev, audioUrl: data.audioUrl }));
        } else {
          setAudioExists(false);
          setFormData(prev => ({ ...prev, audioUrl: '' }));
        }
      } catch (err) {
        console.error('Error checking audio:', err);
        setAudioExists(false);
        setFormData(prev => ({ ...prev, audioUrl: '' }));
      } finally {
        setIsCheckingAudio(false);
      }
    };
    
    // Delay check slightly to avoid too many requests
    const timeoutId = setTimeout(checkAudioExists, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.word, lessonDay]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, audioFile: e.target.files[0] });
    }
  };

  const handleSave = async () => {
    // Validate required fields
    if (!formData.word.trim()) {
      alert('Пожалуйста, введите португальское слово');
      return;
    }

    const cardData: any = {
      word: formData.word.trim(),
      transcription: formData.transcription.trim() || undefined,
      example_sentence: formData.example_sentence.trim() || undefined,
      sentence_translation_ru: formData.sentence_translation_ru.trim() || undefined,
      sentence_translation_en: formData.sentence_translation_en.trim() || undefined,
      word_translation_ru: formData.word_translation_ru.trim() || undefined,
      word_translation_en: formData.word_translation_en.trim() || undefined,
      // Include audio_url if it exists (from generation or upload)
      ...(formData.audioUrl ? { audio_url: formData.audioUrl } : {}),
    };

    // If audio file is uploaded, we'll need to handle upload separately
    // For now, we'll just save the card data
    // Audio upload will be handled when saving the task

    onSave(cardData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">
              {card ? 'Редактировать слово' : 'Добавить слово'}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Португальское слово *
            </label>
            <input
              type="text"
              value={formData.word}
              onChange={(e) => setFormData({ ...formData, word: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Preciso"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Транскрипция (IPA)
            </label>
            <input
              type="text"
              value={formData.transcription}
              onChange={(e) => setFormData({ ...formData, transcription: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="[pɾɨˈsizu]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Пример предложения (PT)
            </label>
            <input
              type="text"
              value={formData.example_sentence}
              onChange={(e) => setFormData({ ...formData, example_sentence: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Preciso de ajuda."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Перевод предложения (RU)
              </label>
              <input
                type="text"
                value={formData.sentence_translation_ru}
                onChange={(e) => setFormData({ ...formData, sentence_translation_ru: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Мне нужна помощь."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Перевод предложения (EN)
              </label>
              <input
                type="text"
                value={formData.sentence_translation_en}
                onChange={(e) => setFormData({ ...formData, sentence_translation_en: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="I need help."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Перевод слова (RU)
              </label>
              <input
                type="text"
                value={formData.word_translation_ru}
                onChange={(e) => setFormData({ ...formData, word_translation_ru: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="нужно / мне нужно"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Перевод слова (EN)
              </label>
              <input
                type="text"
                value={formData.word_translation_en}
                onChange={(e) => setFormData({ ...formData, word_translation_en: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="need / I need"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Аудио
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!formData.word.trim()) {
                    alert('Пожалуйста, введите португальское слово для генерации аудио');
                    return;
                  }
                  
                  try {
                    const response = await fetch('/api/admin/audio/generate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        text: formData.word.trim(),
                        lessonId: lessonDay.toString(),
                        taskId: 1,
                        blockId: 'vocabulary',
                        itemId: `word_${Date.now()}`,
                      }),
                    });

                    const data = await response.json();
                    if (data.success && data.audioUrl) {
                      // Update form data with audio URL immediately
                      const newAudioUrl = data.audioUrl;
                      setFormData(prev => ({ ...prev, audioUrl: newAudioUrl }));
                      setAudioExists(true);
                      
                      console.log('✅ Audio generated successfully. URL:', newAudioUrl);
                      console.log('   Bucket:', data.bucket);
                      console.log('   Storage path:', data.storagePath);
                      
                      // Wait a moment for database to update, then re-check to confirm
                      setTimeout(async () => {
                        try {
                          const checkResponse = await fetch(`/api/phrases?text=${encodeURIComponent(formData.word.trim())}&lessonId=${lessonDay}`);
                          const checkData = await checkResponse.json();
                          if (checkData.success && checkData.exists && checkData.audioUrl) {
                            // Use URL from database if available (more reliable)
                            console.log('✅ Audio confirmed in database. URL:', checkData.audioUrl);
                            setFormData(prev => ({ ...prev, audioUrl: checkData.audioUrl }));
                            setAudioExists(true);
                          } else {
                            // Keep the URL from generation response
                            console.log('⚠️  Audio not yet in database, using generation URL');
                            setAudioExists(true);
                          }
                        } catch (checkErr) {
                          console.error('Error re-checking audio:', checkErr);
                          // Keep the URL from generation response anyway
                          setAudioExists(true);
                        }
                      }, 1000);
                      
                      alert('Аудио успешно сгенерировано! Теперь вы можете прослушать его, нажав кнопку Play.');
                    } else {
                      alert('Ошибка при генерации аудио: ' + (data.error || 'Unknown error'));
                    }
                  } catch (err: any) {
                    console.error('Error generating audio:', err);
                    alert('Ошибка при генерации аудио: ' + (err.message || 'Unknown error'));
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                🎵 Сгенерировать аудио
              </button>
              <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm cursor-pointer">
                📤 Загрузить файл
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    if (!formData.word.trim()) {
                      alert('Пожалуйста, введите португальское слово');
                      return;
                    }

                    try {
                      const uploadFormData = new FormData();
                      uploadFormData.append('file', file);
                      uploadFormData.append('lessonId', lessonDay.toString());
                      uploadFormData.append('taskId', '1');
                      uploadFormData.append('blockId', 'vocabulary');
                      uploadFormData.append('itemId', `word_${Date.now()}`);
                      uploadFormData.append('textPt', formData.word.trim());

                      const response = await fetch('/api/admin/audio/upload', {
                        method: 'POST',
                        body: uploadFormData,
                      });

                      const data = await response.json();
                      if (data.success && data.audioUrl) {
                        // Update form data with audio URL
                        setFormData(prev => ({ ...prev, audioUrl: data.audioUrl }));
                        setAudioExists(true);
                        alert('Аудио успешно загружено! Теперь вы можете прослушать его, нажав кнопку Play.');
                      } else {
                        alert('Ошибка при загрузке аудио: ' + (data.error || 'Unknown error'));
                      }
                    } catch (err) {
                      console.error('Error uploading audio:', err);
                      alert('Ошибка при загрузке аудио');
                    }
                  }}
                />
              </label>
            </div>
            {(audioExists && formData.audioUrl) && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!audioRef.current || audioRef.current.src !== formData.audioUrl) {
                      // Create new audio element or update src if URL changed
                      if (audioRef.current) {
                        audioRef.current.pause();
                        audioRef.current = null;
                      }
                      
                      audioRef.current = new Audio(formData.audioUrl);
                      audioRef.current.onended = () => {
                        setIsPlaying(false);
                      };
                      audioRef.current.onpause = () => {
                        setIsPlaying(false);
                      };
                      audioRef.current.onplay = () => {
                        setIsPlaying(true);
                      };
                      audioRef.current.onerror = () => {
                        const audioEl = audioRef.current;
                        if (!audioEl) return;
                        
                        const errorCode = audioEl.error?.code;
                        const errorMessage = audioEl.error?.message || 'Unknown error';
                        console.error('❌ Audio playback error in modal:', {
                          errorCode,
                          errorMessage,
                          src: formData.audioUrl,
                          readyState: audioEl.readyState,
                          networkState: audioEl.networkState,
                        });
                        setIsPlaying(false);
                        
                        let errorMsg = 'Ошибка при воспроизведении аудио. ';
                        if (errorCode === MediaError.MEDIA_ERR_NETWORK || errorCode === 2) {
                          errorMsg += 'Проблема с сетью или файл недоступен. Проверьте, что Storage bucket настроен как публичный.';
                        } else if (errorCode === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || errorCode === 4) {
                          errorMsg += 'Формат файла не поддерживается.';
                        } else {
                          errorMsg += `Ошибка: ${errorMessage}`;
                        }
                        alert(errorMsg + '\nURL: ' + formData.audioUrl);
                      };
                      audioRef.current.onloadeddata = () => {
                        console.log('✅ Audio loaded successfully in modal. URL:', formData.audioUrl);
                      };
                      audioRef.current.oncanplay = () => {
                        console.log('✅ Audio can play in modal. URL:', formData.audioUrl);
                      };
                    }
                    
                    if (audioRef.current.paused) {
                      // Update src if it changed
                      if (audioRef.current.src !== formData.audioUrl) {
                        audioRef.current.src = formData.audioUrl;
                        audioRef.current.load();
                      }
                      
                      audioRef.current.play().catch(err => {
                        console.error('❌ Error playing audio in modal:', err);
                        setIsPlaying(false);
                        alert('Ошибка при воспроизведении аудио: ' + err.message + '\nURL: ' + formData.audioUrl);
                      });
                    } else {
                      audioRef.current.pause();
                      audioRef.current.currentTime = 0;
                      setIsPlaying(false);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg transition-colors text-sm flex items-center gap-2 ${
                    isPlaying 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                </button>
                <span className="text-xs text-gray-500">
                  {isCheckingAudio ? 'Проверка...' : audioExists ? 'Аудио доступно' : 'Аудио не найдено'}
                </span>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Генерация использует Google Text-to-Speech. Загрузка позволяет использовать свой аудиофайл.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

