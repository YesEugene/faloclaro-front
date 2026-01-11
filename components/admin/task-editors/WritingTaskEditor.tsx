'use client';

import { useState } from 'react';

interface WritingTaskEditorProps {
  task: any;
  onChange: (task: any) => void;
  lessonDay: number;
}

export default function WritingTaskEditor({ task, onChange, lessonDay }: WritingTaskEditorProps) {
  // Support both old structure and new structure (task.blocks[].content)
  const getContent = () => {
    if (task.blocks && Array.isArray(task.blocks)) {
      // New structure: find write_by_hand block
      const writeBlock = task.blocks.find((b: any) => b.block_type === 'write_by_hand');
      return writeBlock?.content || {};
    }
    // Old structure: task properties
    return {
      instruction: task.instruction || { ru: '', en: '' },
      main_task: task.main_task || { format: 'template_fill_or_speak', template: [] },
      example: task.example || {},
      alternative: task.alternative || {},
      reflection: task.reflection || {},
    };
  };

  const content = getContent();
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);

  const updateTask = (updates: any) => {
    if (task.blocks && Array.isArray(task.blocks)) {
      // New structure: update write_by_hand block
      const updatedBlocks = task.blocks.map((block: any) => {
        if (block.block_type === 'write_by_hand') {
          return {
            ...block,
            content: {
              ...content,
              ...updates,
            },
          };
        }
        return block;
      });

      // If no write_by_hand block exists, create one
      if (!updatedBlocks.some((b: any) => b.block_type === 'write_by_hand')) {
        updatedBlocks.push({
          block_id: 'block_1',
          block_type: 'write_by_hand',
          content: {
            ...content,
            ...updates,
          },
        });
      }

      onChange({
        ...task,
        blocks: updatedBlocks,
        optional: task.optional !== false,
      });
    } else {
      // Old structure: update task properties
      onChange({
        ...task,
        ...updates,
        optional: task.optional !== false,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Instruction */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Инструкция</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Инструкция (RU)
            </label>
            <textarea
              value={typeof content.instruction === 'string' ? content.instruction : (content.instruction?.ru || '')}
              onChange={(e) => {
                updateTask({
                  instruction: { ...content.instruction, ru: e.target.value },
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg h-32"
              placeholder="Напиши о себе, используя шаблон..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Инструкция (EN)
            </label>
            <textarea
              value={typeof content.instruction === 'string' ? '' : (content.instruction?.en || '')}
              onChange={(e) => {
                updateTask({
                  instruction: { ...content.instruction, en: e.target.value },
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg h-32"
              placeholder="Write about yourself using the template..."
            />
          </div>
        </div>
      </div>

      {/* Main Task */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Основное задание</h2>
          <button
            onClick={() => setShowTemplateEditor(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Редактировать шаблон
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Формат
          </label>
          <select
            value={content.main_task?.format || 'template_fill_or_speak'}
            onChange={(e) => {
              updateTask({
                main_task: {
                  ...content.main_task,
                  format: e.target.value,
                },
              });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="template_fill_or_speak">Шаблон для заполнения или произнесения</option>
            <option value="free_text">Свободный текст</option>
          </select>
        </div>
        {content.main_task?.template && Array.isArray(content.main_task.template) && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Шаблон ({content.main_task.template.length} частей):</p>
            <div className="space-y-2">
              {content.main_task.template.map((part: any, index: number) => (
                <div key={index} className="p-2 bg-gray-50 rounded border border-gray-200">
                  <span className="text-sm text-gray-700">
                    {part.type === 'text' ? part.text : `[${part.type}]`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Alternative (Speak Out Loud) */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Альтернатива (Скажи вслух)</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Текст кнопки (RU)
            </label>
            <input
              type="text"
              value={typeof content.alternative?.button_text === 'string' 
                ? content.alternative?.button_text 
                : (content.alternative?.button_text?.ru || '')}
              onChange={(e) => {
                updateTask({
                  alternative: {
                    ...content.alternative,
                    button_text: {
                      ...(typeof content.alternative?.button_text === 'object' ? content.alternative.button_text : {}),
                      ru: e.target.value,
                    },
                  },
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Я сказал(а) вслух"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Текст кнопки (EN)
            </label>
            <input
              type="text"
              value={typeof content.alternative?.button_text === 'string' 
                ? '' 
                : (content.alternative?.button_text?.en || '')}
              onChange={(e) => {
                updateTask({
                  alternative: {
                    ...content.alternative,
                    button_text: {
                      ...(typeof content.alternative?.button_text === 'object' ? content.alternative.button_text : {}),
                      en: e.target.value,
                    },
                  },
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="I said it out loud"
            />
          </div>
        </div>
      </div>

      {/* Template Editor Modal */}
      {showTemplateEditor && (
        <TemplateEditorModal
          template={content.main_task?.template || []}
          onSave={(template) => {
            updateTask({
              main_task: {
                ...content.main_task,
                template,
              },
            });
            setShowTemplateEditor(false);
          }}
          onCancel={() => setShowTemplateEditor(false)}
        />
      )}
    </div>
  );
}

// Template Editor Modal
function TemplateEditorModal({ template, onSave, onCancel }: {
  template: any[];
  onSave: (template: any[]) => void;
  onCancel: () => void;
}) {
  const [parts, setParts] = useState<any[]>(template);
  const [showAddPart, setShowAddPart] = useState(false);
  const [editingPartIndex, setEditingPartIndex] = useState<number | null>(null);

  const handleAddPart = (type: 'text' | 'input') => {
    const newPart = type === 'text' 
      ? { type: 'text', text: '' }
      : { type: 'input', placeholder: '' };
    const newParts = [...parts, newPart];
    setParts(newParts);
    setEditingPartIndex(newParts.length - 1);
    setShowAddPart(false);
  };

  const handleEditPart = (index: number) => {
    setEditingPartIndex(index);
  };

  const handleSavePart = (index: number, part: any) => {
    const newParts = [...parts];
    newParts[index] = part;
    setParts(newParts);
    setEditingPartIndex(null);
  };

  const handleDeletePart = (index: number) => {
    if (confirm('Вы уверены, что хотите удалить эту часть шаблона?')) {
      const newParts = parts.filter((_, i) => i !== index);
      setParts(newParts);
    }
  };

  const handleMovePart = (index: number, direction: 'up' | 'down') => {
    const newParts = [...parts];
    if (direction === 'up' && index > 0) {
      [newParts[index - 1], newParts[index]] = [newParts[index], newParts[index - 1]];
    } else if (direction === 'down' && index < newParts.length - 1) {
      [newParts[index], newParts[index + 1]] = [newParts[index + 1], newParts[index]];
    }
    setParts(newParts);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Редактирование шаблона</h2>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowAddPart(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Добавить часть
            </button>
          </div>

          {parts.length === 0 ? (
            <p className="text-gray-600 text-center py-8">Части шаблона еще не добавлены</p>
          ) : (
            <div className="space-y-3">
              {parts.map((part, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  {editingPartIndex === index ? (
                    <div className="space-y-3">
                      {part.type === 'text' ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Текст
                          </label>
                          <input
                            type="text"
                            value={part.text || ''}
                            onChange={(e) => {
                              const newParts = [...parts];
                              newParts[index] = { ...part, text: e.target.value };
                              setParts(newParts);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="Olá, chamo-me"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Плейсхолдер для ввода
                          </label>
                          <input
                            type="text"
                            value={part.placeholder || ''}
                            onChange={(e) => {
                              const newParts = [...parts];
                              newParts[index] = { ...part, placeholder: e.target.value };
                              setParts(newParts);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="[ваше имя]"
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingPartIndex(null)}
                          className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                        >
                          Готово
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                            {part.type === 'text' ? 'Текст' : 'Поле ввода'}
                          </span>
                          <span className="font-medium text-gray-900">
                            {part.type === 'text' ? part.text : `[${part.placeholder || 'ввод'}]`}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {index > 0 && (
                          <button
                            onClick={() => handleMovePart(index, 'up')}
                            className="px-2 py-1 text-gray-600 hover:text-gray-900"
                            title="Переместить вверх"
                          >
                            ↑
                          </button>
                        )}
                        {index < parts.length - 1 && (
                          <button
                            onClick={() => handleMovePart(index, 'down')}
                            className="px-2 py-1 text-gray-600 hover:text-gray-900"
                            title="Переместить вниз"
                          >
                            ↓
                          </button>
                        )}
                        <button
                          onClick={() => handleEditPart(index)}
                          className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleDeletePart(index)}
                          className="px-3 py-1 text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={() => onSave(parts)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Сохранить шаблон
          </button>
        </div>

        {/* Add Part Modal */}
        {showAddPart && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">Добавить часть шаблона</h2>
                  <button onClick={() => setShowAddPart(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
              </div>
              <div className="p-6 space-y-3">
                <button
                  onClick={() => handleAddPart('text')}
                  className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                >
                  <div className="font-semibold text-gray-900 mb-1">Текст</div>
                  <div className="text-sm text-gray-600">Статический текст в шаблоне</div>
                </button>
                <button
                  onClick={() => handleAddPart('input')}
                  className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                >
                  <div className="font-semibold text-gray-900 mb-1">Поле ввода</div>
                  <div className="text-sm text-gray-600">Место для ввода пользователем</div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
