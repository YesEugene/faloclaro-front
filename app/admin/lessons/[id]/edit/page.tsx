'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import TaskEditor from '@/components/admin/TaskEditor';

function LessonEditorContent() {
  const params = useParams();
  const router = useRouter();
  const lessonId = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [showTaskTypeModal, setShowTaskTypeModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);

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
        // Parse yaml_content if it's a string
        const yamlContent = typeof data.lesson.yaml_content === 'string' 
          ? JSON.parse(data.lesson.yaml_content || '{}')
          : data.lesson.yaml_content || {};
        setTasks(yamlContent.tasks || []);
      } else {
        console.error('Failed to load lesson:', data);
      }
    } catch (err) {
      console.error('Error loading lesson:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = (taskType: 'vocabulary' | 'rules' | 'listening' | 'attention' | 'writing') => {
    setShowTaskTypeModal(false);
    // Create new task based on type
    const newTask: any = {
      task_id: tasks.length + 1,
      type: taskType,
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

    // Sort by task_id
    updatedTasks.sort((a, b) => (a.task_id || 0) - (b.task_id || 0));

    setTasks(updatedTasks);

    // Update lesson in database
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
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
              <h1 className="text-xl font-bold text-gray-900">
                Урок {lesson.day_number}: {lesson.title_ru}
              </h1>
            </div>
            <button
              onClick={() => setShowTaskTypeModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Создать задание
            </button>
          </div>
        </div>
      </header>

      {/* Two-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Tasks List */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Задания урока</h2>
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
        <div className="flex-1 overflow-y-auto">
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
            <div className="flex items-center justify-center h-full text-gray-500">
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

