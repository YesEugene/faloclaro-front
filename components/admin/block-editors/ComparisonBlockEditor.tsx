'use client';

import { useState, useEffect } from 'react';

interface ComparisonBlockEditorProps {
  block: any;
  onChange: (block: any) => void;
  lessonDay: number;
}

export default function ComparisonBlockEditor({ block, onChange, lessonDay }: ComparisonBlockEditorProps) {
  // Support both old structure (block.comparison_card) and new structure (block.content.comparison_card)
  const getContent = () => {
    if (block.content && typeof block.content === 'object') {
      return block.content;
    }
    // Old structure: convert to new structure
    return {
      comparison_card: block.comparison_card || [],
      note: block.note || { ru: '', en: '' },
    };
  };

  const content = getContent();
  const [comparisonCards, setComparisonCards] = useState<any[]>(content.comparison_card || []);
  const [showAddCard, setShowAddCard] = useState(false);
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
  const [generatingAudio, setGeneratingAudio] = useState<{ [key: number]: boolean }>({});
  const [isPlayingAudio, setIsPlayingAudio] = useState<{ [key: number]: boolean }>({});
  const [audioUrls, setAudioUrls] = useState<{ [key: number]: string | null }>({});

  const updateBlock = (updates: any) => {
    onChange({
      ...block,
      block_type: block.block_type || 'comparison',
      content: {
        ...content,
        ...updates,
        comparison_card: comparisonCards,
      },
    });
  };

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
    const index = editingCardIndex !== null && editingCardIndex < comparisonCards.length 
      ? editingCardIndex 
      : newCards.length;
    
    if (editingCardIndex !== null && editingCardIndex < comparisonCards.length) {
      // Preserve audio_url if it exists when editing
      newCards[editingCardIndex] = {
        ...card,
        audio_url: card.audio_url || comparisonCards[editingCardIndex]?.audio_url,
      };
    } else {
      newCards.push(card);
    }
    
    setComparisonCards(newCards);
    updateBlock({ comparison_card: newCards });
    
    // Update audio URL in state if it exists
    if (card.audio_url) {
      setAudioUrls(prev => ({ ...prev, [index]: card.audio_url }));
    }
    
    setShowAddCard(false);
    setEditingCardIndex(null);
  };

  const handleDeleteCard = (index: number) => {
    if (confirm('Вы уверены, что хотите удалить эту карточку?')) {
      const newCards = comparisonCards.filter((_, i) => i !== index);
      setComparisonCards(newCards);
      updateBlock({ comparison_card: newCards });
      // Clean up audio state
      setGeneratingAudio(prev => {
        const newState = { ...prev };
        delete newState[index];
        return newState;
      });
      setIsPlayingAudio(prev => {
        const newState = { ...prev };
        delete newState[index];
        return newState;
      });
      setAudioUrls(prev => {
        const newState = { ...prev };
        delete newState[index];
        return newState;
      });
    }
  };

  // Check for existing audio URLs when cards change
  useEffect(() => {
    const checkAudioUrls = async () => {
      const urls: { [key: number]: string | null } = {};
      
      for (let i = 0; i < comparisonCards.length; i++) {
        const card = comparisonCards[i];
        
        // Prioritize audio_url from card if it exists
        if (card.audio_url) {
          urls[i] = card.audio_url;
          continue;
        }
        
        // Otherwise check database
        if (card.text && card.text.trim()) {
          try {
            const response = await fetch(`/api/phrases?text=${encodeURIComponent(card.text.trim())}`);
            const data = await response.json();
            if (data.success && data.exists && data.audioUrl) {
              urls[i] = data.audioUrl;
            }
          } catch (error) {
            console.error(`Error checking audio for card ${i}:`, error);
          }
        }
      }
      
      setAudioUrls(urls);
    };
    
    if (comparisonCards.length > 0) {
      checkAudioUrls();
    }
  }, [comparisonCards]);

  const handleGenerateAudio = async (index: number) => {
    const card = comparisonCards[index];
    if (!card || !card.text || !card.text.trim()) {
      alert('Пожалуйста, сначала добавьте текст карточки');
      return;
    }

    setGeneratingAudio(prev => ({ ...prev, [index]: true }));

    try {
      const response = await fetch('/api/admin/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: card.text.trim(),
          lessonId: lessonDay.toString(),
          taskId: 2, // Rules task
          blockId: block.block_id || block.block_type || 'comparison',
          itemId: `card_${index}_${Date.now()}`,
        }),
      });

      const data = await response.json();
      if (data.success && data.audioUrl) {
        // Update card with audio_url
        const newCards = [...comparisonCards];
        newCards[index] = {
          ...newCards[index],
          audio_url: data.audioUrl,
        };
        setComparisonCards(newCards);
        setAudioUrls(prev => ({ ...prev, [index]: data.audioUrl }));
        updateBlock({ comparison_card: newCards });
      } else {
        alert('Ошибка при генерации аудио: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      alert('Ошибка при генерации аудио');
    } finally {
      setGeneratingAudio(prev => ({ ...prev, [index]: false }));
    }
  };

  const handlePlayAudio = (index: number) => {
    const card = comparisonCards[index];
    const audioUrl = audioUrls[index] || card?.audio_url;
    if (!audioUrl) return;

    setIsPlayingAudio(prev => ({ ...prev, [index]: true }));
    const audio = new Audio(audioUrl);
    audio.play().catch(err => {
      console.error('Error playing audio:', err);
      setIsPlayingAudio(prev => ({ ...prev, [index]: false }));
    });
    audio.onended = () => setIsPlayingAudio(prev => ({ ...prev, [index]: false }));
    audio.onerror = () => setIsPlayingAudio(prev => ({ ...prev, [index]: false }));
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
              value={typeof content.title === 'string' ? content.title : (content.title?.ru || '')}
              onChange={(e) => {
                updateBlock({
                  title: { ...content.title, ru: e.target.value },
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
              value={typeof content.title === 'string' ? '' : (content.title?.en || '')}
              onChange={(e) => {
                updateBlock({
                  title: { ...content.title, en: e.target.value },
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
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">{card.text || 'Без текста'}</p>
                      {(audioUrls[index] || card.audio_url) && (
                        <span className="text-sm text-blue-600">🎵 Аудио</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(audioUrls[index] || card.audio_url) && (
                      <button
                        onClick={() => handlePlayAudio(index)}
                        disabled={isPlayingAudio[index]}
                        className="px-2 py-1 text-blue-600 hover:text-blue-800 text-sm"
                        title="Воспроизвести аудио"
                      >
                        {isPlayingAudio[index] ? '⏸️' : '▶️'}
                      </button>
                    )}
                    <button
                      onClick={() => handleGenerateAudio(index)}
                      disabled={generatingAudio[index] || !card.text?.trim()}
                      className="px-3 py-1 text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Сгенерировать аудио"
                    >
                      {generatingAudio[index] ? '⏳' : '🎵 Генерировать'}
                    </button>
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
              value={typeof content.note === 'string' ? content.note : (content.note?.ru || '')}
              onChange={(e) => {
                updateBlock({
                  note: { ...content.note, ru: e.target.value },
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
              value={typeof content.note === 'string' ? '' : (content.note?.en || '')}
              onChange={(e) => {
                updateBlock({
                  note: { ...content.note, en: e.target.value },
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
              lessonDay={lessonDay}
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
function ComparisonCardEditor({ card, lessonDay, onSave, onCancel }: {
  card: any | null;
  lessonDay: number;
  onSave: (card: any) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(card?.text || '');
  const [audioUrl, setAudioUrl] = useState<string | null>(card?.audio_url || null);

  // Update audioUrl when card prop changes
  useEffect(() => {
    if (card?.audio_url) {
      setAudioUrl(card.audio_url);
    } else {
      setAudioUrl(null);
    }
  }, [card?.audio_url]);

  const handleSave = () => {
    if (!text.trim()) {
      alert('Пожалуйста, введите текст карточки');
      return;
    }

    onSave({
      text: text.trim(),
      audio: true,
      audio_url: audioUrl || card?.audio_url || undefined,
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
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={async () => {
              if (!text.trim()) {
                alert('Пожалуйста, введите текст для генерации аудио');
                return;
              }
              
              try {
                const response = await fetch('/api/admin/audio/generate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    text: text.trim(),
                    lessonId: lessonDay.toString(),
                    taskId: 2,
                    blockId: 'comparison',
                    itemId: `card_${Date.now()}`,
                  }),
                });

                const data = await response.json();
                if (data.success && data.audioUrl) {
                  setAudioUrl(data.audioUrl);
                } else {
                  alert('Ошибка при генерации аудио: ' + (data.error || 'Unknown error'));
                }
              } catch (err) {
                console.error('Error generating audio:', err);
                alert('Ошибка при генерации аудио');
              }
            }}
            className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs"
          >
            🎵 Генерировать
          </button>
          <label className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs cursor-pointer">
            📤 Загрузить
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                if (!text.trim()) {
                  alert('Пожалуйста, введите текст');
                  return;
                }

                try {
                  const uploadFormData = new FormData();
                  uploadFormData.append('file', file);
                  uploadFormData.append('lessonId', lessonDay.toString());
                  uploadFormData.append('taskId', '2');
                  uploadFormData.append('blockId', 'comparison');
                  uploadFormData.append('itemId', `card_${Date.now()}`);
                  uploadFormData.append('textPt', text.trim());

                  const response = await fetch('/api/admin/audio/upload', {
                    method: 'POST',
                    body: uploadFormData,
                  });

                  const data = await response.json();
                  if (data.success && data.audioUrl) {
                    setAudioUrl(data.audioUrl);
                  } else {
                    alert('Ошибка при загрузке аудио: ' + (data.error || 'Unknown error'));
                  }
                } catch (err) {
                  console.error('Error uploading audio:', err);
                  alert('Ошибка при загрузке аудио');
                }
              }}
            />
          </label>
        </div>
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

