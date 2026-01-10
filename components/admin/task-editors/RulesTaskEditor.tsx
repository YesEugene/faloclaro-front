'use client';

import { useState } from 'react';
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
      return task.blocks;
    } else if (task.blocks && typeof task.blocks === 'object') {
      // Old structure: blocks is an object, convert to array
      const blocksOrder = task.structure?.blocks_order || Object.keys(task.blocks);
      return blocksOrder.map((blockId: string) => ({
        block_id: blockId,
        block_type: task.blocks[blockId]?.type || task.blocks[blockId]?.block_type || 'how_to_say',
        content: task.blocks[blockId]?.content || task.blocks[blockId],
      }));
    }
    return [];
  };

  const [blocks, setBlocks] = useState<any[]>(getBlocksArray());
  const [showBlockTemplates, setShowBlockTemplates] = useState(false);
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null);

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
    setEditingBlockIndex(newBlocks.length - 1);
    setShowBlockTemplates(false);
  };

  const handleDeleteBlock = (index: number) => {
    if (confirm('Вы уверены, что хотите удалить этот блок?')) {
      const newBlocks = blocks.filter((_, i) => i !== index);
      updateTask(newBlocks);
    }
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const newBlocks = [...blocks];
    if (direction === 'up' && index > 0) {
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
    } else if (direction === 'down' && index < newBlocks.length - 1) {
      [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
    }
    updateTask(newBlocks);
  };

  const handleSaveBlock = (index: number, block: any) => {
    const newBlocks = [...blocks];
    newBlocks[index] = block;
    updateTask(newBlocks);
    setEditingBlockIndex(null);
  };

  if (editingBlockIndex !== null && blocks[editingBlockIndex]) {
    return (
      <BlockEditor
        blockKey={blocks[editingBlockIndex].block_id}
        block={blocks[editingBlockIndex]}
        lessonDay={lessonDay}
        onSave={(block) => handleSaveBlock(editingBlockIndex, block)}
        onCancel={() => setEditingBlockIndex(null)}
      />
    );
  }

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
              placeholder="Как это сказать"
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
              placeholder="How to say it"
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
              placeholder="≈5"
            />
          </div>
        </div>
      </div>

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
          <div className="space-y-3">
            {blocks.map((block, index) => {
              if (!block) return null;
              const blockTitle = block.content?.title || block.title || {};

              return (
                <div
                  key={block.block_id || index}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-medium text-gray-500">
                          Блок {index + 1} / {blocks.length}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                          {block.block_type || block.type}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900">
                        {typeof blockTitle === 'string' 
                          ? blockTitle 
                          : blockTitle?.ru || blockTitle?.en || 'Без названия'}
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