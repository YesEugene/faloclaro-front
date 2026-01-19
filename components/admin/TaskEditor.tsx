'use client';

import { useState, useEffect } from 'react';
import VocabularyTaskEditor from './task-editors/VocabularyTaskEditor';
import RulesTaskEditor from './task-editors/RulesTaskEditor';
import ListeningTaskEditor from './task-editors/ListeningTaskEditor';
import AttentionTaskEditor from './task-editors/AttentionTaskEditor';
import WritingTaskEditor from './task-editors/WritingTaskEditor';

interface TaskEditorProps {
  task: any;
  lessonDay: number;
  onSave: (task: any) => void;
  onCancel: () => void;
}

export default function TaskEditor({ task, lessonDay, onSave, onCancel }: TaskEditorProps) {
  const [editedTask, setEditedTask] = useState(task);

  useEffect(() => {
    setEditedTask(task);
  }, [task]);

  const handleSave = () => {
    onSave(editedTask);
  };

  const renderEditor = () => {
    switch (editedTask.type) {
      case 'vocabulary':
        return <VocabularyTaskEditor task={editedTask} onChange={setEditedTask} lessonDay={lessonDay} />;
      case 'rules':
        return <RulesTaskEditor task={editedTask} onChange={setEditedTask} lessonDay={lessonDay} />;
      case 'listening_comprehension':
      case 'listening':
        return <ListeningTaskEditor task={editedTask} onChange={setEditedTask} lessonDay={lessonDay} />;
      case 'attention':
        return <AttentionTaskEditor task={editedTask} onChange={setEditedTask} lessonDay={lessonDay} />;
      case 'writing_optional':
      case 'writing':
        return <WritingTaskEditor task={editedTask} onChange={setEditedTask} lessonDay={lessonDay} />;
      default:
        return <div className="text-gray-600">Редактор для типа "{editedTask.type}" еще не реализован</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 md:sticky md:top-[88px] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">
              Редактирование задания {editedTask.task_id} ({editedTask.type})
            </h1>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Сохранить
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderEditor()}
      </main>
    </div>
  );
}




