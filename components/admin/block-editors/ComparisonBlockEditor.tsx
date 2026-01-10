'use client';

import { useState } from 'react';

interface ComparisonBlockEditorProps {
  block: any;
  onChange: (block: any) => void;
  lessonDay: number;
}

export default function ComparisonBlockEditor({ block, onChange, lessonDay }: ComparisonBlockEditorProps) {
  const [comparisonCards, setComparisonCards] = useState<any[]>(block.comparison_card || []);
  const [showAddCard, setShowAddCard] = useState(false);
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);

  const handleAddCard = () => {
    setEditingCardIndex(comparisonCards.length);
    setShowAddCard(true);
  };

  const handleEditCard = (index: number) => {
    setEditingCardIndex(index);
    setShowAddCard(true);
  };

  const handleSaveCard = (card: any) => {
    const newCards = [...comparisonCards];
    if (editingCardIndex !== null && editingCardIndex < comparisonCards.length) {
      newCards[editingCardIndex] = card;
    } else {
      newCards.push(card);
    }
    setComparisonCards(newCards);
    onChange({
      ...block,
      comparison_card: newCards,
    });
    setShowAddCard(false);
    setEditingCardIndex(null);
  };

  const handleDeleteCard = (index: number) => {
    if (confirm('Вы уверены, что хотите удалить эту карточку?')) {
      const newCards = comparisonCards.filter((_, i) => i !== index);
      setComparisonCards(newCards);
      onChange({
        ...block,
        comparison_card: newCards,
      });
    }
  };

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
              placeholder="Как поблагодарить"
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
              placeholder="How to thank"
            />
          </div>
        </div>
      </div>

      {/* Comparison Cards */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Карточки для сравнения ({comparisonCards.length})</h2>
          <button
            onClick={handleAddCard}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Добавить карточку
          </button>
        </div>

        {comparisonCards.length === 0 ? (
          <p className="text-gray-600 text-center py-4">Карточки еще не добавлены</p>
        ) : (
          <div className="space-y-3">
            {comparisonCards.map((card, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{card.text || 'Без текста'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditCard(index)}
                      className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDeleteCard(index)}
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

      {/* Note */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Примечание</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Примечание (RU)
            </label>
            <textarea
              value={typeof block.note === 'string' ? block.note : (block.note?.ru || '')}
              onChange={(e) => {
                const note = block.note || {};
                onChange({
                  ...block,
                  note: { ...note, ru: e.target.value },
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24"
              placeholder="Obrigado — спасибо (говорит мужчина)&#10;Obrigada — спасибо (говорит женщина)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Примечание (EN)
            </label>
            <textarea
              value={typeof block.note === 'string' ? '' : (block.note?.en || '')}
              onChange={(e) => {
                const note = block.note || {};
                onChange({
                  ...block,
                  note: { ...note, en: e.target.value },
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24"
              placeholder="Obrigado — thank you (said by a man)&#10;Obrigada — thank you (said by a woman)"
            />
          </div>
        </div>
      </div>

      {/* Card Editor Modal */}
      {showAddCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingCardIndex !== null && editingCardIndex < comparisonCards.length ? 'Редактировать карточку' : 'Добавить карточку'}
                </h2>
                <button onClick={() => { setShowAddCard(false); setEditingCardIndex(null); }} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>
            <ComparisonCardEditor
              card={editingCardIndex !== null && editingCardIndex < comparisonCards.length ? comparisonCards[editingCardIndex] : null}
              onSave={handleSaveCard}
              onCancel={() => { setShowAddCard(false); setEditingCardIndex(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Comparison Card Editor Component
function ComparisonCardEditor({ card, onSave, onCancel }: {
  card: any | null;
  onSave: (card: any) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(card?.text || '');

  const handleSave = () => {
    if (!text.trim()) {
      alert('Пожалуйста, введите текст карточки');
      return;
    }

    onSave({
      text: text.trim(),
      audio: true,
    });
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Текст карточки (PT) *
        </label>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          placeholder="Obrigado pela ajuda."
        />
        <p className="text-xs text-gray-500 mt-1">
          Аудио будет сгенерировано автоматически при сохранении задания
        </p>
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
  );
}

