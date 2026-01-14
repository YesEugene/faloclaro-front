'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function MethodologiesPage() {
  const router = useRouter();
  const [courseMethodology, setCourseMethodology] = useState('');
  const [lessonMethodology, setLessonMethodology] = useState('');
  const [vocabulary, setVocabulary] = useState<{ used_words: string[] }>({ used_words: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadMethodologies();
  }, []);

  const loadMethodologies = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/methodologies');
      const data = await response.json();

      if (data.success && data.methodologies) {
        data.methodologies.forEach((m: any) => {
          if (m.type === 'course') {
            setCourseMethodology(m.content);
          } else if (m.type === 'lesson') {
            setLessonMethodology(m.content);
          } else if (m.type === 'vocabulary') {
            try {
              const vocabContent = typeof m.content === 'string' ? JSON.parse(m.content) : m.content;
              setVocabulary(vocabContent);
            } catch (e) {
              console.error('Error parsing vocabulary:', e);
              setVocabulary({ used_words: [] });
            }
          }
        });
      }
    } catch (err) {
      console.error('Error loading methodologies:', err);
      setError('Ошибка при загрузке методологий');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncVocabulary = async () => {
    try {
      setSyncing(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/admin/methodologies/sync-vocabulary', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Словарь синхронизирован! Обработано уроков: ${data.stats.processedLessons}, найдено уникальных слов: ${data.stats.uniqueWords}`);
        setTimeout(() => setSuccess(''), 5000);
        // Reload vocabulary
        await loadMethodologies();
      } else {
        setError(data.error || 'Ошибка при синхронизации словаря');
      }
    } catch (err) {
      console.error('Error syncing vocabulary:', err);
      setError('Ошибка при синхронизации словаря');
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async (type: 'course' | 'lesson') => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const content = type === 'course' ? courseMethodology : lessonMethodology;
      
      const response = await fetch('/api/admin/methodologies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, content }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`${type === 'course' ? 'Методология курса' : 'Методология урока'} успешно сохранена!`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Ошибка при сохранении');
      }
    } catch (err) {
      console.error('Error saving methodology:', err);
      setError('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Загрузка...</div>
      </div>
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
              <h1 className="text-xl font-bold text-gray-900">Методологии</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Course Methodology */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Методология курса</h2>
          <textarea
            value={courseMethodology}
            onChange={(e) => setCourseMethodology(e.target.value)}
            className="w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm"
            placeholder="Опишите философию и траекторию курса..."
          />
          <button
            onClick={() => handleSave('course')}
            disabled={saving}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Сохранение...' : 'Сохранить методологию курса'}
          </button>
        </div>

        {/* Lesson Methodology */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Методология урока</h2>
          <textarea
            value={lessonMethodology}
            onChange={(e) => setLessonMethodology(e.target.value)}
            className="w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm"
            placeholder="Опишите структуру урока, правила создания заданий..."
          />
          <button
            onClick={() => handleSave('lesson')}
            disabled={saving}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Сохранение...' : 'Сохранить методологию урока'}
          </button>
        </div>

        {/* Vocabulary (Read-only) */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Глобальный словарь (автоматически обновляется)</h2>
            <button
              onClick={handleSyncVocabulary}
              disabled={syncing}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {syncing ? 'Синхронизация...' : '🔄 Синхронизировать из всех уроков'}
            </button>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">
              Использовано слов: <strong>{vocabulary.used_words?.length || 0}</strong>
            </p>
            <div className="max-h-64 overflow-y-auto">
              {vocabulary.used_words && vocabulary.used_words.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {vocabulary.used_words.map((word, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Словарь пуст</p>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Этот список автоматически обновляется после сохранения каждого урока, добавляя слова из задания 1 (Словарь).
            При удалении урока слова также автоматически удаляются из словаря.
          </p>
        </div>
      </main>
    </div>
  );
}

