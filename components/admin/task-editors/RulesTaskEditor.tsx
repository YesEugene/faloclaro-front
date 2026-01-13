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
            <div className="flex items-center gap-2 flex-1">
              <span className="font-semibold text-gray-900">
                {typeof title === 'string' 
                  ? title 
                  : (title.ru && title.en 
                    ? `${title.ru} — ${title.en}`
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

  // For non-explanation blocks, use modal editor
  if (editingBlockIndex !== null && editingBlockIndex >= 0 && editingBlockIndex < blocks.length) {
    const blockToEdit = blocks[editingBlockIndex];
    const blockType = typeof blockToEdit.block_type === 'string' 
      ? blockToEdit.block_type 
      : (typeof blockToEdit.type === 'string' ? blockToEdit.type : 'unknown');
    
    // Only show modal for non-explanation blocks
    if (blockType !== 'how_to_say' && blockType !== 'explanation') {
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
              
              // Render explanation blocks inline
              if (blockType === 'how_to_say' || blockType === 'explanation') {
                return renderExplanationBlock(block, index);
              }

              // For other block types, show collapsed view with edit button
              const blockTitle = (block.content && typeof block.content === 'object' && block.content.title)
                ? block.content.title
                : (block.title && typeof block.title === 'object' ? block.title : {});

              return (
                <div
                  key={block.block_id || `block_${index}`}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-medium text-gray-500">
                          Блок {index + 1} / {blocks.length}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                          {blockType}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900">
                        {typeof blockTitle === 'string' 
                          ? blockTitle 
                          : (blockTitle && typeof blockTitle === 'object' 
                            ? (blockTitle.ru || blockTitle.en || 'Без названия')
                            : 'Без названия')}
                      </h3>
                    </div>
                    <div className="flex gap-2">
                      {index > 0 && (
                        <button
                          onClick={() => handleMoveBlock(index, 'up')}
                          className="px-2 py-1 text-gray-600 hover:text-gray-900"
                          title="Переместить вверх"
                        >
                          ↑
                        </button>
                      )}
                      {index < blocks.length - 1 && (
                        <button
                          onClick={() => handleMoveBlock(index, 'down')}
                          className="px-2 py-1 text-gray-600 hover:text-gray-900"
                          title="Переместить вниз"
                        >
                          ↓
                        </button>
                      )}
                      <button
                        onClick={() => setEditingBlockIndex(index)}
                        className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleDeleteBlock(index)}
                        className="px-3 py-1 text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
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
