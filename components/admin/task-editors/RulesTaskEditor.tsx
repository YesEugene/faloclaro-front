'use client';

import { useState, useEffect, useRef } from 'react';
import BlockEditor from '@/components/admin/block-editors/BlockEditor';

interface RulesTaskEditorProps {
  task: any;
  onChange: (task: any) => void;
  lessonDay: number;
}

export default function RulesTaskEditor({ task, onChange, lessonDay }: RulesTaskEditorProps) {
  // Support both old structure (blocks object) and new structure (blocks array)
  const getBlocksArray = () => {
    if (Array.isArray(task.blocks)) {
      // New structure: blocks is already an array
      // Ensure each block has required structure
      return task.blocks.map((block: any) => {
        if (!block || typeof block !== 'object') {
          return {
            block_id: `block_${Date.now()}`,
            block_type: 'explanation',
            content: {},
          };
        }
        return {
          ...block,
          block_id: block.block_id || block.id || `block_${Date.now()}`,
          block_type: typeof block.block_type === 'string' 
            ? block.block_type 
            : (typeof block.type === 'string' ? block.type : 'explanation'),
          content: block.content || {},
        };
      });
    } else if (task.blocks && typeof task.blocks === 'object' && !Array.isArray(task.blocks)) {
      // Old structure: blocks is an object, convert to array
      const blocksOrder = task.structure?.blocks_order || Object.keys(task.blocks);
      return blocksOrder.map((blockId: string) => {
        const oldBlock = task.blocks[blockId];
        if (!oldBlock || typeof oldBlock !== 'object') {
          return {
            block_id: blockId,
            block_type: 'explanation',
            content: {},
          };
        }
        
        // Extract block_type/type - ensure it's a string
        let blockType = oldBlock.type || oldBlock.block_type || 'how_to_say';
        if (typeof blockType !== 'string') {
          blockType = 'explanation';
        }
        
        // Extract content - ensure it's an object, not the whole block
        let content = oldBlock.content;
        if (!content || typeof content !== 'object' || Array.isArray(content)) {
          // If no content, use the block itself but remove type/block_type
          const { type, block_type, ...rest } = oldBlock;
          content = rest && typeof rest === 'object' ? rest : {};
        }
        
        return {
          block_id: blockId,
          block_type: blockType,
          content: content,
        };
      });
    }
    return [];
  };

  const [blocks, setBlocks] = useState<any[]>(getBlocksArray());
  const [showBlockTemplates, setShowBlockTemplates] = useState(false);
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(new Set());
  const [expandedExamples, setExpandedExamples] = useState<{ [blockIndex: number]: Set<number> }>({});
  const [expandedHints, setExpandedHints] = useState<{ [blockIndex: number]: Set<number> }>({});
  const [generatingAudio, setGeneratingAudio] = useState<{ [key: string]: boolean }>({});
  const [isPlayingAudio, setIsPlayingAudio] = useState<{ [key: string]: boolean }>({});
  const [audioUrls, setAudioUrls] = useState<{ [key: string]: string | null }>({});

  const updateTask = (newBlocks: any[]) => {
    setBlocks(newBlocks);
    onChange({
      ...task,
      blocks: newBlocks, // Always use array format for new structure
    });
  };

  const blockTemplates = [
    {
      type: 'explanation',
      name: 'Объяснение',
      description: 'Заголовок, подзаголовок, текст объяснения, аудио примеры, подсказки',
      icon: '📖',
    },
    {
      type: 'comparison',
      name: 'Сравнение',
      description: 'Карточки для сравнения с аудио и примечанием',
      icon: '⚖️',
    },
    {
      type: 'reinforcement',
      name: 'Упражнение',
      description: 'Формы с проигрыванием и вариантами ответа',
      icon: '✅',
    },
    {
      type: 'speak_out_loud',
      name: 'Скажи вслух',
      description: 'Инструкция с текстом и кнопкой завершения',
      icon: '🗣️',
    },
  ];

  const handleAddBlock = (templateType: string) => {
    const blockId = `block_${blocks.length + 1}`;
    const blockTypeMap: Record<string, string> = {
      'explanation': 'how_to_say',
      'comparison': 'comparison',
      'reinforcement': 'reinforcement',
      'speak_out_loud': 'speak_out_loud',
    };
    
    const blockType = blockTypeMap[templateType] || templateType;
    const newBlock: any = {
      block_id: blockId,
      block_type: blockType,
      content: {},
    };

    if (templateType === 'explanation' || blockType === 'how_to_say') {
      newBlock.content = {
        title: { ru: '', en: '' },
        explanation_text: { ru: '', en: '' },
        examples: [],
        hint: [],
      };
    } else if (templateType === 'comparison') {
      newBlock.content = {
        comparison_card: [],
        note: { ru: '', en: '' },
      };
    } else if (templateType === 'reinforcement') {
      newBlock.content = {
        task_1: null,
        task_2: null,
      };
    } else if (templateType === 'speak_out_loud') {
      newBlock.content = {
        instruction_text: { ru: '', en: '' },
        action_button: {
          text: { ru: '✔ Я сказал(а) вслух', en: '✔ I said it out loud' },
          completes_task: true,
        },
      };
    }

    const newBlocks = [...blocks, newBlock];
    updateTask(newBlocks);
    // Auto-expand new explanation blocks
    if (blockType === 'how_to_say' || blockType === 'explanation') {
      setExpandedBlocks(new Set([...expandedBlocks, newBlocks.length - 1]));
    } else {
      // For other types, open in modal
      setEditingBlockIndex(newBlocks.length - 1);
    }
    setShowBlockTemplates(false);
  };

  const handleDeleteBlock = (index: number) => {
    if (confirm('Вы уверены, что хотите удалить этот блок?')) {
      const newBlocks = blocks.filter((_, i) => i !== index);
      updateTask(newBlocks);
      // Remove from expanded set
      const newExpanded = new Set(expandedBlocks);
      newExpanded.delete(index);
      // Adjust indices for blocks after deleted one
      const adjustedExpanded = new Set<number>();
      newExpanded.forEach(idx => {
        if (idx > index) {
          adjustedExpanded.add(idx - 1);
        } else {
          adjustedExpanded.add(idx);
        }
      });
      setExpandedBlocks(adjustedExpanded);
    }
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const newBlocks = [...blocks];
    if (direction === 'up' && index > 0) {
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
      // Update expanded set
      const newExpanded = new Set(expandedBlocks);
      const wasExpanded1 = newExpanded.has(index - 1);
      const wasExpanded2 = newExpanded.has(index);
      newExpanded.delete(index - 1);
      newExpanded.delete(index);
      if (wasExpanded1) newExpanded.add(index);
      if (wasExpanded2) newExpanded.add(index - 1);
      setExpandedBlocks(newExpanded);
    } else if (direction === 'down' && index < newBlocks.length - 1) {
      [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
      // Update expanded set
      const newExpanded = new Set(expandedBlocks);
      const wasExpanded1 = newExpanded.has(index);
      const wasExpanded2 = newExpanded.has(index + 1);
      newExpanded.delete(index);
      newExpanded.delete(index + 1);
      if (wasExpanded1) newExpanded.add(index + 1);
      if (wasExpanded2) newExpanded.add(index);
      setExpandedBlocks(newExpanded);
    }
    updateTask(newBlocks);
  };

  const handleToggleBlock = (index: number) => {
    const newExpanded = new Set(expandedBlocks);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedBlocks(newExpanded);
  };

  const handleUpdateBlock = (index: number, field: string, value: any) => {
    const newBlocks = [...blocks];
    newBlocks[index] = {
      ...newBlocks[index],
      content: {
        ...newBlocks[index].content,
        [field]: value,
      },
    };
    updateTask(newBlocks);
  };

  const handleAddExample = (blockIndex: number) => {
    const block = blocks[blockIndex];
    const examples = block.content?.examples || [];
    const newExample = {
      text: '',
      audio: true,
      pause_after_audio_sec: 1.5, // Default value, not editable
    };
    const newExamples = [...examples, newExample];
    handleUpdateBlock(blockIndex, 'examples', newExamples);
  };

  const handleUpdateExample = (blockIndex: number, exampleIndex: number, field: string, value: any) => {
    const block = blocks[blockIndex];
    const examples = [...(block.content?.examples || [])];
    examples[exampleIndex] = {
      ...examples[exampleIndex],
      [field]: value,
    };
    handleUpdateBlock(blockIndex, 'examples', examples);
  };

  const handleDeleteExample = (blockIndex: number, exampleIndex: number) => {
    if (confirm('Вы уверены, что хотите удалить этот пример?')) {
      const block = blocks[blockIndex];
      const examples = (block.content?.examples || []).filter((_: any, i: number) => i !== exampleIndex);
      handleUpdateBlock(blockIndex, 'examples', examples);
      // Remove from expanded set
      const newExpandedExamples = { ...expandedExamples };
      if (newExpandedExamples[blockIndex]) {
        newExpandedExamples[blockIndex].delete(exampleIndex);
        // Adjust indices
        const adjusted = new Set<number>();
        newExpandedExamples[blockIndex].forEach(idx => {
          if (idx > exampleIndex) {
            adjusted.add(idx - 1);
          } else {
            adjusted.add(idx);
          }
        });
        newExpandedExamples[blockIndex] = adjusted;
        setExpandedExamples(newExpandedExamples);
      }
    }
  };

  const handleAddHint = (blockIndex: number) => {
    const block = blocks[blockIndex];
    const hints = block.content?.hint || [];
    const newHint = { ru: '', en: '' };
    const newHints = [...hints, newHint];
    handleUpdateBlock(blockIndex, 'hint', newHints);
    // Auto-expand the new hint
    const newExpandedHints = { ...expandedHints };
    if (!newExpandedHints[blockIndex]) {
      newExpandedHints[blockIndex] = new Set();
    }
    newExpandedHints[blockIndex].add(newHints.length - 1);
    setExpandedHints(newExpandedHints);
  };

  const handleUpdateHint = (blockIndex: number, hintIndex: number, field: string, value: string) => {
    const block = blocks[blockIndex];
    const hints = [...(block.content?.hint || [])];
    hints[hintIndex] = {
      ...hints[hintIndex],
      [field]: value,
    };
    handleUpdateBlock(blockIndex, 'hint', hints);
  };

  const handleDeleteHint = (blockIndex: number, hintIndex: number) => {
    if (confirm('Вы уверены, что хотите удалить эту подсказку?')) {
      const block = blocks[blockIndex];
      const hints = (block.content?.hint || []).filter((_: any, i: number) => i !== hintIndex);
      handleUpdateBlock(blockIndex, 'hint', hints);
      // Remove from expanded set
      const newExpandedHints = { ...expandedHints };
      if (newExpandedHints[blockIndex]) {
        newExpandedHints[blockIndex].delete(hintIndex);
        // Adjust indices
        const adjusted = new Set<number>();
        newExpandedHints[blockIndex].forEach(idx => {
          if (idx > hintIndex) {
            adjusted.add(idx - 1);
          } else {
            adjusted.add(idx);
          }
        });
        newExpandedHints[blockIndex] = adjusted;
        setExpandedHints(newExpandedHints);
      }
    }
  };

  const handleGenerateAudio = async (blockIndex: number, exampleIndex: number) => {
    const block = blocks[blockIndex];
    const examples = block.content?.examples || [];
    const example = examples[exampleIndex];
    if (!example || !example.text || !example.text.trim()) {
      alert('Пожалуйста, сначала добавьте текст примера');
      return;
    }

    const key = `${blockIndex}_${exampleIndex}`;
    setGeneratingAudio(prev => ({ ...prev, [key]: true }));

    try {
      const response = await fetch('/api/admin/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: example.text.trim(),
          lessonId: lessonDay.toString(),
          taskId: 2, // Rules task
          blockId: block.block_id || block.block_type || 'explanation',
          itemId: `example_${exampleIndex}_${Date.now()}`,
        }),
      });

      const data = await response.json();
      if (data.success && data.audioUrl) {
        // Update example with audio_url
        const newExamples = [...examples];
        newExamples[exampleIndex] = {
          ...newExamples[exampleIndex],
          audio_url: data.audioUrl,
        };
        handleUpdateBlock(blockIndex, 'examples', newExamples);
        setAudioUrls(prev => ({ ...prev, [key]: data.audioUrl }));
      } else {
        alert('Ошибка при генерации аудио: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      alert('Ошибка при генерации аудио');
    } finally {
      setGeneratingAudio(prev => ({ ...prev, [key]: false }));
    }
  };

  const handlePlayAudio = (blockIndex: number, exampleIndex: number) => {
    const block = blocks[blockIndex];
    const examples = block.content?.examples || [];
    const example = examples[exampleIndex];
    const key = `${blockIndex}_${exampleIndex}`;
    const audioUrl = audioUrls[key] || example?.audio_url;
    if (!audioUrl) return;

    setIsPlayingAudio(prev => ({ ...prev, [key]: true }));
    const audio = new Audio(audioUrl);
    audio.play().catch(err => {
      console.error('Error playing audio:', err);
      setIsPlayingAudio(prev => ({ ...prev, [key]: false }));
    });
    audio.onended = () => setIsPlayingAudio(prev => ({ ...prev, [key]: false }));
    audio.onerror = () => setIsPlayingAudio(prev => ({ ...prev, [key]: false }));
  };

  // Check for existing audio URLs when examples change
  useEffect(() => {
    const checkAudioUrls = async () => {
      const urls: { [key: string]: string | null } = {};
      
      blocks.forEach((block, blockIndex) => {
        if (block.block_type === 'how_to_say' || block.block_type === 'explanation') {
          const examples = block.content?.examples || [];
          examples.forEach((example: any, exampleIndex: number) => {
            const key = `${blockIndex}_${exampleIndex}`;
            if (example.audio_url) {
              urls[key] = example.audio_url;
            } else if (example.text && example.text.trim()) {
              // Check database asynchronously
              fetch(`/api/phrases?text=${encodeURIComponent(example.text.trim())}`)
                .then(res => res.json())
                .then(data => {
                  if (data.success && data.exists && data.audioUrl) {
                    setAudioUrls(prev => ({ ...prev, [key]: data.audioUrl }));
                  }
                })
                .catch(err => console.error(`Error checking audio for example ${key}:`, err));
            }
          });
        }
      });
      
      setAudioUrls(prev => ({ ...prev, ...urls }));
    };
    
    if (blocks.length > 0) {
      checkAudioUrls();
    }
  }, [blocks]);

  const handleSaveBlock = (index: number, block: any) => {
    const newBlocks = [...blocks];
    newBlocks[index] = block;
    updateTask(newBlocks);
    setEditingBlockIndex(null);
  };

  // Render explanation block inline (accordion)
  const renderExplanationBlock = (block: any, index: number) => {
    const isExpanded = expandedBlocks.has(index);
    const content = block.content || {};
    const title = content.title || { ru: '', en: '' };
    const explanationText = content.explanation_text || { ru: '', en: '' };
    const examples = content.examples || [];
    const hints = content.hint || [];

    return (
      <div
        key={block.block_id || `block_${index}`}
        className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors"
      >
        {/* Collapsed Header - Clickable */}
        <div
          onClick={() => handleToggleBlock(index)}
          className="flex items-center justify-between p-4 cursor-pointer bg-white hover:bg-gray-50"
        >
          <div className="flex items-center gap-3 flex-1">
            <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
            <div className="flex flex-col gap-1 flex-1">
              <span className="font-bold text-gray-900">Даем примеры (текст + аудио + подсказки)</span>
              <span className="text-sm text-gray-600">
                {typeof title === 'string' 
                  ? title 
                  : (title.ru && title.en 
                    ? `${title.ru} - ${title.en}`
                    : (title.ru || title.en || 'Без названия'))}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Group 1: Move buttons */}
            <div className="flex items-center gap-1">
              {index > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveBlock(index, 'up');
                  }}
                  className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900"
                  title="Переместить вверх"
                >
                  ↑
                </button>
              )}
              {index < blocks.length - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveBlock(index, 'down');
                  }}
                  className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900"
                  title="Переместить вниз"
                >
                  ↓
                </button>
              )}
            </div>
            {/* Group 2: Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteBlock(index);
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
            {/* Block Title Row */}
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                value={typeof title === 'string' ? title : (title.ru || '')}
                onChange={(e) => handleUpdateBlock(index, 'title', { ...title, ru: e.target.value })}
                placeholder="Название блока (RU) *"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
              <input
                type="text"
                value={typeof title === 'string' ? '' : (title.en || '')}
                onChange={(e) => handleUpdateBlock(index, 'title', { ...title, en: e.target.value })}
                placeholder="Название блока (EN) *"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Explanation Text Row */}
            <div className="grid grid-cols-2 gap-4">
              <textarea
                value={typeof explanationText === 'string' ? explanationText : (explanationText.ru || '')}
                onChange={(e) => handleUpdateBlock(index, 'explanation_text', { ...explanationText, ru: e.target.value })}
                placeholder="Текст объяснения (RU)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg h-20 resize-y"
                onClick={(e) => e.stopPropagation()}
              />
              <textarea
                value={typeof explanationText === 'string' ? '' : (explanationText.en || '')}
                onChange={(e) => handleUpdateBlock(index, 'explanation_text', { ...explanationText, en: e.target.value })}
                placeholder="Текст объяснения (EN)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg h-20 resize-y"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Examples Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Примеры ({examples.length})</h3>
              <div className="space-y-2">
                {examples.map((example: any, exampleIndex: number) => {
                  const key = `${index}_${exampleIndex}`;
                  const hasAudio = audioUrls[key] || example?.audio_url;

                  return (
                    <div
                      key={exampleIndex}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={example.text || ''}
                        onChange={(e) => handleUpdateExample(index, exampleIndex, 'text', e.target.value)}
                        placeholder="Текст примера (PT) *"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateAudio(index, exampleIndex);
                        }}
                        disabled={generatingAudio[key] || !example.text?.trim()}
                        className="px-2 py-2 text-xs text-green-600 hover:text-green-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        title="Сгенерировать аудио"
                      >
                        {generatingAudio[key] ? '⏳' : 'Генерировать аудио'}
                      </button>
                      {hasAudio && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayAudio(index, exampleIndex);
                          }}
                          disabled={isPlayingAudio[key]}
                          className="w-8 h-8 flex items-center justify-center text-blue-600 hover:text-blue-800 disabled:opacity-50 border border-gray-300 rounded"
                          title="Воспроизвести аудио"
                        >
                          {isPlayingAudio[key] ? '⏸️' : '▶️'}
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteExample(index, exampleIndex);
                        }}
                        className="w-8 h-8 flex items-center justify-center text-red-600 hover:text-red-800 border border-gray-300 rounded"
                        title="Удалить"
                      >
                        🗑️
                      </button>
                    </div>
                  );
                })}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddExample(index);
                  }}
                  className="text-blue-600 hover:text-blue-800 font-bold text-sm"
                >
                  + Добавить пример
                </button>
              </div>
            </div>

            {/* Hints Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Подсказки ({hints.length})</h3>
              <div className="space-y-2">
                {hints.map((hint: any, hintIndex: number) => {
                  return (
                    <div
                      key={hintIndex}
                      className="grid grid-cols-2 gap-2"
                    >
                      <input
                        type="text"
                        value={typeof hint === 'string' ? hint : (hint.ru || '')}
                        onChange={(e) => handleUpdateHint(index, hintIndex, 'ru', e.target.value)}
                        placeholder="Подсказка (RU) *"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={typeof hint === 'string' ? '' : (hint.en || '')}
                          onChange={(e) => handleUpdateHint(index, hintIndex, 'en', e.target.value)}
                          placeholder="Подсказка (EN)"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteHint(index, hintIndex);
                          }}
                          className="w-8 h-8 flex items-center justify-center text-red-600 hover:text-red-800 border border-gray-300 rounded"
                          title="Удалить"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddHint(index);
                  }}
                  className="text-blue-600 hover:text-blue-800 font-bold text-sm"
                >
                  + Добавить подсказку
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Comparison Block
  const renderComparisonBlock = (block: any, index: number) => {
    const isExpanded = expandedBlocks.has(index);
    const content = block.content || {};
    const title = content.title || { ru: '', en: '' };
    const comparisonCards = content.comparison_card || [];
    const note = content.note || { ru: '', en: '' };

    const handleUpdateCard = (cardIndex: number, field: string, value: any) => {
      const newCards = [...comparisonCards];
      newCards[cardIndex] = { ...newCards[cardIndex], [field]: value };
      handleUpdateBlock(index, 'comparison_card', newCards);
    };

    const handleAddCard = () => {
      const newCards = [...comparisonCards, { text: '', audio: true }];
      handleUpdateBlock(index, 'comparison_card', newCards);
    };

    const handleDeleteCard = (cardIndex: number) => {
      if (confirm('Вы уверены, что хотите удалить эту карточку?')) {
        const newCards = comparisonCards.filter((_: any, i: number) => i !== cardIndex);
        handleUpdateBlock(index, 'comparison_card', newCards);
      }
    };

    const handleGenerateAudio = async (cardIndex: number) => {
      const card = comparisonCards[cardIndex];
      if (!card || !card.text || !card.text.trim()) {
        alert('Пожалуйста, сначала добавьте текст карточки');
        return;
      }

      const key = `comparison_${index}_${cardIndex}`;
      setGeneratingAudio(prev => ({ ...prev, [key]: true }));

      try {
        const response = await fetch('/api/admin/audio/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: card.text.trim(),
            lessonId: lessonDay.toString(),
            taskId: task.task_id,
            blockId: block.block_id,
            itemId: `card_${cardIndex}_${Date.now()}`,
          }),
        });

        const data = await response.json();
        if (data.success && data.audioUrl) {
          handleUpdateCard(cardIndex, 'audio_url', data.audioUrl);
          setAudioUrls(prev => ({ ...prev, [key]: data.audioUrl }));
        } else {
          alert('Ошибка при генерации аудио: ' + (data.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error generating audio:', error);
        alert('Ошибка при генерации аудио');
      } finally {
        setGeneratingAudio(prev => ({ ...prev, [key]: false }));
      }
    };

    const handlePlayAudio = (cardIndex: number) => {
      const card = comparisonCards[cardIndex];
      const key = `comparison_${index}_${cardIndex}`;
      const audioUrl = audioUrls[key] || card?.audio_url;
      if (!audioUrl) return;

      setIsPlayingAudio(prev => ({ ...prev, [key]: true }));
      const audio = new Audio(audioUrl);
      audio.play().catch(err => {
        console.error('Error playing audio:', err);
        setIsPlayingAudio(prev => ({ ...prev, [key]: false }));
      });
      audio.onended = () => setIsPlayingAudio(prev => ({ ...prev, [key]: false }));
      audio.onerror = () => setIsPlayingAudio(prev => ({ ...prev, [key]: false }));
    };

    return (
      <div
        key={block.block_id || `block_${index}`}
        className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors"
      >
        {/* Collapsed Header */}
        <div
          onClick={() => handleToggleBlock(index)}
          className="flex items-center justify-between p-4 cursor-pointer bg-white hover:bg-gray-50"
        >
          <div className="flex items-center gap-3 flex-1">
            <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
            <div className="flex flex-col gap-1 flex-1">
              <span className="font-bold text-gray-900">Сравниваем варианты</span>
              <span className="text-sm text-gray-600">
                {typeof title === 'string' 
                  ? title 
                  : (title.ru && title.en 
                    ? `${title.ru} - ${title.en}`
                    : (title.ru || title.en || 'Без названия'))}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {index > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleMoveBlock(index, 'up'); }}
                  className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900"
                  title="Переместить вверх"
                >
                  ↑
                </button>
              )}
              {index < blocks.length - 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleMoveBlock(index, 'down'); }}
                  className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900"
                  title="Переместить вниз"
                >
                  ↓
                </button>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteBlock(index); }}
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
            {/* Block Title */}
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                value={typeof title === 'string' ? title : (title.ru || '')}
                onChange={(e) => handleUpdateBlock(index, 'title', { ...title, ru: e.target.value })}
                placeholder="Название блока (RU) *"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
              <input
                type="text"
                value={typeof title === 'string' ? '' : (title.en || '')}
                onChange={(e) => handleUpdateBlock(index, 'title', { ...title, en: e.target.value })}
                placeholder="Название блока (EN) *"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Comparison Cards */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Карточки для сравнения ({comparisonCards.length})</h3>
              <div className="space-y-2">
                {comparisonCards.map((card: any, cardIndex: number) => {
                  const key = `comparison_${index}_${cardIndex}`;
                  const hasAudio = audioUrls[key] || card?.audio_url;
                  return (
                    <div key={cardIndex} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={card.text || ''}
                        onChange={(e) => handleUpdateCard(cardIndex, 'text', e.target.value)}
                        placeholder="Текст карточки (PT) *"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleGenerateAudio(cardIndex); }}
                        disabled={generatingAudio[key] || !card.text?.trim()}
                        className="px-2 py-2 text-xs text-green-600 hover:text-green-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        title="Сгенерировать аудио"
                      >
                        {generatingAudio[key] ? '⏳' : 'Генерировать аудио'}
                      </button>
                      {hasAudio && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePlayAudio(cardIndex); }}
                          disabled={isPlayingAudio[key]}
                          className="w-8 h-8 flex items-center justify-center text-blue-600 hover:text-blue-800 disabled:opacity-50 border border-gray-300 rounded"
                          title="Воспроизвести аудио"
                        >
                          {isPlayingAudio[key] ? '⏸️' : '▶️'}
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteCard(cardIndex); }}
                        className="w-8 h-8 flex items-center justify-center text-red-600 hover:text-red-800 border border-gray-300 rounded"
                        title="Удалить"
                      >
                        🗑️
                      </button>
                    </div>
                  );
                })}
                <button
                  onClick={(e) => { e.stopPropagation(); handleAddCard(); }}
                  className="text-blue-600 hover:text-blue-800 font-bold text-sm"
                >
                  + Добавить карточку
                </button>
              </div>
            </div>

            {/* Note */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Примечание</h3>
              <div className="grid grid-cols-2 gap-4">
                <textarea
                  value={typeof note === 'string' ? note : (note.ru || '')}
                  onChange={(e) => handleUpdateBlock(index, 'note', { ...note, ru: e.target.value })}
                  placeholder="Примечание (RU)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24"
                  onClick={(e) => e.stopPropagation()}
                />
                <textarea
                  value={typeof note === 'string' ? '' : (note.en || '')}
                  onChange={(e) => handleUpdateBlock(index, 'note', { ...note, en: e.target.value })}
                  placeholder="Примечание (EN)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Reinforcement Block
  const renderReinforcementBlock = (block: any, index: number) => {
    const isExpanded = expandedBlocks.has(index);
    const content = block.content || {};
    const title = content.title || { ru: '', en: '' };
    const task1 = content.task_1 || null;
    const task2 = content.task_2 || null;

    const handleUpdateTask = (taskNumber: 1 | 2, task: any) => {
      if (taskNumber === 1) {
        handleUpdateBlock(index, 'task_1', task);
      } else {
        handleUpdateBlock(index, 'task_2', task);
      }
    };

    const handleDeleteTask = (taskNumber: 1 | 2) => {
      if (confirm(`Вы уверены, что хотите удалить задание ${taskNumber}?`)) {
        handleUpdateTask(taskNumber, null);
      }
    };

    const handleCreateTask = (taskNumber: 1 | 2) => {
      const newTask = {
        format: 'single_choice',
        audio: '',
        audio_url: '',
        question: { ru: '', en: '' },
        options: [],
      };
      handleUpdateTask(taskNumber, newTask);
    };

    const handleUpdateTaskField = (taskNumber: 1 | 2, field: string, value: any) => {
      const task = taskNumber === 1 ? task1 : task2;
      if (!task) return;
      handleUpdateTask(taskNumber, { ...task, [field]: value });
    };

    const handleUpdateOption = (taskNumber: 1 | 2, optionIndex: number, field: string, value: any) => {
      const task = taskNumber === 1 ? task1 : task2;
      if (!task || !task.options) return;
      const newOptions = [...task.options];
      newOptions[optionIndex] = { ...newOptions[optionIndex], [field]: value };
      handleUpdateTask(taskNumber, { ...task, options: newOptions });
    };

    const handleAddOption = (taskNumber: 1 | 2) => {
      const task = taskNumber === 1 ? task1 : task2;
      if (!task) return;
      const newOption = task.format === 'single_choice'
        ? { text: { ru: '', en: '' }, correct: false }
        : { text: '', correct: false };
      const newOptions = [...(task.options || []), newOption];
      handleUpdateTask(taskNumber, { ...task, options: newOptions });
    };

    const handleDeleteOption = (taskNumber: 1 | 2, optionIndex: number) => {
      const task = taskNumber === 1 ? task1 : task2;
      if (!task || !task.options) return;
      const newOptions = task.options.filter((_: any, i: number) => i !== optionIndex);
      handleUpdateTask(taskNumber, { ...task, options: newOptions });
    };

    const handleMoveOption = (taskNumber: 1 | 2, optionIndex: number, direction: 'up' | 'down') => {
      const task = taskNumber === 1 ? task1 : task2;
      if (!task || !task.options) return;
      const newOptions = [...task.options];
      if (direction === 'up' && optionIndex > 0) {
        [newOptions[optionIndex - 1], newOptions[optionIndex]] = [newOptions[optionIndex], newOptions[optionIndex - 1]];
      } else if (direction === 'down' && optionIndex < newOptions.length - 1) {
        [newOptions[optionIndex], newOptions[optionIndex + 1]] = [newOptions[optionIndex + 1], newOptions[optionIndex]];
      }
      handleUpdateTask(taskNumber, { ...task, options: newOptions });
    };

    const handleGenerateAudio = async (taskNumber: 1 | 2) => {
      const task = taskNumber === 1 ? task1 : task2;
      if (!task || !task.audio || !task.audio.trim()) {
        alert('Пожалуйста, сначала добавьте текст для аудио');
        return;
      }

      const key = `reinforcement_${index}_${taskNumber}`;
      setGeneratingAudio(prev => ({ ...prev, [key]: true }));

      try {
        const response = await fetch('/api/admin/audio/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: task.audio.trim(),
            lessonId: lessonDay.toString(),
            taskId: task.task_id,
            blockId: block.block_id,
            itemId: `task_${taskNumber}_${Date.now()}`,
          }),
        });

        const data = await response.json();
        if (data.success && data.audioUrl) {
          handleUpdateTaskField(taskNumber, 'audio_url', data.audioUrl);
          setAudioUrls(prev => ({ ...prev, [key]: data.audioUrl }));
        } else {
          alert('Ошибка при генерации аудио: ' + (data.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error generating audio:', error);
        alert('Ошибка при генерации аудио');
      } finally {
        setGeneratingAudio(prev => ({ ...prev, [key]: false }));
      }
    };

    const handlePlayAudio = (taskNumber: 1 | 2) => {
      const task = taskNumber === 1 ? task1 : task2;
      const key = `reinforcement_${index}_${taskNumber}`;
      const audioUrl = audioUrls[key] || task?.audio_url;
      if (!audioUrl) return;

      setIsPlayingAudio(prev => ({ ...prev, [key]: true }));
      const audio = new Audio(audioUrl);
      audio.play().catch(err => {
        console.error('Error playing audio:', err);
        setIsPlayingAudio(prev => ({ ...prev, [key]: false }));
      });
      audio.onended = () => setIsPlayingAudio(prev => ({ ...prev, [key]: false }));
      audio.onerror = () => setIsPlayingAudio(prev => ({ ...prev, [key]: false }));
    };

    const renderTask = (taskNumber: 1 | 2) => {
      const task = taskNumber === 1 ? task1 : task2;
      const key = `reinforcement_${index}_${taskNumber}`;
      const hasAudio = audioUrls[key] || task?.audio_url;

      if (!task) {
        return (
          <div className="border border-gray-300 rounded-lg p-4 bg-white">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Задание {taskNumber}</h3>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleCreateTask(taskNumber); }}
              className="text-blue-600 hover:text-blue-800 font-bold text-sm"
            >
              + Добавить задание {taskNumber}
            </button>
          </div>
        );
      }

      return (
        <div className="border border-gray-300 rounded-lg p-4 bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Задание {taskNumber}</h3>
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteTask(taskNumber); }}
              className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1"
            >
              <span>Удалить задание</span>
              <span>🗑️</span>
            </button>
          </div>

          {/* Format Selection */}
          <div className="mb-4">
            <select
              value={task.format || 'single_choice'}
              onChange={(e) => {
                const newFormat = e.target.value;
                handleUpdateTaskField(taskNumber, 'format', newFormat);
                if (newFormat === 'single_choice') {
                  handleUpdateTaskField(taskNumber, 'options', []);
                } else {
                  handleUpdateTaskField(taskNumber, 'options', []);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="single_choice">Одиночный выбор (аудио + вопрос + варианты)</option>
              <option value="situation_to_phrase">Ситуация к фразе (ситуация + варианты фраз)</option>
            </select>
          </div>

          {/* Audio (only for single_choice) */}
          {task.format === 'single_choice' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Текст примера (PT) *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={task.audio || ''}
                  onChange={(e) => handleUpdateTaskField(taskNumber, 'audio', e.target.value)}
                  placeholder="Текст примера (PT) *"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); handleGenerateAudio(taskNumber); }}
                  disabled={generatingAudio[key] || !task.audio?.trim()}
                  className="px-3 py-2 text-xs text-green-600 hover:text-green-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap border border-gray-300 rounded"
                  title="Генерировать аудио"
                >
                  {generatingAudio[key] ? '⏳' : 'Генерировать аудио'}
                </button>
                {hasAudio && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePlayAudio(taskNumber); }}
                    disabled={isPlayingAudio[key]}
                    className="w-8 h-8 flex items-center justify-center text-blue-600 hover:text-blue-800 disabled:opacity-50 border border-gray-300 rounded"
                    title="Воспроизвести аудио"
                  >
                    {isPlayingAudio[key] ? '⏸️' : '▶️'}
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleUpdateTaskField(taskNumber, 'audio_url', ''); }}
                  className="w-8 h-8 flex items-center justify-center text-red-600 hover:text-red-800 border border-gray-300 rounded"
                  title="Удалить аудио"
                >
                  🗑️
                </button>
              </div>
            </div>
          )}

          {/* Question (for single_choice) */}
          {task.format === 'single_choice' && (
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={typeof task.question === 'string' ? '' : (task.question?.ru || '')}
                  onChange={(e) => handleUpdateTaskField(taskNumber, 'question', { ...task.question, ru: e.target.value })}
                  placeholder="Вопрос (RU) *"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
                <input
                  type="text"
                  value={typeof task.question === 'string' ? '' : (task.question?.en || '')}
                  onChange={(e) => handleUpdateTaskField(taskNumber, 'question', { ...task.question, en: e.target.value })}
                  placeholder="Вопрос (EN) *"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          {/* Situation Text (for situation_to_phrase) */}
          {task.format === 'situation_to_phrase' && (
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={typeof task.situation_text === 'string' ? '' : (task.situation_text?.ru || '')}
                  onChange={(e) => handleUpdateTaskField(taskNumber, 'situation_text', { ...task.situation_text, ru: e.target.value })}
                  placeholder="Текст ситуации (RU) *"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
                <input
                  type="text"
                  value={typeof task.situation_text === 'string' ? '' : (task.situation_text?.en || '')}
                  onChange={(e) => handleUpdateTaskField(taskNumber, 'situation_text', { ...task.situation_text, en: e.target.value })}
                  placeholder="Текст ситуации (EN) *"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          {/* Options */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Варианты ответов</h4>
            <div className="space-y-2">
              {(task.options || []).map((option: any, optionIndex: number) => (
                <div key={optionIndex} className="flex items-center gap-2">
                  {task.format === 'single_choice' ? (
                    <>
                      <input
                        type="text"
                        value={typeof option.text === 'string' ? '' : (option.text?.ru || '')}
                        onChange={(e) => handleUpdateOption(taskNumber, optionIndex, 'text', { ...option.text, ru: e.target.value })}
                        placeholder="Текст (RU) *"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <input
                        type="text"
                        value={typeof option.text === 'string' ? '' : (option.text?.en || '')}
                        onChange={(e) => handleUpdateOption(taskNumber, optionIndex, 'text', { ...option.text, en: e.target.value })}
                        placeholder="Текст (EN) *"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </>
                  ) : (
                    <input
                      type="text"
                      value={typeof option.text === 'string' ? option.text : ''}
                      onChange={(e) => handleUpdateOption(taskNumber, optionIndex, 'text', e.target.value)}
                      placeholder="Текст фразы (PT) *"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <input
                    type="checkbox"
                    checked={option.correct || false}
                    onChange={(e) => handleUpdateOption(taskNumber, optionIndex, 'correct', e.target.checked)}
                    className="w-5 h-5"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMoveOption(taskNumber, optionIndex, 'up'); }}
                    disabled={optionIndex === 0}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 disabled:opacity-30 border border-gray-300 rounded"
                    title="Переместить вверх"
                  >
                    ↑
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMoveOption(taskNumber, optionIndex, 'down'); }}
                    disabled={optionIndex === (task.options?.length || 0) - 1}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 disabled:opacity-30 border border-gray-300 rounded"
                    title="Переместить вниз"
                  >
                    ↓
                  </button>
                </div>
              ))}
              <button
                onClick={(e) => { e.stopPropagation(); handleAddOption(taskNumber); }}
                className="text-blue-600 hover:text-blue-800 font-bold text-sm"
              >
                + Добавить вариант
              </button>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div
        key={block.block_id || `block_${index}`}
        className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors"
      >
        {/* Collapsed Header */}
        <div
          onClick={() => handleToggleBlock(index)}
          className="flex items-center justify-between p-4 cursor-pointer bg-white hover:bg-gray-50"
        >
          <div className="flex items-center gap-3 flex-1">
            <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
            <div className="flex flex-col gap-1 flex-1">
              <span className="font-bold text-gray-900">Проверка знаний</span>
              <span className="text-sm text-gray-600">
                {typeof title === 'string' 
                  ? title 
                  : (title.ru && title.en 
                    ? `${title.ru} - ${title.en}`
                    : (title.ru || title.en || 'Без названия'))}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {index > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleMoveBlock(index, 'up'); }}
                  className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900"
                  title="Переместить вверх"
                >
                  ↑
                </button>
              )}
              {index < blocks.length - 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleMoveBlock(index, 'down'); }}
                  className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900"
                  title="Переместить вниз"
                >
                  ↓
                </button>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteBlock(index); }}
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
            {/* Block Title */}
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                value={typeof title === 'string' ? title : (title.ru || '')}
                onChange={(e) => handleUpdateBlock(index, 'title', { ...title, ru: e.target.value })}
                placeholder="Название блока (RU) *"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
              <input
                type="text"
                value={typeof title === 'string' ? '' : (title.en || '')}
                onChange={(e) => handleUpdateBlock(index, 'title', { ...title, en: e.target.value })}
                placeholder="Название блока (EN) *"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Task 1 */}
            {renderTask(1)}

            {/* Task 2 */}
            {renderTask(2)}
          </div>
        )}
      </div>
    );
  };

  // Render Speak Out Loud Block
  const renderSpeakOutLoudBlock = (block: any, index: number) => {
    const isExpanded = expandedBlocks.has(index);
    const content = block.content || {};
    const instructionText = content.instruction_text || { ru: '', en: '' };
    const actionButton = content.action_button || {
      text: { ru: '✔ Я сказал(а) вслух', en: '✔ I said it out loud' },
      completes_task: true,
    };

    return (
      <div
        key={block.block_id || `block_${index}`}
        className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors"
      >
        {/* Collapsed Header */}
        <div
          onClick={() => handleToggleBlock(index)}
          className="flex items-center justify-between p-4 cursor-pointer bg-white hover:bg-gray-50"
        >
          <div className="flex items-center gap-3 flex-1">
            <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
            <div className="flex flex-col gap-1 flex-1">
              <span className="font-bold text-gray-900">Практикуемся (пишем или говорим вслух)</span>
              <span className="text-sm text-gray-600">Блок практики</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {index > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleMoveBlock(index, 'up'); }}
                  className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900"
                  title="Переместить вверх"
                >
                  ↑
                </button>
              )}
              {index < blocks.length - 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleMoveBlock(index, 'down'); }}
                  className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900"
                  title="Переместить вниз"
                >
                  ↓
                </button>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteBlock(index); }}
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
            {/* Instruction Text */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Инструкция</h3>
              <div className="grid grid-cols-2 gap-4">
                <textarea
                  value={typeof instructionText === 'string' ? instructionText : (instructionText.ru || '')}
                  onChange={(e) => handleUpdateBlock(index, 'instruction_text', { ...instructionText, ru: e.target.value })}
                  placeholder="Инструкция (RU) *"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg h-32"
                  onClick={(e) => e.stopPropagation()}
                />
                <textarea
                  value={typeof instructionText === 'string' ? '' : (instructionText.en || '')}
                  onChange={(e) => handleUpdateBlock(index, 'instruction_text', { ...instructionText, en: e.target.value })}
                  placeholder="Инструкция (EN) *"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg h-32"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* Action Button */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Кнопка действия</h3>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={typeof actionButton?.text === 'string' ? actionButton?.text : (actionButton?.text?.ru || '')}
                  onChange={(e) => handleUpdateBlock(index, 'action_button', {
                    ...actionButton,
                    text: { ...actionButton?.text, ru: e.target.value },
                    completes_task: true,
                  })}
                  placeholder="Текст кнопки (RU) *"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
                <input
                  type="text"
                  value={typeof actionButton?.text === 'string' ? '' : (actionButton?.text?.en || '')}
                  onChange={(e) => handleUpdateBlock(index, 'action_button', {
                    ...actionButton,
                    text: { ...actionButton?.text, en: e.target.value },
                    completes_task: true,
                  })}
                  placeholder="Текст кнопки (EN) *"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // For Reinforcement blocks, use modal editor for task editing
  if (editingBlockIndex !== null && editingBlockIndex >= 0 && editingBlockIndex < blocks.length) {
    const blockToEdit = blocks[editingBlockIndex];
    const blockType = typeof blockToEdit.block_type === 'string' 
      ? blockToEdit.block_type 
      : (typeof blockToEdit.type === 'string' ? blockToEdit.type : 'unknown');
    
    // Only show modal for Reinforcement blocks when editing tasks
    if (blockType === 'reinforcement') {
      // Ensure block has required structure
      if (!blockToEdit || typeof blockToEdit !== 'object') {
        console.error('Invalid block structure:', blockToEdit);
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-red-600">Ошибка: блок имеет неверную структуру</p>
            <button
              onClick={() => setEditingBlockIndex(null)}
              className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Назад
            </button>
          </div>
        );
      }

      // Ensure block has block_id and block_type
      const normalizedBlock = {
        ...blockToEdit,
        block_id: blockToEdit.block_id || `block_${editingBlockIndex + 1}`,
        block_type: blockToEdit.block_type || blockToEdit.type || 'explanation',
        content: blockToEdit.content || {},
      };

      return (
        <BlockEditor
          blockKey={normalizedBlock.block_id}
          block={normalizedBlock}
          lessonDay={lessonDay}
          onSave={(block) => handleSaveBlock(editingBlockIndex, block)}
          onCancel={() => setEditingBlockIndex(null)}
        />
      );
    } else {
      // If it's an explanation block, just close the modal and expand it
      setEditingBlockIndex(null);
      setExpandedBlocks(new Set([...expandedBlocks, editingBlockIndex]));
    }
  }

  return (
    <div className="space-y-6">
      {/* Blocks */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Блоки ({blocks.length})</h2>
          <button
            onClick={() => setShowBlockTemplates(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Добавить блок
          </button>
        </div>

        {blocks.length === 0 ? (
          <p className="text-gray-600 text-center py-8">
            Блоки еще не добавлены. Нажмите "Добавить блок", чтобы начать.
          </p>
        ) : (
          <div className="space-y-2">
            {blocks.map((block, index) => {
              if (!block || typeof block !== 'object') {
                console.warn(`Invalid block at index ${index}:`, block);
                return null;
              }
              
              // Safely extract block type - must be a string
              const blockType = typeof block.block_type === 'string' 
                ? block.block_type 
                : (typeof block.type === 'string' ? block.type : 'unknown');
              
              // Render blocks inline based on type
              if (blockType === 'how_to_say' || blockType === 'explanation') {
                return renderExplanationBlock(block, index);
              } else if (blockType === 'comparison') {
                return renderComparisonBlock(block, index);
              } else if (blockType === 'reinforcement') {
                return renderReinforcementBlock(block, index);
              } else if (blockType === 'speak_out_loud') {
                return renderSpeakOutLoudBlock(block, index);
              }

              // Fallback for unknown block types
              return (
                <div
                  key={block.block_id || `block_${index}`}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <p className="text-red-600">Неизвестный тип блока: {blockType}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Block Templates Modal */}
      {showBlockTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Выберите тип блока</h2>
                <button
                  onClick={() => setShowBlockTemplates(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {blockTemplates.map((template) => (
                <button
                  key={template.type}
                  onClick={() => handleAddBlock(template.type)}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                >
                  <div className="text-3xl mb-2">{template.icon}</div>
                  <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
