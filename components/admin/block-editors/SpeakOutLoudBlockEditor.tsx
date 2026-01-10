'use client';

import { useState } from 'react';

interface SpeakOutLoudBlockEditorProps {
  block: any;
  onChange: (block: any) => void;
  lessonDay: number;
}

export default function SpeakOutLoudBlockEditor({ block, onChange, lessonDay }: SpeakOutLoudBlockEditorProps) {
  // Support both old structure and new structure (block.content)
  const getContent = () => {
    if (block.content && typeof block.content === 'object') {
      return block.content;
    }
    // Old structure: convert to new structure
    return {
      instruction_text: block.instruction_text || { ru: '', en: '' },
      action_button: block.action_button || {
        text: { ru: '✔ Я сказал(а) вслух', en: '✔ I said it out loud' },
        completes_task: true,
      },
    };
  };

  const content = getContent();

  const updateBlock = (updates: any) => {
    onChange({
      ...block,
      block_type: block.block_type || 'speak_out_loud',
      content: {
        ...content,
        ...updates,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Instruction Text */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Инструкция</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Инструкция (RU) *
            </label>
            <textarea
              value={typeof content.instruction_text === 'string' ? content.instruction_text : (content.instruction_text?.ru || '')}
              onChange={(e) => {
                updateBlock({
                  instruction_text: { ...content.instruction_text, ru: e.target.value },
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg h-32"
              placeholder="Попробуй сказать эти фразы вслух:&#10;**Preciso de ajuda.**&#10;**Pode ajudar?**&#10;**Obrigado pela ajuda.**"
            />
            <p className="text-xs text-gray-500 mt-1">
              Используйте **текст** для выделения жирным шрифтом
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Инструкция (EN) *
            </label>
            <textarea
              value={typeof content.instruction_text === 'string' ? '' : (content.instruction_text?.en || '')}
              onChange={(e) => {
                updateBlock({
                  instruction_text: { ...content.instruction_text, en: e.target.value },
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg h-32"
              placeholder="Try to say these phrases out loud:&#10;**Preciso de ajuda.**&#10;**Pode ajudar?**&#10;**Obrigado pela ajuda.**"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use **text** for bold formatting
            </p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Кнопка действия</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Текст кнопки (RU) *
            </label>
            <input
              type="text"
              value={typeof content.action_button?.text === 'string' ? content.action_button?.text : (content.action_button?.text?.ru || '')}
              onChange={(e) => {
                updateBlock({
                  action_button: {
                    ...content.action_button,
                    text: {
                      ...(typeof content.action_button?.text === 'object' ? content.action_button.text : {}),
                      ru: e.target.value,
                    },
                    completes_task: true,
                  },
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="✔ Я сказал(а) вслух"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Текст кнопки (EN) *
            </label>
            <input
              type="text"
              value={typeof content.action_button?.text === 'string' ? '' : (content.action_button?.text?.en || '')}
              onChange={(e) => {
                updateBlock({
                  action_button: {
                    ...content.action_button,
                    text: {
                      ...(typeof content.action_button?.text === 'object' ? content.action_button.text : {}),
                      en: e.target.value,
                    },
                    completes_task: true,
                  },
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="✔ I said it out loud"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

