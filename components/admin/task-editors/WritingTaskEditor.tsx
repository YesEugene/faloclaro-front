'use client';

// Placeholder for Writing Task Editor
export default function WritingTaskEditor({ task, onChange, lessonDay }: {
  task: any;
  onChange: (task: any) => void;
  lessonDay: number;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <p className="text-gray-600">Редактор задания типа "writing" будет реализован в следующем шаге.</p>
    </div>
  );
}

