'use client';

import { useState, useEffect } from 'react';

interface ListeningTaskEditorProps {
  task: any;
  onChange: (task: any) => void;
  lessonDay: number;
}

export default function ListeningTaskEditor({ task, onChange, lessonDay }: ListeningTaskEditorProps) {
  // Support both old structure (task.items) and new structure (task.blocks[].content.items)
  const getItems = () => {
    if (task.blocks && Array.isArray(task.blocks)) {
      // New structure: collect items from all listen_phrase blocks
      const items: any[] = [];
      task.blocks.forEach((block: any) => {
        if (block.block_type === 'listen_phrase' && block.content?.items) {
          items.push(...block.content.items);
        }
      });
      return items;
    }
    // Old structure: task.items
    return task.items || [];
  };

  const [items, setItems] = useState<any[]>(getItems());
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  const updateTask = (newItems: any[]) => {
    setItems(newItems);
    
    if (task.blocks && Array.isArray(task.blocks)) {
      // New structure: update or create listen_phrase block
      const updatedBlocks = task.blocks.filter((b: any) => b.block_type !== 'listen_phrase');
      
      // Add or update listen_phrase block
      updatedBlocks.push({
        block_id: 'block_1',
        block_type: 'listen_phrase',
        content: {
          items: newItems,
        },
        ui_rules: task.ui_rules || {
          audio_plays_first: true,
          show_text_after_answer: true,
        },
      });
      
      onChange({
        ...task,
        blocks: updatedBlocks,
      });
    } else {
      // Old structure: update task.items
      onChange({
        ...task,
        items: newItems,
      });
    }
  };

  const handleAddItem = () => {
    setEditingItemIndex(items.length);
    setShowAddItem(true);
  };

  const handleEditItem = (index: number) => {
    setEditingItemIndex(index);
    setShowAddItem(true);
  };

  const handleSaveItem = (item: any) => {
    const newItems = [...items];
    if (editingItemIndex !== null && editingItemIndex < items.length) {
      newItems[editingItemIndex] = item;
    } else {
      newItems.push(item);
    }
    updateTask(newItems);
    setShowAddItem(false);
    setEditingItemIndex(null);
  };

  const handleDeleteItem = (index: number) => {
    if (confirm('Вы уверены, что хотите удалить этот элемент?')) {
      const newItems = items.filter((_, i) => i !== index);
      updateTask(newItems);
    }
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    if (direction === 'up' && index > 0) {
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    } else if (direction === 'down' && index < newItems.length - 1) {
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    }
    updateTask(newItems);
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
              placeholder="Пойми смысл"
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
              placeholder="Understand the meaning"
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
              placeholder="Слушай фразу и отвечай на вопросы"
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
              placeholder="Listen to the phrase and answer questions"
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
              placeholder="≈5"
            />
          </div>
        </div>
      </div>

      {/* Listening Items */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Элементы аудирования ({items.length})</h2>
          <button
            onClick={handleAddItem}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Добавить элемент
          </button>
        </div>

        {items.length === 0 ? (
          <p className="text-gray-600 text-center py-8">
            Элементы еще не добавлены. Нажмите "Добавить элемент", чтобы начать.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                      {item.audio && (
                        <span className="text-sm text-gray-600">Аудио: {item.audio}</span>
                      )}
                      {item.audio_url && (
                        <>
                          <span className="text-sm text-blue-600">🎵 Аудио</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const audioElement = new Audio(item.audio_url);
                              audioElement.play().catch(err => console.error('Error playing audio:', err));
                            }}
                            className="px-2 py-1 text-blue-600 hover:text-blue-800 text-sm"
                            title="Воспроизвести аудио"
                          >
                            ▶️
                          </button>
                        </>
                      )}
                    </div>
                    {item.question && (
                      <p className="text-sm text-gray-700 mb-1">
                        Вопрос: {typeof item.question === 'string' 
                          ? item.question 
                          : item.question.ru || item.question.en || ''}
                      </p>
                    )}
                    {item.options && (
                      <p className="text-sm text-gray-600">
                        Вариантов ответа: {item.options.length}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {index > 0 && (
                      <button
                        onClick={() => handleMoveItem(index, 'up')}
                        className="px-2 py-1 text-gray-600 hover:text-gray-900"
                        title="Переместить вверх"
                      >
                        ↑
                      </button>
                    )}
                    {index < items.length - 1 && (
                      <button
                        onClick={() => handleMoveItem(index, 'down')}
                        className="px-2 py-1 text-gray-600 hover:text-gray-900"
                        title="Переместить вниз"
                      >
                        ↓
                      </button>
                    )}
                    <button
                      onClick={() => handleEditItem(index)}
                      className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDeleteItem(index)}
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

      {/* Item Editor Modal */}
      {showAddItem && (
        <ListeningItemEditorModal
          item={editingItemIndex !== null && editingItemIndex < items.length ? items[editingItemIndex] : null}
          lessonDay={lessonDay}
          onSave={handleSaveItem}
          onCancel={() => {
            setShowAddItem(false);
            setEditingItemIndex(null);
          }}
        />
      )}
    </div>
  );
}

// Listening Item Editor Modal
function ListeningItemEditorModal({ item, lessonDay, onSave, onCancel }: {
  item: any | null;
  lessonDay: number;
  onSave: (item: any) => void;
  onCancel: () => void;
}) {
  const [audio, setAudio] = useState<string>(item?.audio || '');
  const [audioUrl, setAudioUrl] = useState<string | null>(item?.audio_url || null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioExists, setAudioExists] = useState(false);
  const [textHidden, setTextHidden] = useState<boolean>(item?.text_hidden_before_answer !== false);
  const [question, setQuestion] = useState<{ ru: string; en: string }>({
    ru: typeof item?.question === 'string' ? '' : (item?.question?.ru || ''),
    en: typeof item?.question === 'string' ? '' : (item?.question?.en || ''),
  });
  const [options, setOptions] = useState<any[]>(item?.options || []);
  const [showOptionEditor, setShowOptionEditor] = useState(false);
  const [editingOptionIndex, setEditingOptionIndex] = useState<number | null>(null);

  // Check for existing audio when audio text changes or modal opens
  useEffect(() => {
    // Prioritize audio_url from item if it exists
    if (item?.audio_url) {
      setAudioUrl(item.audio_url);
      setAudioExists(true);
      return;
    }

    // Otherwise check database
    if (!audio.trim()) {
      setAudioExists(false);
      setAudioUrl(null);
      return;
    }

    const checkAudio = async () => {
      try {
        const response = await fetch(`/api/phrases?text=${encodeURIComponent(audio.trim())}`);
        const data = await response.json();
        if (data.success && data.exists && data.audioUrl) {
          setAudioUrl(data.audioUrl);
          setAudioExists(true);
        } else {
          setAudioExists(false);
          setAudioUrl(null);
        }
      } catch (err) {
        console.error('Error checking audio:', err);
        setAudioExists(false);
        setAudioUrl(null);
      }
    };

    checkAudio();
  }, [audio, item?.audio_url]);

  const handlePlayAudio = () => {
    if (!audioUrl) return;
    
    const audioElement = new Audio(audioUrl);
    setIsPlayingAudio(true);
    audioElement.play().catch(err => {
      console.error('Error playing audio:', err);
      setIsPlayingAudio(false);
    });
    audioElement.onended = () => setIsPlayingAudio(false);
    audioElement.onerror = () => {
      console.error('Error loading audio');
      setIsPlayingAudio(false);
    };
  };

  const handleAddOption = () => {
    setEditingOptionIndex(options.length);
    setShowOptionEditor(true);
  };

  const handleEditOption = (index: number) => {
    setEditingOptionIndex(index);
    setShowOptionEditor(true);
  };

  const handleSaveOption = (option: any) => {
    const newOptions = [...options];
    if (editingOptionIndex !== null && editingOptionIndex < options.length) {
      newOptions[editingOptionIndex] = option;
    } else {
      newOptions.push(option);
    }
    setOptions(newOptions);
    setShowOptionEditor(false);
    setEditingOptionIndex(null);
  };

  const handleDeleteOption = (index: number) => {
    if (confirm('Вы уверены, что хотите удалить этот вариант ответа?')) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const handleSave = () => {
    if (!audio.trim()) {
      alert('Пожалуйста, введите аудио текст');
      return;
    }

    if (!question.ru.trim() && !question.en.trim()) {
      alert('Пожалуйста, введите вопрос хотя бы на одном языке');
      return;
    }

    if (options.length === 0) {
      alert('Пожалуйста, добавьте хотя бы один вариант ответа');
      return;
    }

    const itemData: any = {
      item_id: item?.item_id || Date.now(),
      audio: audio.trim(),
      audio_url: audioUrl || undefined,
      text_hidden_before_answer: textHidden,
      question: {
        ru: question.ru.trim() || undefined,
        en: question.en.trim() || undefined,
      },
      options,
    };

    onSave(itemData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">
              {item ? 'Редактировать элемент' : 'Добавить элемент'}
            </h2>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Аудио текст (PT) *
            </label>
            <div className="flex gap-2 mb-2 items-center">
              <input
                type="text"
                value={audio}
                onChange={(e) => setAudio(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Preciso de ajuda."
              />
              {audioExists && audioUrl && (
                <button
                  type="button"
                  onClick={handlePlayAudio}
                  disabled={isPlayingAudio}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
                  title="Воспроизвести аудио"
                >
                  {isPlayingAudio ? (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>Пауза</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      <span>Play</span>
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={async () => {
                  if (!audio.trim()) {
                    alert('Пожалуйста, введите текст для генерации аудио');
                    return;
                  }
                  
                  try {
                    const response = await fetch('/api/admin/audio/generate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        text: audio.trim(),
                        lessonId: lessonDay.toString(),
                        taskId: 3,
                        blockId: 'listen_phrase',
                        itemId: `item_${Date.now()}`,
                      }),
                    });

                    const data = await response.json();
                    if (data.success && data.audioUrl) {
                      setAudioUrl(data.audioUrl);
                      setAudioExists(true);
                      alert('Аудио успешно сгенерировано!');
                    } else {
                      alert('Ошибка при генерации аудио: ' + (data.error || 'Unknown error'));
                    }
                  } catch (err) {
                    console.error('Error generating audio:', err);
                    alert('Ошибка при генерации аудио');
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
              >
                🎵 Генерировать
              </button>
              <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm cursor-pointer whitespace-nowrap">
                📤 Загрузить
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    if (!audio.trim()) {
                      alert('Пожалуйста, введите текст');
                      return;
                    }

                    try {
                      const uploadFormData = new FormData();
                      uploadFormData.append('file', file);
                      uploadFormData.append('lessonId', lessonDay.toString());
                      uploadFormData.append('taskId', '3');
                      uploadFormData.append('blockId', 'listen_phrase');
                      uploadFormData.append('itemId', `item_${Date.now()}`);
                      uploadFormData.append('textPt', audio.trim());

                      const response = await fetch('/api/admin/audio/upload', {
                        method: 'POST',
                        body: uploadFormData,
                      });

                      const data = await response.json();
                      if (data.success && data.audioUrl) {
                        setAudioUrl(data.audioUrl);
                        setAudioExists(true);
                        alert('Аудио успешно загружено!');
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
            <p className="text-xs text-gray-500">
              Генерация использует Google Text-to-Speech. Загрузка позволяет использовать свой аудиофайл.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Вопрос (RU) *
              </label>
              <input
                type="text"
                value={question.ru}
                onChange={(e) => setQuestion({ ...question, ru: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="О чём говорит человек?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Вопрос (EN) *
              </label>
              <input
                type="text"
                value={question.en}
                onChange={(e) => setQuestion({ ...question, en: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="What is the person saying?"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={textHidden}
                onChange={(e) => setTextHidden(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Скрывать текст до ответа</span>
            </label>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Варианты ответа ({options.length})
              </label>
              <button
                onClick={handleAddOption}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                + Добавить вариант
              </button>
            </div>

            {options.length === 0 ? (
              <p className="text-gray-600 text-center py-4">Варианты ответа еще не добавлены</p>
            ) : (
              <div className="space-y-3">
                {options.map((option, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {option.correct && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                              Правильный
                            </span>
                          )}
                          <span className="font-medium text-gray-900">{option.text}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditOption(index)}
                          className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleDeleteOption(index)}
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

        {/* Option Editor Modal */}
        {showOptionEditor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingOptionIndex !== null && editingOptionIndex < options.length ? 'Редактировать вариант' : 'Добавить вариант'}
                  </h2>
                  <button onClick={() => { setShowOptionEditor(false); setEditingOptionIndex(null); }} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Текст варианта (PT) *
                  </label>
                  <input
                    type="text"
                    value={editingOptionIndex !== null && editingOptionIndex < options.length ? options[editingOptionIndex]?.text || '' : ''}
                    onChange={(e) => {
                      const newOptions = [...options];
                      if (editingOptionIndex !== null && editingOptionIndex < options.length) {
                        newOptions[editingOptionIndex] = { ...newOptions[editingOptionIndex], text: e.target.value };
                      } else {
                        newOptions.push({ text: e.target.value, correct: false });
                      }
                      setOptions(newOptions);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Просит о помощи"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingOptionIndex !== null && editingOptionIndex < options.length ? options[editingOptionIndex]?.correct || false : false}
                      onChange={(e) => {
                        const newOptions = [...options];
                        if (editingOptionIndex !== null && editingOptionIndex < options.length) {
                          newOptions[editingOptionIndex] = { ...newOptions[editingOptionIndex], correct: e.target.checked };
                        }
                        setOptions(newOptions);
                      }}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Правильный ответ</span>
                  </label>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => { setShowOptionEditor(false); setEditingOptionIndex(null); }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => {
                      if (editingOptionIndex !== null && editingOptionIndex < options.length) {
                        handleSaveOption(options[editingOptionIndex]);
                      } else {
                        const text = (document.querySelector('input[placeholder="Просит о помощи"]') as HTMLInputElement)?.value || '';
                        if (!text.trim()) {
                          alert('Пожалуйста, введите текст варианта');
                          return;
                        }
                        handleSaveOption({ text: text.trim(), correct: false });
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
