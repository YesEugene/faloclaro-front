'use client';

import { useState } from 'react';

interface RulesTaskEditorProps {
  task: any;
  onChange: (task: any) => void;
  lessonDay: number;
}

export default function RulesTaskEditor({ task, onChange, lessonDay }: RulesTaskEditorProps) {
  const [blocks, setBlocks] = useState<any>(task.blocks || {});
  const [blocksOrder, setBlocksOrder] = useState<string[]>(task.structure?.blocks_order || []);
  const [showBlockTemplates, setShowBlockTemplates] = useState(false);
  const [editingBlockKey, setEditingBlockKey] = useState<string | null>(null);

  const updateTask = (newBlocks: any, newBlocksOrder: string[]) => {
    setBlocks(newBlocks);
    setBlocksOrder(newBlocksOrder);
    onChange({
      ...task,
      blocks: newBlocks,
      structure: {
        ...task.structure,
        blocks_order: newBlocksOrder,
      },
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
    const blockKey = `block_${blocksOrder.length + 1}_${templateType}`;
    const newBlock: any = {
      type: templateType,
      title: { ru: '', en: '' },
    };

    if (templateType === 'explanation') {
      newBlock.explanation_text = { ru: '', en: '' };
      newBlock.examples = [];
      newBlock.hint = [];
    } else if (templateType === 'comparison') {
      newBlock.comparison_card = [];
      newBlock.note = { ru: '', en: '' };
    } else if (templateType === 'reinforcement') {
      newBlock.task_1 = null;
      newBlock.task_2 = null;
    } else if (templateType === 'speak_out_loud') {
      newBlock.instruction_text = { ru: '', en: '' };
      newBlock.action_button = {
        text: { ru: '✔ Я сказал(а) вслух', en: '✔ I said it out loud' },
        completes_task: true,
      };
    }

    const newBlocks = { ...blocks, [blockKey]: newBlock };
    const newBlocksOrder = [...blocksOrder, blockKey];
    updateTask(newBlocks, newBlocksOrder);
    setEditingBlockKey(blockKey);
    setShowBlockTemplates(false);
  };

  const handleDeleteBlock = (blockKey: string) => {
    if (confirm('Вы уверены, что хотите удалить этот блок?')) {
      const newBlocks = { ...blocks };
      delete newBlocks[blockKey];
      const newBlocksOrder = blocksOrder.filter(key => key !== blockKey);
      updateTask(newBlocks, newBlocksOrder);
    }
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const newBlocksOrder = [...blocksOrder];
    if (direction === 'up' && index > 0) {
      [newBlocksOrder[index - 1], newBlocksOrder[index]] = [newBlocksOrder[index], newBlocksOrder[index - 1]];
    } else if (direction === 'down' && index < newBlocksOrder.length - 1) {
      [newBlocksOrder[index], newBlocksOrder[index + 1]] = [newBlocksOrder[index + 1], newBlocksOrder[index]];
    }
    setBlocksOrder(newBlocksOrder);
    updateTask(blocks, newBlocksOrder);
  };

  const handleSaveBlock = (blockKey: string, block: any) => {
    const newBlocks = { ...blocks, [blockKey]: block };
    updateTask(newBlocks, blocksOrder);
    setEditingBlockKey(null);
  };

  if (editingBlockKey && blocks[editingBlockKey]) {
    return (
      <BlockEditor
        blockKey={editingBlockKey}
        block={blocks[editingBlockKey]}
        lessonDay={lessonDay}
        onSave={(block) => handleSaveBlock(editingBlockKey, block)}
        onCancel={() => setEditingBlockKey(null)}
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
          <h2 className="text-lg font-semibold text-gray-900">Блоки ({blocksOrder.length})</h2>
          <button
            onClick={() => setShowBlockTemplates(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Добавить блок
          </button>
        </div>

        {blocksOrder.length === 0 ? (
          <p className="text-gray-600 text-center py-8">
            Блоки еще не добавлены. Нажмите "Добавить блок", чтобы начать.
          </p>
        ) : (
          <div className="space-y-3">
            {blocksOrder.map((blockKey, index) => {
              const block = blocks[blockKey];
              if (!block) return null;

              return (
                <div
                  key={blockKey}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-medium text-gray-500">
                          Блок {index + 1} / {blocksOrder.length}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                          {block.type}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900">
                        {typeof block.title === 'string' 
                          ? block.title 
                          : block.title?.ru || block.title?.en || 'Без названия'}
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
                      {index < blocksOrder.length - 1 && (
                        <button
                          onClick={() => handleMoveBlock(index, 'down')}
                          className="px-2 py-1 text-gray-600 hover:text-gray-900"
                          title="Переместить вниз"
                        >
                          ↓
                        </button>
                      )}
                      <button
                        onClick={() => setEditingBlockKey(blockKey)}
                        className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleDeleteBlock(blockKey)}
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

// Block Editor Component (placeholder - will be implemented)
function BlockEditor({ blockKey, block, lessonDay, onSave, onCancel }: {
  blockKey: string;
  block: any;
  lessonDay: number;
  onSave: (block: any) => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Редактирование блока: {blockKey} ({block.type})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => onSave(block)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Сохранить
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
        <p className="text-gray-600">
          Редактор блока типа "{block.type}" будет реализован в следующем шаге.
        </p>
      </div>
    </div>
  );
}

