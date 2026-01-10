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
  const [editedBlock, setEditedBlock] = useState(block);

  useEffect(() => {
    setEditedBlock(block);
  }, [block]);

  const handleSave = () => {
    onSave(editedBlock);
  };

  const renderEditor = () => {
    // Support both old structure (type) and new structure (block_type)
    const blockType = editedBlock.block_type || editedBlock.type;
    
    switch (blockType) {
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
            <p className="text-gray-600">Редактор блока типа "{blockType}" еще не реализован</p>
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
              Редактирование блока: {blockKey} ({block.block_type || block.type})
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

