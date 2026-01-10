'use client';

// Placeholder for Attention Task Editor
export default function AttentionTaskEditor({ task, onChange, lessonDay }: {
  task: any;
  onChange: (task: any) => void;
  lessonDay: number;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <p className="text-gray-600">Редактор задания типа "attention" будет реализован в следующем шаге.</p>
    </div>
  );
}

