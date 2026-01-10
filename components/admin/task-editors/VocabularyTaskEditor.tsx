'use client';

import { useState } from 'react';

interface VocabularyTaskEditorProps {
  task: any;
  onChange: (task: any) => void;
  lessonDay: number;
}

export default function VocabularyTaskEditor({ task, onChange, lessonDay }: VocabularyTaskEditorProps) {
  const [cards, setCards] = useState<any[]>(task.content?.cards || []);
  const [showAddCard, setShowAddCard] = useState(false);
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);

  // Update task when cards change
  const updateTask = (newCards: any[]) => {
    setCards(newCards);
    onChange({
      ...task,
      content: {
        ...task.content,
        cards: newCards,
      },
    });
  };

  const handleAddCard = () => {
    setEditingCardIndex(cards.length);
    setShowAddCard(true);
  };

  const handleEditCard = (index: number) => {
    setEditingCardIndex(index);
    setShowAddCard(true);
  };

  const handleSaveCard = (card: any) => {
    const newCards = [...cards];
    if (editingCardIndex !== null && editingCardIndex < cards.length) {
      newCards[editingCardIndex] = card;
    } else {
      newCards.push(card);
    }
    updateTask(newCards);
    setShowAddCard(false);
    setEditingCardIndex(null);
  };

  const handleDeleteCard = (index: number) => {
    if (confirm('Вы уверены, что хотите удалить это слово?')) {
      const newCards = cards.filter((_, i) => i !== index);
      updateTask(newCards);
    }
  };

  const handleMoveCard = (index: number, direction: 'up' | 'down') => {
    const newCards = [...cards];
    if (direction === 'up' && index > 0) {
      [newCards[index - 1], newCards[index]] = [newCards[index], newCards[index - 1]];
    } else if (direction === 'down' && index < newCards.length - 1) {
      [newCards[index], newCards[index + 1]] = [newCards[index + 1], newCards[index]];
    }
    updateTask(newCards);
  };

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
              placeholder="Слова и фразы"
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
              placeholder="Words and phrases"
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
              placeholder="≈10"
            />
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={task.ui?.show_timer !== false}
                onChange={(e) => {
                  const ui = task.ui || {};
                  onChange({
                    ...task,
                    ui: { ...ui, show_timer: e.target.checked },
                  });
                }}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Показать таймер</span>
            </label>
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={task.ui?.show_audio_settings !== false}
                onChange={(e) => {
                  const ui = task.ui || {};
                  onChange({
                    ...task,
                    ui: { ...ui, show_audio_settings: e.target.checked },
                  });
                }}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Показать настройки аудио</span>
            </label>
          </div>
        </div>
      </div>

      {/* Vocabulary Cards */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Слова ({cards.length})</h2>
          <button
            onClick={handleAddCard}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Добавить слово
          </button>
        </div>

        {cards.length === 0 ? (
          <p className="text-gray-600 text-center py-8">
            Слова еще не добавлены. Нажмите "Добавить слово", чтобы начать.
          </p>
        ) : (
          <div className="space-y-3">
            {cards.map((card, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                      <span className="font-semibold text-gray-900">{card.word || 'Без слова'}</span>
                    </div>
                    {card.transcription && (
                      <p className="text-sm text-gray-600 mb-1">[{card.transcription}]</p>
                    )}
                    {card.word_translation_ru && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">RU:</span> {card.word_translation_ru}
                      </p>
                    )}
                    {card.word_translation_en && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">EN:</span> {card.word_translation_en}
                      </p>
                    )}
                    {card.example_sentence && (
                      <p className="text-sm text-gray-600 mt-2 italic">"{card.example_sentence}"</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {index > 0 && (
                      <button
                        onClick={() => handleMoveCard(index, 'up')}
                        className="px-2 py-1 text-gray-600 hover:text-gray-900"
                        title="Переместить вверх"
                      >
                        ↑
                      </button>
                    )}
                    {index < cards.length - 1 && (
                      <button
                        onClick={() => handleMoveCard(index, 'down')}
                        className="px-2 py-1 text-gray-600 hover:text-gray-900"
                        title="Переместить вниз"
                      >
                        ↓
                      </button>
                    )}
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

      {/* Card Editor Modal */}
      {showAddCard && (
        <CardEditorModal
          card={editingCardIndex !== null && editingCardIndex < cards.length ? cards[editingCardIndex] : null}
          lessonDay={lessonDay}
          onSave={handleSaveCard}
          onCancel={() => {
            setShowAddCard(false);
            setEditingCardIndex(null);
          }}
        />
      )}
    </div>
  );
}

// Card Editor Modal Component
function CardEditorModal({ card, lessonDay, onSave, onCancel }: {
  card: any | null;
  lessonDay: number;
  onSave: (card: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    word: card?.word || '',
    transcription: card?.transcription || '',
    example_sentence: card?.example_sentence || '',
    sentence_translation_ru: card?.sentence_translation_ru || '',
    sentence_translation_en: card?.sentence_translation_en || '',
    word_translation_ru: card?.word_translation_ru || '',
    word_translation_en: card?.word_translation_en || '',
    audioFile: null as File | null,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, audioFile: e.target.files[0] });
    }
  };

  const handleSave = async () => {
    // Validate required fields
    if (!formData.word.trim()) {
      alert('Пожалуйста, введите португальское слово');
      return;
    }

    const cardData: any = {
      word: formData.word.trim(),
      transcription: formData.transcription.trim() || undefined,
      example_sentence: formData.example_sentence.trim() || undefined,
      sentence_translation_ru: formData.sentence_translation_ru.trim() || undefined,
      sentence_translation_en: formData.sentence_translation_en.trim() || undefined,
      word_translation_ru: formData.word_translation_ru.trim() || undefined,
      word_translation_en: formData.word_translation_en.trim() || undefined,
    };

    // If audio file is uploaded, we'll need to handle upload separately
    // For now, we'll just save the card data
    // Audio upload will be handled when saving the task

    onSave(cardData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">
              {card ? 'Редактировать слово' : 'Добавить слово'}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Португальское слово *
            </label>
            <input
              type="text"
              value={formData.word}
              onChange={(e) => setFormData({ ...formData, word: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Preciso"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Транскрипция (IPA)
            </label>
            <input
              type="text"
              value={formData.transcription}
              onChange={(e) => setFormData({ ...formData, transcription: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="[pɾɨˈsizu]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Пример предложения (PT)
            </label>
            <input
              type="text"
              value={formData.example_sentence}
              onChange={(e) => setFormData({ ...formData, example_sentence: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Preciso de ajuda."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Перевод предложения (RU)
              </label>
              <input
                type="text"
                value={formData.sentence_translation_ru}
                onChange={(e) => setFormData({ ...formData, sentence_translation_ru: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Мне нужна помощь."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Перевод предложения (EN)
              </label>
              <input
                type="text"
                value={formData.sentence_translation_en}
                onChange={(e) => setFormData({ ...formData, sentence_translation_en: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="I need help."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Перевод слова (RU)
              </label>
              <input
                type="text"
                value={formData.word_translation_ru}
                onChange={(e) => setFormData({ ...formData, word_translation_ru: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="нужно / мне нужно"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Перевод слова (EN)
              </label>
              <input
                type="text"
                value={formData.word_translation_en}
                onChange={(e) => setFormData({ ...formData, word_translation_en: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="need / I need"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Аудиофайл (будет сгенерирован автоматически)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Аудио будет сгенерировано автоматически при сохранении задания через скрипт generate-audio.
              Если нужно загрузить свой файл, используйте скрипт upload-audio.
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
      </div>
    </div>
  );
}

