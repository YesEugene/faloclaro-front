'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import TaskEditor from '@/components/admin/TaskEditor';
import { normalizeTasksArray } from '@/lib/lesson-tasks-normalizer';
import { buildAuthoringLessonExport } from '@/lib/lesson-authoring-export';

function LessonEditorContent() {
  const params = useParams();
  const router = useRouter();
  const lessonId = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [showTaskTypeModal, setShowTaskTypeModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [editingLesson, setEditingLesson] = useState(false);
  const [lessonTitle, setLessonTitle] = useState<{ ru: string; en: string; pt: string }>({ ru: '', en: '', pt: '' });
  const [lessonSubtitle, setLessonSubtitle] = useState<{ ru: string; en: string; pt: string }>({ ru: '', en: '', pt: '' });
  const [isGeneratingAllAudio, setIsGeneratingAllAudio] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateTopicRu, setGenerateTopicRu] = useState('');
  const [generateTopicEn, setGenerateTopicEn] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState({ step: '', progress: 0 });
  const [generateError, setGenerateError] = useState('');

  const handleDownloadLessonJson = () => {
    if (!lesson) {
      alert('Урок ещё не загружен');
      return;
    }
    const dayNumber = lesson.day_number || lesson?.yaml_content?.day?.day_number || null;
    const yamlDay = (typeof lesson.yaml_content === 'string'
      ? JSON.parse(lesson.yaml_content || '{}')
      : lesson.yaml_content || {})?.day;

    const exportData: any = buildAuthoringLessonExport({
      dayNumber,
      title_ru: lesson.title_ru || '',
      title_en: lesson.title_en || '',
      title_pt: lesson.title_pt || '',
      subtitle_ru: lesson.subtitle_ru || '',
      subtitle_en: lesson.subtitle_en || '',
      subtitle_pt: lesson.subtitle_pt || '',
      estimated_time: yamlDay?.estimated_time || lesson.estimated_time || '',
      tasks: tasks || [],
    });

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lesson_${dayNumber ?? 'x'}_${lessonId}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (lessonId) {
      loadLesson();
    }
  }, [lessonId]);

  const loadLesson = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/lessons/${lessonId}`);
      const data = await response.json();
      if (data.success && data.lesson) {
        setLesson(data.lesson);
        // Set lesson title and subtitle for editing
        setLessonTitle({
          ru: data.lesson.title_ru || '',
          en: data.lesson.title_en || '',
          pt: data.lesson.title_pt || '',
        });
        setLessonSubtitle({
          ru: data.lesson.subtitle_ru || '',
          en: data.lesson.subtitle_en || '',
          pt: data.lesson.subtitle_pt || '',
        });
        // Parse yaml_content if it's a string
        const yamlContent = typeof data.lesson.yaml_content === 'string' 
          ? JSON.parse(data.lesson.yaml_content || '{}')
          : data.lesson.yaml_content || {};
        setTasks(normalizeTasksArray(yamlContent.tasks || yamlContent?.day?.tasks || []));
      } else {
        console.error('Failed to load lesson:', data);
      }
    } catch (err) {
      console.error('Error loading lesson:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyYamlContent = async (yamlContent: any) => {
    const response = await fetch(`/api/admin/lessons/${lessonId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yaml_content: yamlContent }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.success) {
      throw new Error(data?.error || 'Ошибка при сохранении урока');
    }
    await loadLesson();
  };

  const handleGenerateLesson = async () => {
    if (!generateTopicRu.trim() || !generateTopicEn.trim()) {
      alert('Пожалуйста, заполните обе темы (RU и EN)');
      return;
    }

    setIsGenerating(true);
    setGenerateError('');
    setGenerateProgress({ step: 'Загрузка методологий...', progress: 10 });

    try {
      // Simulate progress stages
      const progressStages = [
        { step: 'Загрузка методологий...', progress: 10 },
        { step: 'Получение примера урока...', progress: 25 },
        { step: 'Подготовка промпта...', progress: 40 },
        { step: 'Генерация урока с помощью AI...', progress: 60 },
        { step: 'Проверка и валидация...', progress: 80 },
        { step: 'Сохранение урока...', progress: 95 },
      ];

      for (const stage of progressStages) {
        setGenerateProgress(stage);
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      const response = await fetch(`/api/admin/lessons/${lessonId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_ru: generateTopicRu.trim(),
          topic_en: generateTopicEn.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to generate lesson');
      }

      const data = await response.json();
      
      if (data.success) {
        setGenerateProgress({ step: 'Генерация завершена!', progress: 100 });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Reload lesson to show new content
        await loadLesson();
        
        setShowGenerateModal(false);
        setGenerateTopicRu('');
        setGenerateTopicEn('');
        alert('Урок успешно сгенерирован!');
      } else {
        throw new Error(data.error || 'Failed to generate lesson');
      }
    } catch (err: any) {
      console.error('Error generating lesson:', err);
      setGenerateError(err.message || 'Ошибка при генерации урока');
      setGenerateProgress({ step: '', progress: 0 });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateTask = (taskType: 'vocabulary' | 'rules' | 'listening' | 'attention' | 'writing') => {
    setShowTaskTypeModal(false);
    // Create new task based on type
    const taskIdByType: Record<string, number> = {
      vocabulary: 1,
      rules: 2,
      listening: 3,
      attention: 4,
      writing: 5,
    };
    const newTask: any = {
      task_id: taskIdByType[taskType] || tasks.length + 1,
      type: taskType === 'listening' ? 'listening_comprehension' : taskType === 'writing' ? 'writing_optional' : taskType,
      title: { ru: '', en: '' },
      subtitle: { ru: '', en: '' },
      estimated_time: '',
    };

    if (taskType === 'vocabulary') {
      newTask.content = { cards: [] };
      newTask.ui = {
        show_audio_settings: true,
        show_timer: true,
        allow_repeat: true,
      };
      newTask.completion_rule = 'auto_after_audio_10_min';
    } else if (taskType === 'rules') {
      newTask.structure = { blocks_order: [] };
      newTask.blocks = {};
    } else if (taskType === 'listening' || taskType === 'attention') {
      newTask.items = [];
      newTask.ui_rules = {
        audio_plays_first: true,
        show_text_after_answer: true,
      };
    } else if (taskType === 'writing') {
      newTask.optional = true;
      newTask.main_task = { format: 'template_fill_or_speak', template: [] };
    }

    setEditingTask(newTask);
  };

  const handleSaveTask = async (task: any) => {
    // Update tasks array
    const updatedTasks = [...tasks];
    const existingIndex = updatedTasks.findIndex((t: any) => t.task_id === task.task_id);
    
    if (existingIndex >= 0) {
      updatedTasks[existingIndex] = task;
    } else {
      updatedTasks.push(task);
    }

    const normalized = normalizeTasksArray(updatedTasks);
    setTasks(normalized);

    // Update lesson in database
    const yamlContent = {
      ...(lesson.yaml_content || {}),
      tasks: normalized,
    };

    try {
      const response = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yaml_content: yamlContent }),
      });

      const data = await response.json();
      if (data.success) {
        setEditingTask(null);
        loadLesson();
      } else {
        alert('Ошибка при сохранении: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Ошибка при сохранении задания');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Вы уверены, что хотите удалить это задание?')) return;

    const updatedTasks = tasks.filter((t: any) => t.task_id !== taskId);
    setTasks(updatedTasks);

    const yamlContent = {
      ...(lesson.yaml_content || {}),
      tasks: updatedTasks,
    };

    try {
      const response = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yaml_content: yamlContent }),
      });

      const data = await response.json();
      if (data.success) {
        loadLesson();
      } else {
        alert('Ошибка при удалении задания');
      }
    } catch (err) {
      alert('Ошибка при удалении задания');
    }
  };

  const handleDeleteLesson = async () => {
    const lessonTitle = lesson.title_ru || lesson.title_en || lesson.title_pt || `Урок ${lesson.day_number}`;
    const confirmMessage = `Вы уверены, что хотите удалить урок "${lessonTitle}"?\n\nЭто действие нельзя отменить. Все задания и связанные данные будут удалены.`;
    
    if (!confirm(confirmMessage)) return;

    try {
      const response = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        alert('Урок успешно удален!');
        // Redirect to dashboard after deletion
        router.push('/admin/dashboard?tab=lessons');
      } else {
        const errorMessage = data.error || data.details || 'Unknown error';
        console.error('Delete lesson error:', data);
        alert(`Ошибка при удалении урока: ${errorMessage}\n\nДетали: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (err: any) {
      console.error('Error deleting lesson:', err);
      alert('Ошибка при удалении урока: ' + (err.message || 'Unknown error'));
    }
  };

  const handleGenerateAllAudio = async () => {
    if (!lesson || !tasks || tasks.length === 0) {
      alert('Урок не содержит заданий для генерации аудио');
      return;
    }

    if (!confirm('Это сгенерирует аудио для всех элементов во всех заданиях урока. Продолжить?')) {
      return;
    }

    setIsGeneratingAllAudio(true);
    let successCount = 0;
    let errorCount = 0;
    const itemsToUpdate: Array<{ taskIndex: number; itemPath: string; audioUrl: string }> = [];

    try {
      const lessonDay = lesson.day_number || parseInt(lessonId) || 1;

      // Collect all items that need audio generation and update them
      const updatedTasks = JSON.parse(JSON.stringify(tasks)); // Deep copy

      for (let taskIndex = 0; taskIndex < updatedTasks.length; taskIndex++) {
        const task = updatedTasks[taskIndex];
        const taskId = taskIndex + 1;

        // Vocabulary task: cards
        if (task.type === 'vocabulary') {
          const cards = task.content?.cards || task.blocks?.find((b: any) => b.block_type === 'listen_and_repeat')?.content?.cards || [];
          for (let cardIndex = 0; cardIndex < cards.length; cardIndex++) {
            const card = cards[cardIndex];
            if (card.word && card.word.trim() && !card.audio_url) {
              try {
                const response = await fetch('/api/admin/audio/generate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    text: card.word.trim(),
                    lessonId: lessonDay.toString(),
                    taskId: taskId,
                    blockId: 'listen_and_repeat',
                    itemId: `card_${cardIndex}_${Date.now()}`,
                  }),
                });
                const data = await response.json();
                if (data.success && data.audioUrl) {
                  card.audio_url = data.audioUrl;
                  successCount++;
                } else {
                  errorCount++;
                }
              } catch (err) {
                errorCount++;
              }
              await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
            }
          }
          // Update task with new cards
          if (task.content) {
            task.content.cards = cards;
          } else if (task.blocks) {
            const block = task.blocks.find((b: any) => b.block_type === 'listen_and_repeat');
            if (block) {
              block.content.cards = cards;
            }
          }
        }

        // Rules task: blocks
        if (task.type === 'rules' || task.type === 'rules_task') {
          const blocks = Array.isArray(task.blocks) ? task.blocks : (task.blocks ? Object.values(task.blocks) : []);
          
          for (const block of blocks) {
            // Explanation block: examples
            if (block.block_type === 'explanation' || block.block_type === 'how_to_say') {
              const examples = block.content?.examples || block.examples || [];
              for (let exampleIndex = 0; exampleIndex < examples.length; exampleIndex++) {
                const example = examples[exampleIndex];
                if (example.text && example.text.trim() && !example.audio_url) {
                  try {
                    const response = await fetch('/api/admin/audio/generate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        text: example.text.trim(),
                        lessonId: lessonDay.toString(),
                        taskId: taskId,
                        blockId: block.block_id || block.block_type || 'explanation',
                        itemId: `example_${exampleIndex}_${Date.now()}`,
                      }),
                    });
                    const data = await response.json();
                    if (data.success && data.audioUrl) {
                      example.audio_url = data.audioUrl;
                      successCount++;
                    } else {
                      errorCount++;
                    }
                  } catch (err) {
                    errorCount++;
                  }
                  await new Promise(resolve => setTimeout(resolve, 200));
                }
              }
              if (block.content) {
                block.content.examples = examples;
              } else {
                block.examples = examples;
              }
            }

            // Comparison block: comparison cards
            if (block.block_type === 'comparison') {
              const cards = block.content?.comparison_card || block.comparison_card || [];
              for (let cardIndex = 0; cardIndex < cards.length; cardIndex++) {
                const card = cards[cardIndex];
                if (card.text && card.text.trim() && !card.audio_url) {
                  try {
                    const response = await fetch('/api/admin/audio/generate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        text: card.text.trim(),
                        lessonId: lessonDay.toString(),
                        taskId: taskId,
                        blockId: block.block_id || block.block_type || 'comparison',
                        itemId: `card_${cardIndex}_${Date.now()}`,
                      }),
                    });
                    const data = await response.json();
                    if (data.success && data.audioUrl) {
                      card.audio_url = data.audioUrl;
                      successCount++;
                    } else {
                      errorCount++;
                    }
                  } catch (err) {
                    errorCount++;
                  }
                  await new Promise(resolve => setTimeout(resolve, 200));
                }
              }
              if (block.content) {
                block.content.comparison_card = cards;
              } else {
                block.comparison_card = cards;
              }
            }

            // Reinforcement block: task_1 and task_2 audio
            if (block.block_type === 'reinforcement') {
              const task1 = block.content?.task_1 || block.task_1;
              const task2 = block.content?.task_2 || block.task_2;
              
              if (task1?.audio && task1.audio.trim() && !task1.audio_url && task1.format === 'single_choice') {
                try {
                  const response = await fetch('/api/admin/audio/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      text: task1.audio.trim(),
                      lessonId: lessonDay.toString(),
                      taskId: taskId,
                      blockId: block.block_id || block.block_type || 'reinforcement',
                      itemId: `task_1_audio_${Date.now()}`,
                    }),
                  });
                  const data = await response.json();
                  if (data.success && data.audioUrl) {
                    // Update task1 with audio_url
                    task1.audio_url = data.audioUrl;
                    // Ensure block.content exists and update it
                    if (!block.content) {
                      block.content = {};
                    }
                    block.content.task_1 = task1;
                    // Also update block.task_1 for backward compatibility
                    block.task_1 = task1;
                    successCount++;
                  } else {
                    errorCount++;
                  }
                } catch (err) {
                  errorCount++;
                }
                await new Promise(resolve => setTimeout(resolve, 200));
              }
              
              if (task2?.audio && task2.audio.trim() && !task2.audio_url && task2.format === 'single_choice') {
                try {
                  const response = await fetch('/api/admin/audio/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      text: task2.audio.trim(),
                      lessonId: lessonDay.toString(),
                      taskId: taskId,
                      blockId: block.block_id || block.block_type || 'reinforcement',
                      itemId: `task_2_audio_${Date.now()}`,
                    }),
                  });
                  const data = await response.json();
                  if (data.success && data.audioUrl) {
                    // Update task2 with audio_url
                    task2.audio_url = data.audioUrl;
                    // Ensure block.content exists and update it
                    if (!block.content) {
                      block.content = {};
                    }
                    block.content.task_2 = task2;
                    // Also update block.task_2 for backward compatibility
                    block.task_2 = task2;
                    successCount++;
                  } else {
                    errorCount++;
                  }
                } catch (err) {
                  errorCount++;
                }
                await new Promise(resolve => setTimeout(resolve, 200));
              }
            }
          }
          
          // Update task blocks
          if (Array.isArray(task.blocks)) {
            task.blocks = blocks;
          } else if (task.blocks) {
            blocks.forEach((block: any) => {
              task.blocks[block.block_id || block.block_type] = block;
            });
          }
        }

        // Listening task: items
        if (task.type === 'listening' || task.type === 'listening_comprehension') {
          const items = task.items || task.blocks?.find((b: any) => b.block_type === 'listen_phrase')?.content?.items || [];
          for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            const item = items[itemIndex];
            if (item.audio && item.audio.trim() && !item.audio_url) {
              try {
                const response = await fetch('/api/admin/audio/generate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    text: item.audio.trim(),
                    lessonId: lessonDay.toString(),
                    taskId: taskId,
                    blockId: 'listen_phrase',
                    itemId: `item_${itemIndex}_${Date.now()}`,
                  }),
                });
                const data = await response.json();
                if (data.success && data.audioUrl) {
                  item.audio_url = data.audioUrl;
                  successCount++;
                } else {
                  errorCount++;
                }
              } catch (err) {
                errorCount++;
              }
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
          if (task.items) {
            task.items = items;
          } else if (task.blocks) {
            const block = task.blocks.find((b: any) => b.block_type === 'listen_phrase');
            if (block) {
              block.content.items = items;
            }
          }
        }

        // Attention task: items
        if (task.type === 'attention' || task.type === 'attention_task') {
          const items = task.items || task.blocks?.find((b: any) => b.block_type === 'check_meaning')?.content?.items || [];
          for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            const item = items[itemIndex];
            // NOTE: In Attention task, the Portuguese phrase lives in `item.audio` (admin shows "Аудио: ...")
            const audioText =
              (typeof item.audio === 'string' ? item.audio : '')?.trim() ||
              (typeof item.text === 'string' ? item.text : '')?.trim() ||
              (typeof item.text === 'object' ? (item.text?.pt || item.text?.ru || item.text?.en || '') : '')?.trim();

            if (audioText && !item.audio_url) {
              try {
                const response = await fetch('/api/admin/audio/generate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    text: audioText,
                    lessonId: lessonDay.toString(),
                    taskId: taskId,
                    blockId: 'check_meaning',
                    itemId: `item_${itemIndex}_${Date.now()}`,
                  }),
                });
                const data = await response.json();
                if (data.success && data.audioUrl) {
                  item.audio_url = data.audioUrl;
                  successCount++;
                } else {
                  errorCount++;
                }
              } catch (err) {
                errorCount++;
              }
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
          if (task.items) {
            task.items = items;
          } else if (task.blocks) {
            const block = task.blocks.find((b: any) => b.block_type === 'check_meaning');
            if (block) {
              block.content.items = items;
            }
          }
        }
      }

      // Save updated tasks to lesson
      const yamlContent = {
        ...(typeof lesson.yaml_content === 'string' ? JSON.parse(lesson.yaml_content || '{}') : lesson.yaml_content || {}),
        tasks: updatedTasks,
      };

      const saveResponse = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yaml_content: yamlContent }),
      });

      const saveData = await saveResponse.json();
      if (saveData.success) {
        // Reload lesson to show updated audio URLs
        await loadLesson();
        
        // Show summary (only if there were errors, otherwise silent success)
        if (errorCount > 0) {
          alert(`Генерация завершена!\n\nУспешно: ${successCount}\nОшибок: ${errorCount}\nВсего: ${successCount + errorCount}`);
        } else if (successCount > 0) {
          console.log(`✅ Сгенерировано аудио для ${successCount} элементов`);
        } else {
          alert('Не найдено элементов для генерации аудио. Возможно, все элементы уже имеют аудио.');
        }
      } else {
        alert('Ошибка при сохранении урока: ' + (saveData.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('Error generating all audio:', err);
      alert('Ошибка при генерации аудио: ' + (err.message || 'Unknown error'));
    } finally {
      setIsGeneratingAllAudio(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Загрузка урока...</div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Урок не найден</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => router.push('/admin/dashboard?tab=lessons')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Назад
              </button>
              <Image
                src="/Img/Logo FaloClaro.svg"
                alt="FaloClaro"
                width={120}
                height={40}
                className="h-8 w-auto"
              />
              <div className="flex items-center gap-2">
                {!editingLesson ? (
                  <>
                    <h1 className="text-xl font-bold text-gray-900 whitespace-normal">
                      Урок {lesson.day_number}: {lesson.title_ru || lesson.title_en || lesson.title_pt || 'Без названия'}
                    </h1>
                    <button
                      onClick={() => setEditingLesson(true)}
                      className="text-gray-400 hover:text-gray-600 text-sm px-2 py-1 rounded transition-colors"
                      title="Редактировать урок"
                    >
                      ✏️
                    </button>
                  </>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={lessonTitle.ru}
                      onChange={(e) => setLessonTitle({ ...lessonTitle, ru: e.target.value })}
                      placeholder="Название (RU)"
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch(`/api/admin/lessons/${lessonId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              title_ru: lessonTitle.ru,
                              title_en: lessonTitle.en,
                              title_pt: lessonTitle.pt || lessonTitle.en || lessonTitle.ru,
                              subtitle_ru: lessonSubtitle.ru,
                              subtitle_en: lessonSubtitle.en,
                              subtitle_pt: lessonSubtitle.pt,
                            }),
                          });

                          const data = await response.json();
                          if (data.success) {
                            setEditingLesson(false);
                            loadLesson();
                            alert('Урок успешно обновлен!');
                          } else {
                            alert('Ошибка при сохранении: ' + (data.error || 'Unknown error'));
                          }
                        } catch (err) {
                          console.error('Error saving lesson:', err);
                          alert('Ошибка при сохранении урока');
                        }
                      }}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Сохранить
                    </button>
                    <button
                      onClick={() => {
                        setEditingLesson(false);
                        // Reset to original values
                        setLessonTitle({
                          ru: lesson.title_ru || '',
                          en: lesson.title_en || '',
                          pt: lesson.title_pt || '',
                        });
                        setLessonSubtitle({
                          ru: lesson.subtitle_ru || '',
                          en: lesson.subtitle_en || '',
                          pt: lesson.subtitle_pt || '',
                        });
                      }}
                      className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                    >
                      Отмена
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
              {!editingLesson && (
                <>
                  <button
                    onClick={() => {
                      // Pre-fill topic fields with lesson titles if available
                      if (lessonTitle.ru) {
                        setGenerateTopicRu(lessonTitle.ru);
                      }
                      if (lessonTitle.en) {
                        setGenerateTopicEn(lessonTitle.en);
                      }
                      setShowGenerateModal(true);
                    }}
                    disabled={isGenerating}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm"
                    title="Сгенерировать урок с помощью AI"
                  >
                    🤖 урок
                  </button>
                  <button
                    onClick={handleGenerateAllAudio}
                    disabled={isGeneratingAllAudio}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm"
                    title="Сгенерировать аудио для всех элементов урока"
                  >
                    {isGeneratingAllAudio ? '⏳...' : '🎵 аудио урока'}
                  </button>
                  <button
                    onClick={() => setShowTaskTypeModal(true)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 text-sm"
                  >
                    ✅ Создать задание
                  </button>
                  <button
                    onClick={handleDeleteLesson}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1.5 text-sm"
                    title="Удалить урок"
                  >
                    🗑️ Удалить урок
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {/* Lesson Edit Form - Show when editingLesson is true */}
      {editingLesson && (
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Редактирование урока</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название (RU) *
                </label>
                <input
                  type="text"
                  value={lessonTitle.ru}
                  onChange={(e) => setLessonTitle({ ...lessonTitle, ru: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Информация и объявления"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название (EN) *
                </label>
                <input
                  type="text"
                  value={lessonTitle.en}
                  onChange={(e) => setLessonTitle({ ...lessonTitle, en: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Information and announcements"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название (PT) *
                </label>
                <input
                  type="text"
                  value={lessonTitle.pt}
                  onChange={(e) => setLessonTitle({ ...lessonTitle, pt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Informação e anúncios"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Подзаголовок (RU)
                </label>
                <input
                  type="text"
                  value={lessonSubtitle.ru}
                  onChange={(e) => setLessonSubtitle({ ...lessonSubtitle, ru: e.target.value })}
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
                  value={lessonSubtitle.en}
                  onChange={(e) => setLessonSubtitle({ ...lessonSubtitle, en: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Requests and responses"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Подзаголовок (PT)
                </label>
                <input
                  type="text"
                  value={lessonSubtitle.pt}
                  onChange={(e) => setLessonSubtitle({ ...lessonSubtitle, pt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Pedidos e respostas"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={async () => {
                  if (!lessonTitle.ru?.trim() && !lessonTitle.en?.trim() && !lessonTitle.pt?.trim()) {
                    alert('Пожалуйста, введите название урока хотя бы на одном языке');
                    return;
                  }

                  try {
                    const response = await fetch(`/api/admin/lessons/${lessonId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        title_ru: lessonTitle.ru?.trim() || null,
                        title_en: lessonTitle.en?.trim() || null,
                        title_pt: lessonTitle.pt?.trim() || lessonTitle.en?.trim() || lessonTitle.ru?.trim() || '',
                        subtitle_ru: lessonSubtitle.ru?.trim() || null,
                        subtitle_en: lessonSubtitle.en?.trim() || null,
                        subtitle_pt: lessonSubtitle.pt?.trim() || null,
                      }),
                    });

                    const data = await response.json();
                    if (data.success) {
                      setEditingLesson(false);
                      loadLesson();
                      alert('Урок успешно обновлен!');
                    } else {
                      alert('Ошибка при сохранении: ' + (data.error || 'Unknown error'));
                    }
                  } catch (err) {
                    console.error('Error saving lesson:', err);
                    alert('Ошибка при сохранении урока');
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Сохранить изменения
              </button>
              <button
                onClick={() => {
                  setEditingLesson(false);
                  // Reset to original values
                  setLessonTitle({
                    ru: lesson.title_ru || '',
                    en: lesson.title_en || '',
                    pt: lesson.title_pt || '',
                  });
                  setLessonSubtitle({
                    ru: lesson.subtitle_ru || '',
                    en: lesson.subtitle_en || '',
                    pt: lesson.subtitle_pt || '',
                  });
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Two-Panel Layout (desktop) + mobile-first task navigation */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Mobile: Task navigation + import/export */}
        <div className="md:hidden px-4 sm:px-6 py-4">
          <div className="bg-gray-100 rounded-[20px] p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Задания урока</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadLessonJson}
                  className="px-4 py-2 bg-white text-gray-900 rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors text-sm flex items-center gap-2"
                  title="Скачать урок (JSON)"
                >
                  ⬇️ Экспорт
                </button>
                <label className="px-4 py-2 bg-white text-gray-900 rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer text-sm flex items-center gap-2">
                  📥 Импорт
                  <input
                    type="file"
                    accept=".json,.yaml,.yml"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      if (!confirm('Импорт из файла заменит все текущие данные урока. Продолжить?')) {
                        return;
                      }

                      try {
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('lessonId', lessonId);

                        const response = await fetch('/api/admin/lessons/import', {
                          method: 'POST',
                          body: formData,
                        });

                        const data = await response.json();

                        if (data.success) {
                          alert('Урок успешно импортирован!');
                          loadLesson(); // Reload lesson data
                        } else {
                          alert('Ошибка при импорте: ' + (data.error || 'Unknown error'));
                        }
                      } catch (err) {
                        console.error('Error importing lesson:', err);
                        alert('Ошибка при импорте урока');
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {tasks.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Заданий пока нет</p>
            ) : (
              <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' as any }}>
                <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                  {[...tasks]
                    .sort((a: any, b: any) => (a?.task_id || 0) - (b?.task_id || 0))
                    .map((task: any) => {
                      const isSelected = editingTask?.task_id === task.task_id;
                      return (
                        <button
                          key={task.task_id}
                          type="button"
                          onClick={() => setEditingTask(task)}
                          className={`w-[92px] h-[72px] rounded-2xl bg-white border-2 shadow-sm flex flex-col items-center justify-center leading-tight ${
                            isSelected ? 'border-blue-600' : 'border-gray-200'
                          }`}
                        >
                          <div className="text-base font-semibold text-gray-900">{task.task_id}</div>
                          <div className="text-xs text-gray-700">задание</div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Left Panel - Tasks List (desktop) */}
        <div className="hidden md:block w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Задания урока</h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadLessonJson}
                      className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer text-sm flex items-center gap-1.5"
                      title="Скачать урок (JSON)"
                    >
                      ⬇️ Экспорт
                    </button>
                    <label className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer text-sm">
                      📥 Импорт
                      <input
                        type="file"
                        accept=".json,.yaml,.yml"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          if (!confirm('Импорт из файла заменит все текущие данные урока. Продолжить?')) {
                            return;
                          }

                          try {
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('lessonId', lessonId);

                            const response = await fetch('/api/admin/lessons/import', {
                              method: 'POST',
                              body: formData,
                            });

                            const data = await response.json();

                            if (data.success) {
                              alert('Урок успешно импортирован!');
                              loadLesson(); // Reload lesson data
                            } else {
                              alert('Ошибка при импорте: ' + (data.error || 'Unknown error'));
                            }
                          } catch (err) {
                            console.error('Error importing lesson:', err);
                            alert('Ошибка при импорте урока');
                          }
                        }}
                      />
                    </label>
                  </div>
            </div>
            {tasks.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                Заданий пока нет
              </p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task: any) => {
                  const isSelected = editingTask?.task_id === task.task_id;
                  return (
                    <div
                      key={task.task_id}
                      onClick={() => setEditingTask(task)}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'bg-gray-50 border-2 border-transparent hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          Задание {task.task_id}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
                          {task.task_type || task.type || 'unknown'}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {typeof task.title === 'string' 
                          ? task.title 
                          : task.title?.ru || task.title?.en || 'Без названия'}
                      </h3>
                      {task.blocks && Array.isArray(task.blocks) && (
                        <p className="text-xs text-gray-500 mt-1">
                          {task.blocks.length} блоков
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Task Editor */}
        <div className="flex-1 md:overflow-y-auto overflow-visible">
          {editingTask ? (
            <TaskEditor
              task={editingTask}
              lessonDay={lesson.day_number}
              onSave={(task) => {
                handleSaveTask(task);
                // Keep editing the same task after save
                setEditingTask(task);
              }}
              onCancel={() => setEditingTask(null)}
            />
          ) : (
            <div className="flex items-center justify-center min-h-[240px] md:h-full text-gray-500 px-4 pb-8">
              <div className="text-center">
                <p className="text-lg mb-2">Выберите задание для редактирования</p>
                <p className="text-sm">или создайте новое задание</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Type Selection Modal */}
      {showTaskTypeModal && (
        <TaskTypeModal
          onSelect={handleCreateTask}
          onClose={() => setShowTaskTypeModal(false)}
        />
      )}

      {/* Generate Lesson Modal */}
      {showGenerateModal && lesson && (
        <GenerateLessonModal
          lessonId={lessonId}
          initialYamlContent={lesson.yaml_content}
          onApplyYamlContent={applyYamlContent}
          lessonDay={lesson.day_number || 1}
          topicRu={generateTopicRu}
          topicEn={generateTopicEn}
          onTopicRuChange={setGenerateTopicRu}
          onTopicEnChange={setGenerateTopicEn}
          onClose={() => {
            setShowGenerateModal(false);
            // Don't clear topic fields - keep them for next time
            setGenerateError('');
            setGenerateProgress({ step: '', progress: 0 });
          }}
          isGenerating={isGenerating}
          progress={generateProgress}
          error={generateError}
        />
      )}
    </div>
  );
}

// Generate Lesson Modal Component
function GenerateLessonModal({
  lessonId,
  initialYamlContent,
  onApplyYamlContent,
  lessonDay,
  topicRu,
  topicEn,
  onTopicRuChange,
  onTopicEnChange,
  onClose,
  isGenerating,
  progress,
  error,
}: {
  lessonId: string;
  initialYamlContent: any;
  onApplyYamlContent: (yamlContent: any) => Promise<void>;
  lessonDay: number;
  topicRu: string;
  topicEn: string;
  onTopicRuChange: (value: string) => void;
  onTopicEnChange: (value: string) => void;
  onClose: () => void;
  isGenerating: boolean;
  progress: { step: string; progress: number };
  error: string;
}) {
  // Determine phase based on day number
  const getPhase = (day: number): string => {
    if (day <= 10) return 'A1';
    if (day <= 30) return 'A2';
    if (day <= 50) return 'B1';
    return 'B2';
  };

  const phase = getPhase(lessonDay);

  const [draftYaml, setDraftYaml] = useState<any>(() => {
    try {
      return typeof initialYamlContent === 'string'
        ? JSON.parse(initialYamlContent || '{}')
        : initialYamlContent || {};
    } catch {
      return {};
    }
  });
  const [stepLoading, setStepLoading] = useState(false);
  const [stepError, setStepError] = useState('');
  const [lastGeneratedJson, setLastGeneratedJson] = useState<string>('');
  const [stepExtraInstructions, setStepExtraInstructions] = useState<string>('');
  const [selectedStepId, setSelectedStepId] = useState<'target' | 'task2' | 'task3' | 'task4' | 'task5' | 'task1'>(() => {
    if (typeof window === 'undefined') return 'target';
    try {
      const saved = window.sessionStorage.getItem(`gen_selected_step:${lessonId}`);
      if (saved === 'target' || saved === 'task2' || saved === 'task3' || saved === 'task4' || saved === 'task5' || saved === 'task1') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'target';
  });
  const [generatedByStep, setGeneratedByStep] = useState<
    Partial<Record<'target' | 'task2' | 'task3' | 'task4' | 'task5' | 'task1', string>>
  >({});

  const steps: Array<{ id: 'target' | 'task2' | 'task3' | 'task4' | 'task5' | 'task1'; label: string }> = [
    { id: 'target', label: 'Шаг 1: Целевая фраза (target phrase)' },
    // Note: follow methodology order (2 → 3 → 4 → 5 → 1)
    { id: 'task2', label: 'Урок 2: Задание 2 (Rules)' },
    { id: 'task3', label: 'Урок 3: Задание 3 (Listening)' },
    { id: 'task4', label: 'Урок 4: Задание 4 (Attention)' },
    { id: 'task5', label: 'Урок 5: Задание 5 (Writing/Speak)' },
    { id: 'task1', label: 'Урок 1: Задание 1 (Vocabulary) на базе 2–5' },
  ];

  const currentStep = steps.find((s) => s.id === selectedStepId) || steps[0];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(`gen_selected_step:${lessonId}`, selectedStepId);
    } catch {
      // ignore
    }
  }, [lessonId, selectedStepId]);

  const extractStepPayloadFromDraft = (
    yaml: any,
    stepId: 'target' | 'task2' | 'task3' | 'task4' | 'task5' | 'task1'
  ) => {
    const d = yaml && typeof yaml === 'object' ? yaml : {};
    if (stepId === 'target') {
      const tp = d?.day?.target_phrase;
      if (tp && typeof tp === 'object') return { target_phrase: tp };
      return null;
    }
    const taskIdMap: Record<string, number> = { task1: 1, task2: 2, task3: 3, task4: 4, task5: 5 };
    const tid = taskIdMap[stepId];
    const tasks = Array.isArray(d?.tasks) ? d.tasks : [];
    return tasks.find((t: any) => t?.task_id === tid) || null;
  };

  const isStepReady = (stepId: 'target' | 'task2' | 'task3' | 'task4' | 'task5' | 'task1') => {
    return !!extractStepPayloadFromDraft(draftYaml, stepId);
  };

  const runStep = async () => {
    if (!topicRu.trim() || !topicEn.trim()) {
      setStepError('Заполните тему (RU и EN) перед генерацией.');
      return;
    }
    setStepLoading(true);
    setStepError('');
    // Keep lastGeneratedJson so we can ask the API to generate a different alternative
    try {
      const variationToken = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const response = await fetch(`/api/admin/lessons/${lessonId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_ru: topicRu.trim(),
          topic_en: topicEn.trim(),
          step: currentStep.id,
          draft_lesson: draftYaml,
          extra_instructions: stepExtraInstructions,
          variation_token: variationToken,
          previous_output: lastGeneratedJson || '',
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Ошибка генерации шага');
      }

      setDraftYaml(data.merged_yaml_content);
      const generatedStr = JSON.stringify(data.generated, null, 2);
      setLastGeneratedJson(generatedStr);
      setGeneratedByStep((prev) => ({ ...prev, [currentStep.id]: generatedStr }));
      setSelectedStepId(currentStep.id);
    } catch (e: any) {
      setStepError(e?.message || 'Ошибка генерации шага');
    } finally {
      setStepLoading(false);
    }
  };

  const saveDraftToDb = async () => {
    setStepLoading(true);
    setStepError('');
    const keepStep = selectedStepId;
    try {
      await onApplyYamlContent(draftYaml);
      // Stay on the same step after save
      setSelectedStepId(keepStep);
    } catch (e: any) {
      setStepError(e?.message || 'Ошибка сохранения шага');
    } finally {
      setStepLoading(false);
    }
  };

  const runAllSteps = async () => {
    if (!topicRu.trim() || !topicEn.trim()) {
      setStepError('Заполните тему (RU и EN) перед генерацией.');
      return;
    }
    setStepLoading(true);
    setStepError('');
    setLastGeneratedJson('');
    try {
      let localDraft = draftYaml;
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        const variationToken = `${Date.now()}_${s.id}_${Math.random().toString(16).slice(2)}`;
        const prevForStep = generatedByStep[s.id] || '';
        const response = await fetch(`/api/admin/lessons/${lessonId}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic_ru: topicRu.trim(),
            topic_en: topicEn.trim(),
            step: s.id,
            draft_lesson: localDraft,
            extra_instructions: stepExtraInstructions,
            variation_token: variationToken,
            previous_output: prevForStep,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || `Ошибка генерации шага: ${s.id}`);
        }
        localDraft = data.merged_yaml_content;
        setDraftYaml(localDraft);
        const generatedStr = JSON.stringify(data.generated, null, 2);
        setLastGeneratedJson(generatedStr);
        setGeneratedByStep((prev) => ({ ...prev, [s.id]: generatedStr }));
        setSelectedStepId(s.id);
      }
      await onApplyYamlContent(localDraft);
    } catch (e: any) {
      setStepError(e?.message || 'Ошибка генерации');
    } finally {
      setStepLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-3 sm:mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">🤖 Сгенерировать урок</h2>
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold disabled:opacity-50"
            >
              &times;
            </button>
          </div>

          {/* Lesson Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">День урока</label>
                <input
                  type="text"
                  value={lessonDay}
                  disabled
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Фаза курса</label>
                <input
                  type="text"
                  value={phase}
                  disabled
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600"
                />
              </div>
            </div>
          </div>

          {/* Topic Inputs */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Тема урока (RU) *
            </label>
            <input
              type="text"
              value={topicRu}
              onChange={(e) => onTopicRuChange(e.target.value)}
              disabled={isGenerating}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Например: В магазине"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Тема урока (EN) *
            </label>
            <input
              type="text"
              value={topicEn}
              onChange={(e) => onTopicEnChange(e.target.value)}
              disabled={isGenerating}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="For example: In the shop"
            />
          </div>

          {/* Progress Bar */}
          {isGenerating && progress.step && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{progress.step}</span>
                <span className="text-sm text-gray-500">{progress.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Step-only mode (mobile-first) */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <div className="text-sm font-medium text-gray-900">Режим генерации</div>
                <div className="text-xs text-gray-500">
                  Цепочка: target → 2 → 3 → 4 → 5 → 1. Можно генерировать по одному шагу или сразу все.
                </div>
              </div>
            </div>

              {stepError && (
                <div className="mb-3 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                  <strong>Ошибка шага:</strong> {stepError}
                </div>
              )}

              <div className="mb-3">
                <div className="text-xs font-medium text-gray-700 mb-2">
                  Дополнительные инструкции (для одного шага и для «Все шаги»)
                </div>
                <textarea
                  value={stepExtraInstructions}
                  onChange={(e) => setStepExtraInstructions(e.target.value)}
                  disabled={stepLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  rows={3}
                  placeholder={`Например: Сделай целевую фразу более креативной и из ДВУХ предложений. Добавь немного разговорности.`}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Подсказка: можно уточнить стиль, длину (1–2 предложения), тон, пример, ограничения.
                </div>
              </div>

              {/* Step readiness + selector (mobile-friendly) */}
              <div className="mb-3">
                <div className="text-xs font-medium text-gray-700 mb-2">Готовность шагов</div>
                <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' as any }}>
                  <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
                    {steps.map((s) => {
                      const ready = isStepReady(s.id);
                      const active = selectedStepId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedStepId(s.id)}
                          className={`px-3 py-2 rounded-xl border text-sm flex items-center gap-2 ${
                            active ? 'border-blue-600 bg-white' : 'border-gray-200 bg-white'
                          }`}
                          style={{ minHeight: '44px' }}
                        >
                          <span
                            className="inline-flex items-center justify-center"
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '999px',
                              border: `2px solid ${ready ? '#34BF5D' : '#CED2D6'}`,
                              color: ready ? '#34BF5D' : '#CED2D6',
                              fontSize: '12px',
                              lineHeight: '18px',
                            }}
                          >
                            {ready ? '✓' : ''}
                          </span>
                          <span style={{ fontWeight: 600 }}>{s.id === 'target' ? 'target' : s.id.replace('task', '')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Actions (mobile layout like design) */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  type="button"
                  onClick={runStep}
                  disabled={stepLoading || !topicRu.trim() || !topicEn.trim()}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                >
                  Один шаг
                </button>
                <button
                  type="button"
                  onClick={runAllSteps}
                  disabled={isGenerating || stepLoading || !topicRu.trim() || !topicEn.trim()}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                  title="Сгенерировать все шаги подряд и сохранить"
                >
                  Все шаги
                </button>
              </div>

              {/* Result preview (tap pill to preview saved/merged draft) */}
              <div className="mt-2">
                <div className="text-sm font-semibold text-gray-900 mb-2">Результат генерации</div>
                <div className="text-sm text-gray-600 mb-2">{currentStep.label}</div>
                <pre className="text-xs bg-white border border-gray-200 rounded-lg p-3 overflow-auto max-h-56">
                  {JSON.stringify(extractStepPayloadFromDraft(draftYaml, selectedStepId) || {}, null, 2)}
                </pre>
                <button
                  type="button"
                  onClick={saveDraftToDb}
                  disabled={stepLoading}
                  className="mt-3 w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                  title="Сохранить текущий draft в урок"
                >
                  Сохранить
                </button>
              </div>
            </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              <strong>Ошибка:</strong> {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isGenerating || stepLoading}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Task Type Selection Modal
function TaskTypeModal({ onSelect, onClose }: { onSelect: (type: 'vocabulary' | 'rules' | 'listening' | 'attention' | 'writing') => void; onClose: () => void }) {
  const taskTypes = [
    {
      type: 'vocabulary' as const,
      title: 'Словарь',
      description: 'Блок с проигрыванием слов. Загрузи слова с аудио, транскрипцией и переводами.',
      icon: '📚',
    },
    {
      type: 'rules' as const,
      title: 'Правила и объяснения',
      description: 'Блоки с объяснениями, тестами и формами. Собирайте задания из готовых блоков.',
      icon: '📝',
    },
    {
      type: 'listening' as const,
      title: 'Аудирование',
      description: 'Слушай фразу и отвечай на вопросы. Проигрывание + варианты ответов.',
      icon: '🎧',
    },
    {
      type: 'attention' as const,
      title: 'Внимательность',
      description: 'Пойми, что здесь происходит. Аудио + вопросы с вариантами ответов.',
      icon: '👁️',
    },
    {
      type: 'writing' as const,
      title: 'Письмо',
      description: 'Напиши текст или скажи вслух. Шаблоны для заполнения или произнесения.',
      icon: '✍️',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Выберите тип задания</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {taskTypes.map((taskType) => (
            <button
              key={taskType.type}
              onClick={() => onSelect(taskType.type)}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
            >
              <div className="text-3xl mb-2">{taskType.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-1">{taskType.title}</h3>
              <p className="text-sm text-gray-600">{taskType.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}


export default function LessonEditorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Загрузка...</div>
      </div>
    }>
      <LessonEditorContent />
    </Suspense>
  );
}

