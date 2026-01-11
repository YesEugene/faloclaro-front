'use client';

import { useState, useEffect } from 'react';

interface ReinforcementBlockEditorProps {
  block: any;
  onChange: (block: any) => void;
  lessonDay: number;
}

export default function ReinforcementBlockEditor({ block, onChange, lessonDay }: ReinforcementBlockEditorProps) {
  // Support both old structure (block.task_1) and new structure (block.content.task_1)
  const getContent = () => {
    if (block.content && typeof block.content === 'object') {
      return block.content;
    }
    // Old structure: convert to new structure
    return {
      task_1: block.task_1 || null,
      task_2: block.task_2 || null,
    };
  };

  const content = getContent();
  const [task1, setTask1] = useState<any>(content.task_1 || null);
  const [task2, setTask2] = useState<any>(content.task_2 || null);
  const [showTask1Editor, setShowTask1Editor] = useState(false);
  const [showTask2Editor, setShowTask2Editor] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState<{ task1: boolean; task2: boolean }>({ task1: false, task2: false });
  const [isPlayingAudio, setIsPlayingAudio] = useState<{ task1: boolean; task2: boolean }>({ task1: false, task2: false });
  const [audioUrls, setAudioUrls] = useState<{ task1: string | null; task2: string | null }>({ task1: null, task2: null });

  // Check for existing audio URLs when tasks change
  useEffect(() => {
    const checkAudioUrls = async () => {
      const urls: { task1: string | null; task2: string | null } = { task1: null, task2: null };
      
      // Check task1
      if (task1?.audio_url) {
        urls.task1 = task1.audio_url;
      } else if (task1?.audio && task1.audio.trim()) {
        try {
          const response = await fetch(`/api/phrases?text=${encodeURIComponent(task1.audio.trim())}`);
          const data = await response.json();
          if (data.success && data.exists && data.audioUrl) {
            urls.task1 = data.audioUrl;
          }
        } catch (error) {
          console.error('Error checking audio for task1:', error);
        }
      }
      
      // Check task2
      if (task2?.audio_url) {
        urls.task2 = task2.audio_url;
      } else if (task2?.audio && task2.audio.trim()) {
        try {
          const response = await fetch(`/api/phrases?text=${encodeURIComponent(task2.audio.trim())}`);
          const data = await response.json();
          if (data.success && data.exists && data.audioUrl) {
            urls.task2 = data.audioUrl;
          }
        } catch (error) {
          console.error('Error checking audio for task2:', error);
        }
      }
      
      setAudioUrls(urls);
    };
    
    checkAudioUrls();
  }, [task1, task2]);

  const updateBlock = (updates: any) => {
    onChange({
      ...block,
      block_type: block.block_type || 'reinforcement',
      content: {
        ...content,
        ...updates,
      },
    });
  };

  const handleSaveTask1 = (task: any) => {
    setTask1(task);
    updateBlock({ task_1: task });
    setShowTask1Editor(false);
  };

  const handleSaveTask2 = (task: any) => {
    setTask2(task);
    updateBlock({ task_2: task });
    setShowTask2Editor(false);
  };

  const handleDeleteTask1 = () => {
    if (confirm('Вы уверены, что хотите удалить задание 1?')) {
      setTask1(null);
      updateBlock({ task_1: null });
    }
  };

  const handleDeleteTask2 = () => {
    if (confirm('Вы уверены, что хотите удалить задание 2?')) {
      setTask2(null);
      updateBlock({ task_2: null });
      setAudioUrls(prev => ({ ...prev, task2: null }));
    }
  };

  const handleGenerateAudio = async (taskNumber: 1 | 2) => {
    const task = taskNumber === 1 ? task1 : task2;
    if (!task || !task.audio || !task.audio.trim()) {
      alert('Пожалуйста, сначала добавьте текст аудио');
      return;
    }

    const taskKey = taskNumber === 1 ? 'task1' : 'task2';
    setGeneratingAudio(prev => ({ ...prev, [taskKey]: true }));

    try {
      const response = await fetch('/api/admin/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: task.audio.trim(),
          lessonId: lessonDay.toString(),
          taskId: 2, // Rules task
          blockId: block.block_id || block.block_type || 'reinforcement',
          itemId: `task_${taskNumber}_audio_${Date.now()}`,
        }),
      });

      const data = await response.json();
      if (data.success && data.audioUrl) {
        // Update task with audio_url
        const updatedTask = {
          ...task,
          audio_url: data.audioUrl,
        };
        
        if (taskNumber === 1) {
          setTask1(updatedTask);
          updateBlock({ task_1: updatedTask });
          setAudioUrls(prev => ({ ...prev, task1: data.audioUrl }));
        } else {
          setTask2(updatedTask);
          updateBlock({ task_2: updatedTask });
          setAudioUrls(prev => ({ ...prev, task2: data.audioUrl }));
        }
      } else {
        alert('Ошибка при генерации аудио: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      alert('Ошибка при генерации аудио');
    } finally {
      setGeneratingAudio(prev => ({ ...prev, [taskKey]: false }));
    }
  };

  const handlePlayAudio = (taskNumber: 1 | 2) => {
    const task = taskNumber === 1 ? task1 : task2;
    const taskKey = taskNumber === 1 ? 'task1' : 'task2';
    const audioUrl = audioUrls[taskKey] || task?.audio_url;
    if (!audioUrl) return;

    setIsPlayingAudio(prev => ({ ...prev, [taskKey]: true }));
    const audio = new Audio(audioUrl);
    audio.play().catch(err => {
      console.error('Error playing audio:', err);
      setIsPlayingAudio(prev => ({ ...prev, [taskKey]: false }));
    });
    audio.onended = () => setIsPlayingAudio(prev => ({ ...prev, [taskKey]: false }));
    audio.onerror = () => setIsPlayingAudio(prev => ({ ...prev, [taskKey]: false }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Упражнения</h2>
        <p className="text-sm text-gray-600 mb-6">
          Добавьте формы с проигрыванием и вариантами ответа. Можно добавить до 2 заданий.
        </p>

        {/* Task 1 */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-gray-900">Задание 1</h3>
            {!task1 ? (
              <button
                onClick={() => setShowTask1Editor(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Добавить задание 1
              </button>
            ) : (
              <div className="flex gap-2">
                {(audioUrls.task1 || task1.audio_url) && (
                  <button
                    onClick={() => handlePlayAudio(1)}
                    disabled={isPlayingAudio.task1}
                    className="px-2 py-1 text-blue-600 hover:text-blue-800 text-sm"
                    title="Воспроизвести аудио"
                  >
                    {isPlayingAudio.task1 ? '⏸️' : '▶️'}
                  </button>
                )}
                <button
                  onClick={() => handleGenerateAudio(1)}
                  disabled={generatingAudio.task1 || !task1.audio?.trim() || task1.format !== 'single_choice'}
                  className="px-3 py-1 text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Сгенерировать аудио"
                >
                  {generatingAudio.task1 ? '⏳' : '🎵 Генерировать'}
                </button>
                <button
                  onClick={() => setShowTask1Editor(true)}
                  className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Редактировать
                </button>
                <button
                  onClick={handleDeleteTask1}
                  className="px-3 py-1 text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Удалить
                </button>
              </div>
            )}
          </div>

          {task1 && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <p className="font-medium text-gray-900">
                  {task1.format === 'single_choice' && 'Одиночный выбор'}
                  {task1.format === 'situation_to_phrase' && 'Ситуация к фразе'}
                </p>
                {(audioUrls.task1 || task1.audio_url) && (
                  <span className="text-sm text-blue-600">🎵 Аудио</span>
                )}
              </div>
              {task1.audio && (
                <p className="text-sm text-gray-600 mb-1">Аудио: {task1.audio}</p>
              )}
              {task1.question && (
                <p className="text-sm text-gray-700">
                  Вопрос: {typeof task1.question === 'string' ? task1.question : (task1.question.ru || task1.question.en || '')}
                </p>
              )}
              {task1.options && (
                <p className="text-sm text-gray-600 mt-2">
                  Вариантов ответа: {task1.options.length}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Task 2 */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-gray-900">Задание 2</h3>
            {!task2 ? (
              <button
                onClick={() => setShowTask2Editor(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Добавить задание 2
              </button>
            ) : (
              <div className="flex gap-2">
                {(audioUrls.task2 || task2.audio_url) && (
                  <button
                    onClick={() => handlePlayAudio(2)}
                    disabled={isPlayingAudio.task2}
                    className="px-2 py-1 text-blue-600 hover:text-blue-800 text-sm"
                    title="Воспроизвести аудио"
                  >
                    {isPlayingAudio.task2 ? '⏸️' : '▶️'}
                  </button>
                )}
                <button
                  onClick={() => handleGenerateAudio(2)}
                  disabled={generatingAudio.task2 || !task2.audio?.trim() || task2.format !== 'single_choice'}
                  className="px-3 py-1 text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Сгенерировать аудио"
                >
                  {generatingAudio.task2 ? '⏳' : '🎵 Генерировать'}
                </button>
                <button
                  onClick={() => setShowTask2Editor(true)}
                  className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Редактировать
                </button>
                <button
                  onClick={handleDeleteTask2}
                  className="px-3 py-1 text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Удалить
                </button>
              </div>
            )}
          </div>

          {task2 && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <p className="font-medium text-gray-900">
                  {task2.format === 'single_choice' && 'Одиночный выбор'}
                  {task2.format === 'situation_to_phrase' && 'Ситуация к фразе'}
                </p>
                {(audioUrls.task2 || task2.audio_url) && (
                  <span className="text-sm text-blue-600">🎵 Аудио</span>
                )}
              </div>
              {task2.audio && (
                <p className="text-sm text-gray-600 mb-1">Аудио: {task2.audio}</p>
              )}
              {task2.question && (
                <p className="text-sm text-gray-700">
                  Вопрос: {typeof task2.question === 'string' ? task2.question : (task2.question.ru || task2.question.en || '')}
                </p>
              )}
              {task2.situation_text && (
                <p className="text-sm text-gray-700">
                  Ситуация: {typeof task2.situation_text === 'string' ? task2.situation_text : (task2.situation_text.ru || task2.situation_text.en || '')}
                </p>
              )}
              {task2.options && (
                <p className="text-sm text-gray-600 mt-2">
                  Вариантов ответа: {task2.options.length}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Task Editors */}
      {showTask1Editor && (
        <ReinforcementTaskEditor
          task={task1}
          taskNumber={1}
          lessonDay={lessonDay}
          onSave={handleSaveTask1}
          onCancel={() => setShowTask1Editor(false)}
        />
      )}

      {showTask2Editor && (
        <ReinforcementTaskEditor
          task={task2}
          taskNumber={2}
          lessonDay={lessonDay}
          onSave={handleSaveTask2}
          onCancel={() => setShowTask2Editor(false)}
        />
      )}
    </div>
  );
}

// Reinforcement Task Editor Component
function ReinforcementTaskEditor({ task, taskNumber, lessonDay, onSave, onCancel }: {
  task: any | null;
  taskNumber: number;
  lessonDay: number;
  onSave: (task: any) => void;
  onCancel: () => void;
}) {
  const [format, setFormat] = useState<string>(task?.format || 'single_choice');
  const [audio, setAudio] = useState<string>(task?.audio || '');
  const [audioUrl, setAudioUrl] = useState<string | null>(task?.audio_url || null);
  const [audioExists, setAudioExists] = useState<boolean>(!!task?.audio_url);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [question, setQuestion] = useState<{ ru: string; en: string }>({
    ru: typeof task?.question === 'string' ? '' : (task?.question?.ru || ''),
    en: typeof task?.question === 'string' ? '' : (task?.question?.en || ''),
  });
  const [situationText, setSituationText] = useState<{ ru: string; en: string }>({
    ru: typeof task?.situation_text === 'string' ? '' : (task?.situation_text?.ru || ''),
    en: typeof task?.situation_text === 'string' ? '' : (task?.situation_text?.en || ''),
  });
  const [options, setOptions] = useState<any[]>(task?.options || []);
  const [showOptionEditor, setShowOptionEditor] = useState(false);
  const [editingOptionIndex, setEditingOptionIndex] = useState<number | null>(null);

  // Check for existing audio when task or audio text changes
  useEffect(() => {
    const checkAudio = async () => {
      // Prioritize audio_url from task if it exists
      if (task?.audio_url) {
        setAudioUrl(task.audio_url);
        setAudioExists(true);
        return;
      }
      
      // Otherwise check database
      if (audio && audio.trim()) {
        try {
          const response = await fetch(`/api/phrases?text=${encodeURIComponent(audio.trim())}`);
          const data = await response.json();
          if (data.success && data.exists && data.audioUrl) {
            setAudioUrl(data.audioUrl);
            setAudioExists(true);
          } else {
            setAudioUrl(null);
            setAudioExists(false);
          }
        } catch (error) {
          console.error('Error checking audio:', error);
          setAudioUrl(null);
          setAudioExists(false);
        }
      } else {
        setAudioUrl(null);
        setAudioExists(false);
      }
    };
    
    checkAudio();
  }, [task?.audio_url, audio]);

  const handleAddOption = () => {
    setEditingOptionIndex(options.length);
    setShowOptionEditor(true);
  };

  const handleEditOption = (index: number) => {
    setEditingOptionIndex(index);
    setShowOptionEditor(true);
  };

  const handleSaveOption = (option: any) => {
    const newOptions = [...options];
    if (editingOptionIndex !== null && editingOptionIndex < options.length) {
      newOptions[editingOptionIndex] = option;
    } else {
      newOptions.push(option);
    }
    setOptions(newOptions);
    setShowOptionEditor(false);
    setEditingOptionIndex(null);
  };

  const handleDeleteOption = (index: number) => {
    if (confirm('Вы уверены, что хотите удалить этот вариант ответа?')) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const handleMoveOptionUp = (index: number) => {
    if (index === 0) return;
    const newOptions = [...options];
    [newOptions[index - 1], newOptions[index]] = [newOptions[index], newOptions[index - 1]];
    setOptions(newOptions);
  };

  const handleMoveOptionDown = (index: number) => {
    if (index === options.length - 1) return;
    const newOptions = [...options];
    [newOptions[index], newOptions[index + 1]] = [newOptions[index + 1], newOptions[index]];
    setOptions(newOptions);
  };

  const handlePlayAudio = () => {
    const urlToPlay = audioUrl || task?.audio_url;
    if (!urlToPlay) return;

    setIsPlayingAudio(true);
    const audio = new Audio(urlToPlay);
    audio.play().catch(err => {
      console.error('Error playing audio:', err);
      setIsPlayingAudio(false);
    });
    audio.onended = () => setIsPlayingAudio(false);
    audio.onerror = () => setIsPlayingAudio(false);
  };

  const handleSave = () => {
    if (!audio.trim() && format === 'single_choice') {
      alert('Пожалуйста, введите аудио текст для проигрывания');
      return;
    }

    if (format === 'single_choice' && (!question.ru.trim() && !question.en.trim())) {
      alert('Пожалуйста, введите вопрос');
      return;
    }

    if (format === 'situation_to_phrase' && (!situationText.ru.trim() && !situationText.en.trim())) {
      alert('Пожалуйста, введите текст ситуации');
      return;
    }

    if (options.length === 0) {
      alert('Пожалуйста, добавьте хотя бы один вариант ответа');
      return;
    }

    const taskData: any = {
      format,
      audio: audio.trim() || undefined,
      audio_url: audioUrl || task?.audio_url || undefined,
      options,
    };

    if (format === 'single_choice') {
      taskData.question = {
        ru: question.ru.trim() || undefined,
        en: question.en.trim() || undefined,
      };
    } else if (format === 'situation_to_phrase') {
      taskData.situation_text = {
        ru: situationText.ru.trim() || undefined,
        en: situationText.en.trim() || undefined,
      };
    }

    onSave(taskData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">
              Редактирование задания {taskNumber}
            </h2>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
        </div>
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Формат задания *
            </label>
            <select
              value={format}
              onChange={(e) => {
                setFormat(e.target.value);
                setOptions([]); // Clear options when format changes
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="single_choice">Одиночный выбор (аудио + вопрос + варианты)</option>
              <option value="situation_to_phrase">Ситуация к фразе (ситуация + варианты фраз)</option>
            </select>
          </div>

          {/* Audio */}
          {format === 'single_choice' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Аудио текст для проигрывания (PT) *
              </label>
              <div className="flex gap-2 mb-2 items-center">
                <input
                  type="text"
                  value={audio}
                  onChange={(e) => setAudio(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Preciso de ajuda."
                />
                {audioExists && audioUrl && (
                  <button
                    type="button"
                    onClick={handlePlayAudio}
                    disabled={isPlayingAudio}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
                    title="Воспроизвести аудио"
                  >
                    {isPlayingAudio ? '⏸️' : '▶️'} Play
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    if (!audio.trim()) {
                      alert('Пожалуйста, введите текст для генерации аудио');
                      return;
                    }
                    
                    try {
                      const response = await fetch('/api/admin/audio/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          text: audio.trim(),
                          lessonId: lessonDay.toString(),
                          taskId: 2,
                          blockId: 'reinforcement',
                          itemId: `task_${taskNumber}_${Date.now()}`,
                        }),
                      });

                      const data = await response.json();
                      if (data.success && data.audioUrl) {
                        setAudioUrl(data.audioUrl);
                        setAudioExists(true);
                      } else {
                        alert('Ошибка при генерации аудио: ' + (data.error || 'Unknown error'));
                      }
                    } catch (err) {
                      console.error('Error generating audio:', err);
                      alert('Ошибка при генерации аудио');
                    }
                  }}
                  className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs whitespace-nowrap"
                >
                  🎵 Генерировать
                </button>
                <label className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs cursor-pointer whitespace-nowrap">
                  📤 Загрузить
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      if (!audio.trim()) {
                        alert('Пожалуйста, введите текст');
                        return;
                      }

                      try {
                        const uploadFormData = new FormData();
                        uploadFormData.append('file', file);
                        uploadFormData.append('lessonId', lessonDay.toString());
                        uploadFormData.append('taskId', '2');
                        uploadFormData.append('blockId', 'reinforcement');
                        uploadFormData.append('itemId', `task_${taskNumber}_${Date.now()}`);
                        uploadFormData.append('textPt', audio.trim());

                        const response = await fetch('/api/admin/audio/upload', {
                          method: 'POST',
                          body: uploadFormData,
                        });

                        const data = await response.json();
                        if (data.success && data.audioUrl) {
                          setAudioUrl(data.audioUrl);
                          setAudioExists(true);
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
              <p className="text-xs text-gray-500">
                Генерация использует Google Text-to-Speech. Загрузка позволяет использовать свой аудиофайл.
              </p>
            </div>
          )}

          {/* Question (for single_choice) */}
          {format === 'single_choice' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Вопрос (RU) *
                </label>
                <input
                  type="text"
                  value={question.ru}
                  onChange={(e) => setQuestion({ ...question, ru: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="О чём говорит человек?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Вопрос (EN) *
                </label>
                <input
                  type="text"
                  value={question.en}
                  onChange={(e) => setQuestion({ ...question, en: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="What is the person saying?"
                />
              </div>
            </div>
          )}

          {/* Situation Text (for situation_to_phrase) */}
          {format === 'situation_to_phrase' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Текст ситуации (RU) *
                </label>
                <input
                  type="text"
                  value={situationText.ru}
                  onChange={(e) => setSituationText({ ...situationText, ru: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Ты хочешь сказать, что работаешь днём."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Текст ситуации (EN) *
                </label>
                <input
                  type="text"
                  value={situationText.en}
                  onChange={(e) => setSituationText({ ...situationText, en: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="You want to say that you work in the afternoon."
                />
              </div>
            </div>
          )}

          {/* Options */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Варианты ответа ({options.length})
              </label>
              <button
                onClick={handleAddOption}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                + Добавить вариант
              </button>
            </div>

            {options.length === 0 ? (
              <p className="text-gray-600 text-center py-4">Варианты ответа еще не добавлены</p>
            ) : (
              <div className="space-y-3">
                {options.map((option, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {option.correct && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                              Правильный
                            </span>
                          )}
                          <span className="font-medium text-gray-900">
                            {format === 'single_choice'
                              ? (typeof option.text === 'string' ? option.text : (option.text?.ru || option.text?.en || ''))
                              : option.text}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => handleMoveOptionUp(index)}
                          disabled={index === 0}
                          className="px-2 py-1 text-gray-700 hover:text-gray-900 hover:bg-gray-100 text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed rounded border border-gray-300"
                          title="Переместить вверх"
                          style={{ minWidth: '32px', height: '32px' }}
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleMoveOptionDown(index)}
                          disabled={index === options.length - 1}
                          className="px-2 py-1 text-gray-700 hover:text-gray-900 hover:bg-gray-100 text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed rounded border border-gray-300"
                          title="Переместить вниз"
                          style={{ minWidth: '32px', height: '32px' }}
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => handleEditOption(index)}
                          className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleDeleteOption(index)}
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
              Сохранить задание
            </button>
          </div>
        </div>

        {/* Option Editor Modal */}
        {showOptionEditor && (
          <OptionEditorModal
            format={format}
            option={editingOptionIndex !== null && editingOptionIndex < options.length ? options[editingOptionIndex] : null}
            onSave={handleSaveOption}
            onCancel={() => {
              setShowOptionEditor(false);
              setEditingOptionIndex(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

// Option Editor Modal
function OptionEditorModal({ format, option, onSave, onCancel }: {
  format: string;
  option: any | null;
  onSave: (option: any) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState<{ ru: string; en: string } | string>(
    format === 'single_choice'
      ? {
          ru: typeof option?.text === 'string' ? '' : (option?.text?.ru || ''),
          en: typeof option?.text === 'string' ? '' : (option?.text?.en || ''),
        }
      : (option?.text || '')
  );
  const [correct, setCorrect] = useState<boolean>(option?.correct || false);

  const handleSave = () => {
    if (format === 'single_choice') {
      const textObj = text as { ru: string; en: string };
      if (!textObj.ru.trim() && !textObj.en.trim()) {
        alert('Пожалуйста, введите текст варианта ответа хотя бы на одном языке');
        return;
      }
      onSave({
        text: {
          ru: textObj.ru.trim() || undefined,
          en: textObj.en.trim() || undefined,
        },
        correct,
      });
    } else {
      if (!(text as string).trim()) {
        alert('Пожалуйста, введите текст фразы');
        return;
      }
      onSave({
        text: (text as string).trim(),
        correct,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">
              {option ? 'Редактировать вариант' : 'Добавить вариант'}
            </h2>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {format === 'single_choice' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Текст (RU) *
                </label>
                <input
                  type="text"
                  value={(text as { ru: string; en: string }).ru}
                  onChange={(e) => setText({ ...(text as { ru: string; en: string }), ru: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Просит о помощи"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Текст (EN) *
                </label>
                <input
                  type="text"
                  value={(text as { ru: string; en: string }).en}
                  onChange={(e) => setText({ ...(text as { ru: string; en: string }), en: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Asking for help"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Текст фразы (PT) *
              </label>
              <input
                type="text"
                value={text as string}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="À tarde trabalho."
              />
            </div>
          )}

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={correct}
                onChange={(e) => setCorrect(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Правильный ответ</span>
            </label>
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

