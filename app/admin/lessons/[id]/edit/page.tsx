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
      const response = await fetch(`/api/admin/lessons`);
      const data = await response.json();
      if (data.success) {
        const foundLesson = data.lessons.find((l: any) => l.id === parseInt(lessonId));
        if (foundLesson) {
          setLesson(foundLesson);
          const yamlContent = foundLesson.yaml_content || {};
          setTasks(yamlContent.tasks || []);
        }
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

  if (editingTask) {
    return (
      <TaskEditor
        task={editingTask}
        lessonDay={lesson.day_number}
        onSave={(task) => {
          handleSaveTask(task);
        }}
        onCancel={() => setEditingTask(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
                Редактирование урока {lesson.day_number}: {lesson.title_ru}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Задания</h2>
            <button
              onClick={() => setShowTaskTypeModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Создать задание
            </button>
          </div>

          {tasks.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              Заданий пока нет. Создайте первое задание.
            </p>
          ) : (
            <div className="space-y-4">
              {tasks.map((task: any) => (
                <div
                  key={task.task_id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                          Задание {task.task_id}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                          {task.type}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900">
                        {typeof task.title === 'string' 
                          ? task.title 
                          : task.title?.ru || task.title?.en || 'Без названия'}
                      </h3>
                      {task.subtitle && (
                        <p className="text-sm text-gray-600 mt-1">
                          {typeof task.subtitle === 'string' 
                            ? task.subtitle 
                            : task.subtitle?.ru || task.subtitle?.en || ''}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingTask(task)}
                        className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.task_id)}
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
      </main>

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

