'use client';

import { useState, useEffect } from 'react';

interface ExplanationBlockEditorProps {
  block: any;
  onChange: (block: any) => void;
  lessonDay: number;
}

export default function ExplanationBlockEditor({ block, onChange, lessonDay }: ExplanationBlockEditorProps) {
  // Support both old structure (block.examples) and new structure (block.content.examples)
  const getContent = () => {
    if (block.content && typeof block.content === 'object') {
      return block.content;
    }
    // Old structure: convert to new structure
    return {
      title: block.title || { ru: '', en: '' },
      explanation_text: block.explanation_text || { ru: '', en: '' },
      examples: block.examples || [],
      hint: block.hint || [],
    };
  };

  const content = getContent();
  const [examples, setExamples] = useState<any[]>(content.examples || []);
  const [hints, setHints] = useState<any[]>(content.hint || []);
  const [showAddExample, setShowAddExample] = useState(false);
  const [showAddHint, setShowAddHint] = useState(false);
  const [editingExampleIndex, setEditingExampleIndex] = useState<number | null>(null);
  const [editingHintIndex, setEditingHintIndex] = useState<number | null>(null);
  const [generatingAudio, setGeneratingAudio] = useState<{ [key: number]: boolean }>({});
  const [audioUrls, setAudioUrls] = useState<{ [key: number]: string | null }>({});
  const [isPlayingAudio, setIsPlayingAudio] = useState<{ [key: number]: boolean }>({});

  const updateBlock = (updates: any) => {
    onChange({
      ...block,
      block_type: block.block_type || 'how_to_say',
      content: {
        ...content,
        ...updates,
        examples,
        hint: hints,
      },
    });
  };

  const handleAddExample = () => {
    setEditingExampleIndex(examples.length);
    setShowAddExample(true);
  };

  const handleEditExample = (index: number) => {
    setEditingExampleIndex(index);
    setShowAddExample(true);
  };

  const handleSaveExample = (example: any) => {
    const newExamples = [...examples];
    const index = editingExampleIndex !== null && editingExampleIndex < examples.length 
      ? editingExampleIndex 
      : newExamples.length;
    
    if (editingExampleIndex !== null && editingExampleIndex < examples.length) {
      // Preserve audio_url if it exists when editing
      newExamples[editingExampleIndex] = {
        ...example,
        audio_url: example.audio_url || examples[editingExampleIndex]?.audio_url,
      };
    } else {
      newExamples.push(example);
    }
    
    setExamples(newExamples);
    updateBlock({ examples: newExamples });
    
    // Update audio URL in state if it exists
    if (example.audio_url) {
      setAudioUrls(prev => ({ ...prev, [index]: example.audio_url }));
    }
    
    setShowAddExample(false);
    setEditingExampleIndex(null);
  };

  const handleDeleteExample = (index: number) => {
    if (confirm('Вы уверены, что хотите удалить этот пример?')) {
      const newExamples = examples.filter((_, i) => i !== index);
      setExamples(newExamples);
      updateBlock({ examples: newExamples });
      // Clean up audio state
      const newAudioUrls = { ...audioUrls };
      delete newAudioUrls[index];
      setAudioUrls(newAudioUrls);
    }
  };

  // Check for existing audio URLs when examples change
  useEffect(() => {
    const checkAudioUrls = async () => {
      const urls: { [key: number]: string | null } = {};
      
      for (let i = 0; i < examples.length; i++) {
        const example = examples[i];
        
        // Prioritize audio_url from example if it exists
        if (example.audio_url) {
          urls[i] = example.audio_url;
          continue;
        }
        
        // Otherwise check database
        if (example.text && example.text.trim()) {
          try {
            const response = await fetch(`/api/phrases?text=${encodeURIComponent(example.text.trim())}`);
            const data = await response.json();
            if (data.success && data.exists && data.audioUrl) {
              urls[i] = data.audioUrl;
            }
          } catch (error) {
            console.error(`Error checking audio for example ${i}:`, error);
          }
        }
      }
      
      setAudioUrls(urls);
    };
    
    if (examples.length > 0) {
      checkAudioUrls();
    }
  }, [examples]);

  const handleGenerateAudio = async (index: number) => {
    const example = examples[index];
    if (!example || !example.text || !example.text.trim()) {
      alert('Пожалуйста, сначала добавьте текст примера');
      return;
    }

    setGeneratingAudio(prev => ({ ...prev, [index]: true }));

    try {
      const response = await fetch('/api/admin/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: example.text.trim(),
          lessonId: lessonDay.toString(),
          taskId: 2, // Rules task
          blockId: block.block_id || block.block_type || 'explanation',
          itemId: `example_${index}_${Date.now()}`,
        }),
      });

      const data = await response.json();
      if (data.success && data.audioUrl) {
        // Update example with audio_url
        const newExamples = [...examples];
        newExamples[index] = {
          ...newExamples[index],
          audio_url: data.audioUrl,
        };
        setExamples(newExamples);
        setAudioUrls(prev => ({ ...prev, [index]: data.audioUrl }));
        updateBlock({ examples: newExamples });
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
    const audioUrl = audioUrls[index] || examples[index]?.audio_url;
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

  const handleAddHint = () => {
    setEditingHintIndex(hints.length);
    setShowAddHint(true);
  };

  const handleEditHint = (index: number) => {
    setEditingHintIndex(index);
    setShowAddHint(true);
  };

  const handleSaveHint = (hint: any) => {
    const newHints = [...hints];
    if (editingHintIndex !== null && editingHintIndex < hints.length) {
      newHints[editingHintIndex] = hint;
    } else {
      newHints.push(hint);
    }
    setHints(newHints);
    updateBlock({ hint: newHints });
    setShowAddHint(false);
    setEditingHintIndex(null);
  };

  const handleDeleteHint = (index: number) => {
    if (confirm('Вы уверены, что хотите удалить эту подсказку?')) {
      const newHints = hints.filter((_, i) => i !== index);
      setHints(newHints);
      updateBlock({ hint: newHints });
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
              value={typeof content.title === 'string' ? content.title : (content.title?.ru || '')}
              onChange={(e) => {
                updateBlock({
                  title: { ...content.title, ru: e.target.value },
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Как попросить о помощи"
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
              placeholder="How to ask for help"
            />
          </div>
        </div>
      </div>

      {/* Explanation Text */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Текст объяснения</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Текст (RU) *
            </label>
            <textarea
              value={typeof content.explanation_text === 'string' ? content.explanation_text : (content.explanation_text?.ru || '')}
              onChange={(e) => {
                updateBlock({
                  explanation_text: { ...content.explanation_text, ru: e.target.value },
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg h-32"
              placeholder="Чтобы попросить о помощи, используй:&#10;Preciso de ajuda — мне нужна помощь&#10;Pode ajudar? — можешь помочь?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Текст (EN) *
            </label>
            <textarea
              value={typeof content.explanation_text === 'string' ? '' : (content.explanation_text?.en || '')}
              onChange={(e) => {
                updateBlock({
                  explanation_text: { ...content.explanation_text, en: e.target.value },
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg h-32"
              placeholder="To ask for help, use:&#10;Preciso de ajuda — I need help&#10;Pode ajudar? — can you help?"
            />
          </div>
        </div>
      </div>

      {/* Examples */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Примеры с аудио ({examples.length})</h2>
          <button
            onClick={handleAddExample}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Добавить пример
          </button>
        </div>

        {examples.length === 0 ? (
          <p className="text-gray-600 text-center py-4">Примеры еще не добавлены</p>
        ) : (
          <div className="space-y-3">
            {examples.map((example, index) => {
              const hasAudio = audioUrls[index] || example.audio_url;
              const isPlaying = isPlayingAudio[index];
              
              return (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900">{example.text || 'Без текста'}</p>
                        {hasAudio && (
                          <span className="text-sm text-blue-600">🎵 Аудио</span>
                        )}
                      </div>
                      {example.pause_after_audio_sec && (
                        <p className="text-sm text-gray-600 mt-1">
                          Пауза после аудио: {example.pause_after_audio_sec} сек
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {hasAudio && (
                        <button
                          onClick={() => handlePlayAudio(index)}
                          disabled={isPlaying}
                          className="px-2 py-1 text-blue-600 hover:text-blue-800 text-sm"
                          title="Воспроизвести аудио"
                        >
                          {isPlaying ? '⏸️' : '▶️'}
                        </button>
                      )}
                      <button
                        onClick={() => handleGenerateAudio(index)}
                        disabled={generatingAudio[index] || !example.text?.trim()}
                        className="px-3 py-1 text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Сгенерировать аудио"
                      >
                        {generatingAudio[index] ? '⏳' : '🎵 Генерировать'}
                      </button>
                      <button
                        onClick={() => handleEditExample(index)}
                        className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleDeleteExample(index)}
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

      {/* Hints */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Подсказки ({hints.length})</h2>
          <button
            onClick={handleAddHint}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Добавить подсказку
          </button>
        </div>

        {hints.length === 0 ? (
          <p className="text-gray-600 text-center py-4">Подсказки еще не добавлены</p>
        ) : (
          <div className="space-y-3">
            {hints.map((hint, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      RU: {typeof hint === 'string' ? hint : (hint.ru || '')}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      EN: {typeof hint === 'string' ? '' : (hint.en || '')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditHint(index)}
                      className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDeleteHint(index)}
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

      {/* Example Editor Modal */}
      {showAddExample && (
        <ExampleEditorModal
          example={editingExampleIndex !== null && editingExampleIndex < examples.length ? examples[editingExampleIndex] : null}
          onSave={handleSaveExample}
          onCancel={() => {
            setShowAddExample(false);
            setEditingExampleIndex(null);
          }}
        />
      )}

      {/* Hint Editor Modal */}
      {showAddHint && (
        <HintEditorModal
          hint={editingHintIndex !== null && editingHintIndex < hints.length ? hints[editingHintIndex] : null}
          onSave={handleSaveHint}
          onCancel={() => {
            setShowAddHint(false);
            setEditingHintIndex(null);
          }}
        />
      )}
    </div>
  );
}

// Example Editor Modal
function ExampleEditorModal({ example, onSave, onCancel }: {
  example: any | null;
  onSave: (example: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    text: example?.text || '',
    pause_after_audio_sec: example?.pause_after_audio_sec || 1.5,
  });

  const handleSave = () => {
    if (!formData.text.trim()) {
      alert('Пожалуйста, введите текст примера');
      return;
    }

    onSave({
      text: formData.text.trim(),
      audio: true,
      pause_after_audio_sec: formData.pause_after_audio_sec,
      // Preserve audio_url if it exists when editing
      audio_url: example?.audio_url || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">
              {example ? 'Редактировать пример' : 'Добавить пример'}
            </h2>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Текст примера (PT) *
            </label>
            <input
              type="text"
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Preciso de ajuda."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Пауза после аудио (секунды)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.pause_after_audio_sec}
              onChange={(e) => setFormData({ ...formData, pause_after_audio_sec: parseFloat(e.target.value) || 1.5 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="1.5"
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
      </div>
    </div>
  );
}

// Hint Editor Modal
function HintEditorModal({ hint, onSave, onCancel }: {
  hint: any | null;
  onSave: (hint: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    ru: typeof hint === 'string' ? hint : (hint?.ru || ''),
    en: typeof hint === 'string' ? '' : (hint?.en || ''),
  });

  const handleSave = () => {
    if (!formData.ru.trim()) {
      alert('Пожалуйста, введите подсказку на русском');
      return;
    }

    onSave({
      ru: formData.ru.trim(),
      en: formData.en.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">
              {hint ? 'Редактировать подсказку' : 'Добавить подсказку'}
            </h2>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Подсказка (RU) *
            </label>
            <input
              type="text"
              value={formData.ru}
              onChange={(e) => setFormData({ ...formData, ru: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Preciso — «Мне нужно»"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Подсказка (EN)
            </label>
            <input
              type="text"
              value={formData.en}
              onChange={(e) => setFormData({ ...formData, en: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Preciso means «I need»"
            />
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

