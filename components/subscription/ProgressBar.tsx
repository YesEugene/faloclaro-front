'use client';

interface ProgressBarProps {
  completed: number;
  total: number;
  tasks: any[];
  getTaskProgress: (taskId: number) => any;
}

export default function ProgressBar({ completed, total, tasks, getTaskProgress }: ProgressBarProps) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="space-y-2">
      {/* Progress Text */}
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600">
          {completed} / {total} {completed === 1 ? 'задание' : 'заданий'}
        </span>
        <span className="text-gray-600">{Math.round(percentage)}%</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Task Indicators */}
      {tasks.length > 0 && (
        <div className="flex gap-2 mt-3">
          {tasks.map((task, index) => {
            const progress = getTaskProgress(task.task_id);
            const isCompleted = progress?.status === 'completed';
            const isCurrent = index === Math.floor((completed / total) * tasks.length);
            
            return (
              <div
                key={task.task_id}
                className={`flex-1 h-1 rounded ${
                  isCompleted
                    ? 'bg-green-500'
                    : isCurrent
                    ? 'bg-blue-500'
                    : 'bg-gray-300'
                }`}
                title={task.title}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

