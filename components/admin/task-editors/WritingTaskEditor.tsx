'use client';

import { useMemo } from 'react';

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

  // Helpers to keep admin editing (parts) + frontend rendering (string lines) compatible.
  const templatePartsToLines = (parts: any[]): string[] => {
    if (!Array.isArray(parts) || parts.length === 0) return [];
    let s = '';
    for (const part of parts) {
      if (!part || typeof part !== 'object') continue;
      if (part.type === 'text') s += String(part.text ?? '');
      else if (part.type === 'input') s += '__________';
    }
    return s
      .split('\n')
      .map(line => line.trimEnd())
      .filter(line => line.trim().length > 0);
  };

  const templateLinesToParts = (lines: any[]): any[] => {
    if (!Array.isArray(lines) || lines.length === 0) return [];
    // Represent each line as a text part; keep line breaks so parts->lines is stable.
    return lines.map((line, idx) => ({
      type: 'text',
      text: `${String(line ?? '')}${idx < lines.length - 1 ? '\n' : ''}`,
    }));
  };

  const getTemplatePartsForEditor = (): any[] => {
    const mt = content.main_task || {};
    if (Array.isArray(mt.template_parts)) return mt.template_parts;
    if (Array.isArray(mt.template) && mt.template.length > 0 && typeof mt.template[0] === 'object') return mt.template;
    if (Array.isArray(mt.template) && mt.template.length > 0 && typeof mt.template[0] === 'string') return templateLinesToParts(mt.template);
    return [];
  };

  const updateTaskMeta = (updates: any) => {
    onChange({
      ...task,
      ...updates,
      optional: task.optional !== false,
    });
  };

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

  const templateLinesString = useMemo(() => {
    const mt = content.main_task || {};
    if (Array.isArray(mt.template) && mt.template.length > 0 && typeof mt.template[0] === 'string') {
      return mt.template.join('\n');
    }
    const parts = getTemplatePartsForEditor();
    const lines = templatePartsToLines(parts);
    return lines.join('\n');
  }, [content.main_task]);

  return (
    <div className="space-y-6">
      {/* Titles */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Заголовки (видно на фронте)</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Заголовок (RU)</label>
            <input
              type="text"
              value={typeof task.title === 'string' ? task.title : (task.title?.ru || '')}
              onChange={(e) => updateTaskMeta({ title: { ...(typeof task.title === 'object' ? task.title : {}), ru: e.target.value } })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Напиши от руки или проговори вслух"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Заголовок (EN)</label>
            <input
              type="text"
              value={typeof task.title === 'string' ? '' : (task.title?.en || '')}
              onChange={(e) => updateTaskMeta({ title: { ...(typeof task.title === 'object' ? task.title : {}), en: e.target.value } })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Write by hand or say out loud"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Подзаголовок (RU)</label>
            <textarea
              value={typeof task.subtitle === 'string' ? task.subtitle : (task.subtitle?.ru || '')}
              onChange={(e) => updateTaskMeta({ subtitle: { ...(typeof task.subtitle === 'object' ? task.subtitle : {}), ru: e.target.value } })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24"
              placeholder="Теперь собери полноценное знакомство. Используй слова и фразы из этого урока."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Подзаголовок (EN)</label>
            <textarea
              value={typeof task.subtitle === 'string' ? '' : (task.subtitle?.en || '')}
              onChange={(e) => updateTaskMeta({ subtitle: { ...(typeof task.subtitle === 'object' ? task.subtitle : {}), en: e.target.value } })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24"
              placeholder="Now build a full introduction. Use the words and phrases from this lesson."
            />
          </div>
        </div>
      </div>

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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Основное задание</h2>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Текст задания (PT) — по строкам. Подчёркивания — это просто “пропуски”, без специальной логики.
        </label>
        <textarea
          value={templateLinesString}
          onChange={(e) => {
            const lines = e.target.value
              .split('\n')
              .map(l => l.trimEnd())
              .filter(l => l.trim().length > 0);
            // Keep template_parts as text-only (no parsing into inputs),
            // so admin stays simple and frontend remains compatible.
            const parts = templateLinesToParts(lines);
            updateTask({
              main_task: {
                ...(content.main_task || {}),
                format: 'template_fill_or_speak',
                template: lines,
                template_parts: parts,
              },
            });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg h-32"
          placeholder={'Olá, chamo-me ______.\n_____ em conhecer.\nE você, como__ ____?'}
        />
      </div>

      {/* Example (Show by button) */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Пример (по кнопке)</h2>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={!!content.example?.show_by_button}
              onChange={(e) => {
                updateTask({
                  example: {
                    ...(content.example || {}),
                    show_by_button: e.target.checked,
                  },
                });
              }}
            />
            Показывать пример по кнопке
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Текст кнопки (RU)</label>
            <input
              type="text"
              value={content.example?.button_text?.ru || ''}
              onChange={(e) => {
                updateTask({
                  example: {
                    ...(content.example || {}),
                    button_text: { ...(content.example?.button_text || {}), ru: e.target.value },
                  },
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Показать пример"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Текст кнопки (EN)</label>
            <input
              type="text"
              value={content.example?.button_text?.en || ''}
              onChange={(e) => {
                updateTask({
                  example: {
                    ...(content.example || {}),
                    button_text: { ...(content.example?.button_text || {}), en: e.target.value },
                  },
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Show example"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Текст примера (PT) — по строкам (1 строка = 1 предложение)
          </label>
          <textarea
            value={Array.isArray(content.example?.content) ? content.example.content.join('\n') : ''}
            onChange={(e) => {
              const lines = e.target.value.split('\n').map(l => l.trimEnd()).filter(l => l.trim().length > 0);
              updateTask({
                example: {
                  ...(content.example || {}),
                  content: lines,
                },
              });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg h-32"
            placeholder={'Olá, chamo-me Ana.\nPrazer em conhecer.\nE você, como se chama?'}
          />
        </div>
      </div>

      {/* Alternative (Speak Out Loud) */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Кнопка “Я сказал(а) вслух”</h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Подзаголовок (RU)</label>
            <textarea
              value={typeof content.alternative?.instruction === 'string' ? content.alternative?.instruction : (content.alternative?.instruction?.ru || '')}
              onChange={(e) => {
                updateTask({
                  alternative: {
                    ...(content.alternative || {}),
                    instruction: {
                      ...(typeof content.alternative?.instruction === 'object' ? content.alternative.instruction : {}),
                      ru: e.target.value,
                    },
                  },
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24"
              placeholder="Если не хочется писать, тогда просто скажи всё вслух, как цельную речь."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Подзаголовок (EN)</label>
            <textarea
              value={typeof content.alternative?.instruction === 'string' ? '' : (content.alternative?.instruction?.en || '')}
              onChange={(e) => {
                updateTask({
                  alternative: {
                    ...(content.alternative || {}),
                    instruction: {
                      ...(typeof content.alternative?.instruction === 'object' ? content.alternative.instruction : {}),
                      en: e.target.value,
                    },
                  },
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24"
              placeholder="If you don’t want to write, just say everything out loud as one coherent speech."
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Текст кнопки (RU)</label>
            <input
              type="text"
              value={content.alternative?.action_button?.text?.ru || content.alternative?.button_text?.ru || ''}
              onChange={(e) => {
                updateTask({
                  alternative: {
                    ...(content.alternative || {}),
                    button_text: { ...(content.alternative?.button_text || {}), ru: e.target.value },
                    action_button: {
                      ...(content.alternative?.action_button || {}),
                      text: { ...(content.alternative?.action_button?.text || {}), ru: e.target.value },
                    },
                  },
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Я сказал(а) вслух"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Текст кнопки (EN)</label>
            <input
              type="text"
              value={content.alternative?.action_button?.text?.en || content.alternative?.button_text?.en || ''}
              onChange={(e) => {
                updateTask({
                  alternative: {
                    ...(content.alternative || {}),
                    button_text: { ...(content.alternative?.button_text || {}), en: e.target.value },
                    action_button: {
                      ...(content.alternative?.action_button || {}),
                      text: { ...(content.alternative?.action_button?.text || {}), en: e.target.value },
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
    </div>
  );
}
