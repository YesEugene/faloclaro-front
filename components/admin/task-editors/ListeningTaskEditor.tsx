'use client';

import { useState, useEffect } from 'react';

interface ListeningTaskEditorProps {
  task: any;
  onChange: (task: any) => void;
  lessonDay: number;
}

export default function ListeningTaskEditor({ task, onChange, lessonDay }: ListeningTaskEditorProps) {
  // Normalize options in items - convert old string format to new object format (ru/en)
  const normalizeItemOptions = (item: any): any => {
    if (!item || typeof item !== 'object') return item;
    if (item.options && Array.isArray(item.options)) {
      return {
        ...item,
        options: item.options.map((opt: any) => {
          if (!opt || typeof opt !== 'object') return opt;
          // If text is a string (old format), convert to object with ru/en
          if (opt.text && typeof opt.text === 'string') {
            return {
              ...opt,
              text: { ru: opt.text, en: '' },
            };
          }
          // If text is an object but missing ru/en, normalize it
          if (opt.text && typeof opt.text === 'object' && !Array.isArray(opt.text)) {
            return {
              ...opt,
              text: {
                ru: opt.text.ru || opt.text.pt || opt.text.portuguese || opt.text.en || '',
                en: opt.text.en || '',
              },
            };
          }
          // If text is missing, add default structure
          if (!opt.text) {
            return {
              ...opt,
              text: { ru: '', en: '' },
            };
          }
          return opt;
        }),
      };
    }
    return item;
  };

  // Support both old structure (task.items) and new structure (task.blocks[].content.items)
  const getItems = () => {
    let items: any[] = [];
    if (task.blocks && Array.isArray(task.blocks)) {
      // New structure: collect items from all listen_phrase blocks
      task.blocks.forEach((block: any) => {
        if (block.block_type === 'listen_phrase' && block.content?.items) {
          items.push(...block.content.items);
        }
      });
    } else {
      // Old structure: task.items
      items = task.items || [];
    }
    // Normalize all items - ensure options have text as object with ru/en
    return items.map(normalizeItemOptions);
  };

  const [items, setItems] = useState<any[]>(getItems());
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [generatingAudio, setGeneratingAudio] = useState<{ [key: number]: boolean }>({});
  const [isPlayingAudio, setIsPlayingAudio] = useState<{ [key: number]: boolean }>({});

  // Update items when task changes (e.g., after save or load), but only if not editing
  useEffect(() => {
    const normalizedItems = getItems();
    setItems(normalizedItems);
  }, [task?.blocks, task?.items]);

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
    const newItem = {
      item_id: Date.now(),
      audio: '',
      audio_url: null,
      text_hidden_before_answer: true,
      question: { ru: '', en: '' },
      options: [],
    };
    const newItems = [...items, newItem];
    updateTask(newItems);
    // Auto-expand the new item
    setExpandedItems(prev => new Set([...prev, items.length]));
  };

  const handleToggleItem = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
    };
    updateTask(newItems);
  };

  const handleDeleteItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    updateTask(newItems);
    // Remove from expanded set
    const newExpanded = new Set(expandedItems);
    newExpanded.delete(index);
    // Adjust indices
    const adjusted = new Set<number>();
    newExpanded.forEach(idx => {
      if (idx > index) {
        adjusted.add(idx - 1);
      } else {
        adjusted.add(idx);
      }
    });
    setExpandedItems(adjusted);
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    if (direction === 'up' && index > 0) {
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
      // Update expanded set
      const newExpanded = new Set(expandedItems);
      const wasExpanded1 = newExpanded.has(index - 1);
      const wasExpanded2 = newExpanded.has(index);
      newExpanded.delete(index - 1);
      newExpanded.delete(index);
      if (wasExpanded1) newExpanded.add(index);
      if (wasExpanded2) newExpanded.add(index - 1);
      setExpandedItems(newExpanded);
    } else if (direction === 'down' && index < items.length - 1) {
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      // Update expanded set
      const newExpanded = new Set(expandedItems);
      const wasExpanded1 = newExpanded.has(index);
      const wasExpanded2 = newExpanded.has(index + 1);
      newExpanded.delete(index);
      newExpanded.delete(index + 1);
      if (wasExpanded1) newExpanded.add(index + 1);
      if (wasExpanded2) newExpanded.add(index);
      setExpandedItems(newExpanded);
    }
    updateTask(newItems);
  };

  const handleGenerateAudio = async (index: number) => {
    const item = items[index];
    if (!item || !item.audio || !item.audio.trim()) {
      alert('Пожалуйста, сначала добавьте текст аудио');
      return;
    }

    setGeneratingAudio(prev => ({ ...prev, [index]: true }));

    try {
      const response = await fetch('/api/admin/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: item.audio.trim(),
          lessonId: lessonDay.toString(),
          taskId: 3, // Listening task
          blockId: 'listen_phrase',
          itemId: `item_${index}_${Date.now()}`,
        }),
      });

      const data = await response.json();
      if (data.success && data.audioUrl) {
        handleUpdateItem(index, 'audio_url', data.audioUrl);
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
    const item = items[index];
    const audioUrl = item?.audio_url;
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

  // Option handlers
  const handleAddOption = (itemIndex: number) => {
    const item = items[itemIndex];
    // Support both old format (string) and new format (object with ru/en)
    const newOptions = [...(item.options || []), { text: { ru: '', en: '' }, correct: false }];
    handleUpdateItem(itemIndex, 'options', newOptions);
  };

  const handleUpdateOption = (itemIndex: number, optionIndex: number, field: string, value: any) => {
    const item = items[itemIndex];
    const newOptions = [...(item.options || [])];
    newOptions[optionIndex] = {
      ...newOptions[optionIndex],
      [field]: value,
    };
    handleUpdateItem(itemIndex, 'options', newOptions);
  };

  const handleDeleteOption = (itemIndex: number, optionIndex: number) => {
    const item = items[itemIndex];
    const newOptions = (item.options || []).filter((_: any, i: number) => i !== optionIndex);
    handleUpdateItem(itemIndex, 'options', newOptions);
  };

  const handleMoveOption = (itemIndex: number, optionIndex: number, direction: 'up' | 'down') => {
    const item = items[itemIndex];
    const newOptions = [...(item.options || [])];
    if (direction === 'up' && optionIndex > 0) {
      [newOptions[optionIndex - 1], newOptions[optionIndex]] = [newOptions[optionIndex], newOptions[optionIndex - 1]];
    } else if (direction === 'down' && optionIndex < newOptions.length - 1) {
      [newOptions[optionIndex], newOptions[optionIndex + 1]] = [newOptions[optionIndex + 1], newOptions[optionIndex]];
    }
    handleUpdateItem(itemIndex, 'options', newOptions);
  };

  // Render item
  const renderItem = (item: any, index: number) => {
    const isExpanded = expandedItems.has(index);
    const question = typeof item.question === 'string' 
      ? { ru: item.question, en: '' } 
      : (item.question || { ru: '', en: '' });

    return (
      <div
        key={item.item_id || index}
        className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors"
      >
        {/* Collapsed Header */}
        <div
          onClick={() => handleToggleItem(index)}
          className="flex items-center justify-between p-4 cursor-pointer bg-white hover:bg-gray-50"
        >
          <div className="flex items-center gap-3 flex-1">
            <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
            <div className="flex flex-col gap-1 flex-1">
              <span className="font-bold text-gray-900">Слушай и пойми</span>
              <span className="text-sm text-gray-600">
                {item.audio ? `Аудио: ${item.audio}` : 'Без текста аудио'}
                {item.audio_url && ' • 🎵 Аудио'}
              </span>
              {question.ru && (
                <span className="text-sm text-gray-600">Вопрос: {question.ru}</span>
              )}
              {item.options && item.options.length > 0 && (
                <span className="text-sm text-gray-600">Вариантов ответа: {item.options.length}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {index > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleMoveItem(index, 'up'); }}
                  className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900"
                  title="Переместить вверх"
                >
                  ↑
                </button>
              )}
              {index < items.length - 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleMoveItem(index, 'down'); }}
                  className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900"
                  title="Переместить вниз"
                >
                  ↓
                </button>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteItem(index); }}
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
            {/* Audio Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Аудио текст (PT) *
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={item.audio || ''}
                  onChange={(e) => handleUpdateItem(index, 'audio', e.target.value)}
                  placeholder="Preciso de ajuda."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleGenerateAudio(index); }}
                  disabled={generatingAudio[index] || !item.audio?.trim()}
                  className="px-3 py-2 text-sm text-green-600 hover:text-green-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap border border-gray-300 rounded bg-white"
                  title="Сгенерировать аудио"
                >
                  {generatingAudio[index] ? '⏳' : 'Генерировать аудио'}
                </button>
                {item.audio_url && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handlePlayAudio(index); }}
                    disabled={isPlayingAudio[index]}
                    className="w-8 h-8 flex items-center justify-center text-blue-600 hover:text-blue-800 disabled:opacity-50 border border-gray-300 rounded bg-white"
                    title="Воспроизвести аудио"
                  >
                    {isPlayingAudio[index] ? '⏸️' : '▶️'}
                  </button>
                )}
              </div>
            </div>

            {/* Question */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Вопрос (RU) *
                </label>
                <input
                  type="text"
                  value={question.ru || ''}
                  onChange={(e) => handleUpdateItem(index, 'question', { ...question, ru: e.target.value })}
                  placeholder="О чём говорит человек?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Вопрос (EN) *
                </label>
                <input
                  type="text"
                  value={question.en || ''}
                  onChange={(e) => handleUpdateItem(index, 'question', { ...question, en: e.target.value })}
                  placeholder="What is the person saying?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* Text Hidden Checkbox */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.text_hidden_before_answer !== false}
                  onChange={(e) => handleUpdateItem(index, 'text_hidden_before_answer', e.target.checked)}
                  className="rounded"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-sm font-medium text-gray-700">Скрывать текст до ответа</span>
              </label>
            </div>

            {/* Options */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Варианты ответа ({(item.options || []).length})
                </label>
                <button
                  onClick={(e) => { e.stopPropagation(); handleAddOption(index); }}
                  className="text-blue-600 hover:text-blue-800 font-bold text-sm"
                >
                  + Добавить вариант
                </button>
              </div>
              <div className="space-y-2">
                {(item.options || []).map((option: any, optionIndex: number) => {
                  // Support both old format (string) and new format (object with ru/en)
                  const optionText = typeof option.text === 'string' 
                    ? { ru: option.text, en: '' } 
                    : (option.text || { ru: '', en: '' });
                  
                  return (
                    <div
                      key={optionIndex}
                      className="border border-gray-200 rounded-lg p-3 bg-white"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={optionText.ru || ''}
                          onChange={(e) => handleUpdateOption(index, optionIndex, 'text', { ...optionText, ru: e.target.value })}
                          placeholder="Текст варианта (RU) *"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <input
                          type="text"
                          value={optionText.en || ''}
                          onChange={(e) => handleUpdateOption(index, optionIndex, 'text', { ...optionText, en: e.target.value })}
                          placeholder="Текст варианта (EN) *"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={option.correct || option.is_correct || false}
                            onChange={(e) => handleUpdateOption(index, optionIndex, 'correct', e.target.checked)}
                            className="rounded"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="text-sm text-gray-700">Правильный</span>
                        </label>
                        <div className="flex items-center gap-1">
                          {optionIndex > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMoveOption(index, optionIndex, 'up'); }}
                              className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 border border-gray-300 rounded"
                              title="Переместить вверх"
                            >
                              ↑
                            </button>
                          )}
                          {optionIndex < (item.options || []).length - 1 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMoveOption(index, optionIndex, 'down'); }}
                              className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 border border-gray-300 rounded"
                              title="Переместить вниз"
                            >
                              ↓
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteOption(index, optionIndex); }}
                            className="w-8 h-8 flex items-center justify-center text-red-600 hover:text-red-800 border border-gray-300 rounded"
                            title="Удалить"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
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
            {items.map((item, index) => renderItem(item, index))}
          </div>
        )}
      </div>
    </div>
  );
}
