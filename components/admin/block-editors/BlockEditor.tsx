'use client';

import { useState, useEffect } from 'react';
import ExplanationBlockEditor from './ExplanationBlockEditor';
import ComparisonBlockEditor from './ComparisonBlockEditor';
import ReinforcementBlockEditor from './ReinforcementBlockEditor';
import SpeakOutLoudBlockEditor from './SpeakOutLoudBlockEditor';

interface BlockEditorProps {
  blockKey: string;
  block: any;
  lessonDay: number;
  onSave: (block: any) => void;
  onCancel: () => void;
}

export default function BlockEditor({ blockKey, block, lessonDay, onSave, onCancel }: BlockEditorProps) {
  // Initialize with empty block structure if block is null/undefined
  const initialBlock = block || {
    block_id: blockKey || 'unknown',
    block_type: 'explanation',
    content: {},
  };
  
  const [editedBlock, setEditedBlock] = useState(initialBlock);

  useEffect(() => {
    // Update editedBlock when block prop changes, but ensure it's a valid object
    if (block && typeof block === 'object') {
      setEditedBlock(block);
    } else if (!block) {
      setEditedBlock(initialBlock);
    }
  }, [block]);

  const handleSave = () => {
    if (!editedBlock || typeof editedBlock !== 'object') {
      console.error('Cannot save: editedBlock is not a valid object', editedBlock);
      alert('Ошибка: блок имеет неверную структуру');
      return;
    }
    onSave(editedBlock);
  };

  const renderEditor = () => {
    // Ensure editedBlock is valid
    if (!editedBlock || typeof editedBlock !== 'object') {
      return (
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-red-600">Ошибка: блок имеет неверную структуру</p>
          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded">
            {JSON.stringify(editedBlock, null, 2)}
          </pre>
        </div>
      );
    }

    // Support both old structure (type) and new structure (block_type)
    const blockType = editedBlock.block_type || editedBlock.type || 'explanation';
    
    // Ensure blockType is a string, not an object
    const normalizedBlockType = typeof blockType === 'string' ? blockType : 'explanation';
    
    switch (normalizedBlockType) {
      case 'how_to_say':
      case 'explanation':
        return (
          <ExplanationBlockEditor
            block={editedBlock}
            onChange={setEditedBlock}
            lessonDay={lessonDay}
          />
        );
      case 'comparison':
        return (
          <ComparisonBlockEditor
            block={editedBlock}
            onChange={setEditedBlock}
            lessonDay={lessonDay}
          />
        );
      case 'reinforcement':
        return (
          <ReinforcementBlockEditor
            block={editedBlock}
            onChange={setEditedBlock}
            lessonDay={lessonDay}
          />
        );
      case 'speak_out_loud':
        return (
          <SpeakOutLoudBlockEditor
            block={editedBlock}
            onChange={setEditedBlock}
            lessonDay={lessonDay}
          />
        );
      default:
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600">Редактор блока типа "{normalizedBlockType}" еще не реализован</p>
            <p className="text-sm text-gray-500 mt-2">Доступные типы: explanation, comparison, reinforcement, speak_out_loud</p>
            <pre className="mt-4 text-xs bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(editedBlock, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">
              Редактирование блока: {blockKey || 'unknown'}{' '}
              ({(() => {
                if (!editedBlock || typeof editedBlock !== 'object') return 'unknown';
                const blockType = editedBlock.block_type || editedBlock.type;
                return typeof blockType === 'string' ? blockType : (typeof blockType === 'object' ? JSON.stringify(blockType) : 'unknown');
              })()})
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

