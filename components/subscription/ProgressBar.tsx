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
      {/* Progress Text - reduced by 3px */}
      <div className="flex justify-between items-center" style={{ fontSize: '10px' }}>
        <span className="text-gray-600">
          {completed} / {total} {completed === 1 ? 'задание' : 'заданий'}
        </span>
        <span className="text-gray-600">{Math.round(percentage)}%</span>
      </div>

      {/* Progress Bar - Green, 4px thick */}
      <div className="w-full bg-gray-200 rounded-full" style={{ height: '4px' }}>
        <div
          className="rounded-full transition-all duration-300"
          style={{ 
            width: `${percentage}%`, 
            height: '4px',
            backgroundColor: '#2FCD29'
          }}
        />
      </div>
    </div>
  );
}

