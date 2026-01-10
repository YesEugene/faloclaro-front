'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function NewLessonPage() {
  const router = useRouter();
  const [dayNumber, setDayNumber] = useState<string>('');
  const [titleRu, setTitleRu] = useState<string>('');
  const [titleEn, setTitleEn] = useState<string>('');
  const [subtitleRu, setSubtitleRu] = useState<string>('');
  const [subtitleEn, setSubtitleEn] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleCreate = async () => {
    if (!dayNumber.trim()) {
      setError('Пожалуйста, укажите номер урока');
      return;
    }

    if (!titleRu.trim() && !titleEn.trim()) {
      setError('Пожалуйста, укажите название урока хотя бы на одном языке');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Create yaml_content structure
      const yamlContent = {
        day: {
          title: { ru: titleRu.trim() || undefined, en: titleEn.trim() || undefined },
          subtitle: { ru: subtitleRu.trim() || undefined, en: subtitleEn.trim() || undefined },
        },
        estimated_time: '15–25',
        tasks: [],
      };

      // Create lesson via API
      const response = await fetch('/api/admin/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_number: parseInt(dayNumber),
          title_ru: titleRu.trim() || undefined,
          title_en: titleEn.trim() || undefined,
          yaml_content: yamlContent,
        }),
      });

      const data = await response.json();
      if (data.success && data.lesson) {
        // Redirect to edit page
        router.push(`/admin/lessons/${data.lesson.id}/edit`);
      } else {
        setError(data.error || 'Ошибка при создании урока');
      }
    } catch (err) {
      console.error('Error creating lesson:', err);
      setError('Ошибка при создании урока');
    } finally {
      setLoading(false);
    }
  };

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
              <h1 className="text-xl font-bold text-gray-900">Создание нового урока</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Основная информация</h2>
            
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Номер урока *
                </label>
                <input
                  type="number"
                  value={dayNumber}
                  onChange={(e) => setDayNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="1"
                  min="1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Название (RU) *
                  </label>
                  <input
                    type="text"
                    value={titleRu}
                    onChange={(e) => setTitleRu(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Знакомство"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Название (EN) *
                  </label>
                  <input
                    type="text"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Introduction"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Подзаголовок (RU)
                  </label>
                  <input
                    type="text"
                    value={subtitleRu}
                    onChange={(e) => setSubtitleRu(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Познакомься с португальским"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Подзаголовок (EN)
                  </label>
                  <input
                    type="text"
                    value={subtitleEn}
                    onChange={(e) => setSubtitleEn(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Get to know Portuguese"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Создание...' : 'Создать урок'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

