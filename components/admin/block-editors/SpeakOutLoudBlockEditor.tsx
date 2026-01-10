'use client';

import { useState } from 'react';

interface SpeakOutLoudBlockEditorProps {
  block: any;
  onChange: (block: any) => void;
  lessonDay: number;
}

export default function SpeakOutLoudBlockEditor({ block, onChange, lessonDay }: SpeakOutLoudBlockEditorProps) {
  return (
    <div className="space-y-6">
      {/* Block Title */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Название блока</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название (RU) *
            </label>
            <input
              type="text"
              value={typeof block.title === 'string' ? block.title : (block.title?.ru || '')}
              onChange={(e) => {
                const title = block.title || {};
                onChange({
                  ...block,
                  title: { ...title, ru: e.target.value },
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Скажи вслух"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название (EN) *
            </label>
            <input
              type="text"
              value={typeof block.title === 'string' ? '' : (block.title?.en || '')}
              onChange={(e) => {
                const title = block.title || {};
                onChange({
                  ...block,
                  title: { ...title, en: e.target.value },
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Speak out loud"
            />
          </div>
        </div>
      </div>

      {/* Instruction Text */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Инструкция</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Инструкция (RU) *
            </label>
            <textarea
              value={typeof block.instruction_text === 'string' ? block.instruction_text : (block.instruction_text?.ru || '')}
              onChange={(e) => {
                const instruction_text = block.instruction_text || {};
                onChange({
                  ...block,
                  instruction_text: { ...instruction_text, ru: e.target.value },
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
              value={typeof block.instruction_text === 'string' ? '' : (block.instruction_text?.en || '')}
              onChange={(e) => {
                const instruction_text = block.instruction_text || {};
                onChange({
                  ...block,
                  instruction_text: { ...instruction_text, en: e.target.value },
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
              value={typeof block.action_button?.text === 'string' ? block.action_button?.text : (block.action_button?.text?.ru || '')}
              onChange={(e) => {
                const action_button = block.action_button || {};
                onChange({
                  ...block,
                  action_button: {
                    ...action_button,
                    text: {
                      ...(typeof action_button.text === 'object' ? action_button.text : {}),
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
              value={typeof block.action_button?.text === 'string' ? '' : (block.action_button?.text?.en || '')}
              onChange={(e) => {
                const action_button = block.action_button || {};
                onChange({
                  ...block,
                  action_button: {
                    ...action_button,
                    text: {
                      ...(typeof action_button.text === 'object' ? action_button.text : {}),
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

