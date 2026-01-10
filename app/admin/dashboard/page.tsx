'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'users' | 'stats' | 'payments' | 'lessons'>('users');

  const handleLogout = () => {
    localStorage.removeItem('admin_authenticated');
    localStorage.removeItem('admin_auth_time');
    router.push('/admin');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/Img/Logo FaloClaro.svg"
                alt="FaloClaro"
                width={120}
                height={40}
                className="h-8 w-auto"
              />
              <h1 className="text-xl font-bold text-gray-900">Админ-панель</h1>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Пользователи
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stats'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Статистика
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'payments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Оплаты
            </button>
            <button
              onClick={() => setActiveTab('lessons')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'lessons'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Уроки
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'users' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Пользователи</h2>
            <UsersSection />
          </div>
        )}
        {activeTab === 'stats' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Статистика прохождения</h2>
            <StatsSection />
          </div>
        )}
        {activeTab === 'payments' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Оплаты</h2>
            <PaymentsSection />
          </div>
        )}
        {activeTab === 'lessons' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Редактирование уроков</h2>
            <LessonsSection />
          </div>
        )}
      </main>
    </div>
  );
}

// Users Section Component
function UsersSection() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserLanguage, setNewUserLanguage] = useState('ru');
  const [giveFullAccess, setGiveFullAccess] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserEmail,
          language: newUserLanguage,
          giveFullAccess,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(`Пользователь ${newUserEmail} успешно добавлен. Email отправлен.`);
        setNewUserEmail('');
        setShowAddUser(false);
        loadUsers();
      } else {
        setError(data.error || 'Ошибка при добавлении пользователя');
      }
    } catch (err) {
      setError('Ошибка при добавлении пользователя');
    }
  };

  const handleSendInvite = async (userId: string) => {
    try {
      setError('');
      setSuccess('');
      const response = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Приглашение отправлено');
      } else {
        setError(data.error || 'Ошибка при отправке приглашения');
      }
    } catch (err) {
      setError('Ошибка при отправке приглашения');
    }
  };

  const handleGiveFullAccess = async (userId: string) => {
    if (!confirm('Дать пользователю полный доступ ко всем урокам (1-60) бесплатно?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      const response = await fetch('/api/admin/users/give-full-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(`Полный доступ предоставлен. Создано токенов: ${data.tokensCreated || 0}`);
        loadUsers(); // Reload users to refresh data
      } else {
        setError(data.error || 'Ошибка при предоставлении полного доступа');
      }
    } catch (err) {
      setError('Ошибка при предоставлении полного доступа');
    }
  };

  if (loading) {
    return <div className="text-gray-600">Загрузка пользователей...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-gray-600">Всего пользователей: {users.length}</p>
        <button
          onClick={() => setShowAddUser(!showAddUser)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Добавить пользователя
        </button>
      </div>

      {showAddUser && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Добавить нового пользователя</h3>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Язык интерфейса
              </label>
              <select
                value={newUserLanguage}
                onChange={(e) => setNewUserLanguage(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="fullAccess"
                checked={giveFullAccess}
                onChange={(e) => setGiveFullAccess(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="fullAccess" className="ml-2 block text-sm text-gray-700">
                Дать полный доступ ко всем урокам бесплатно
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Добавить и отправить email
              </button>
              <button
                type="button"
                onClick={() => setShowAddUser(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Язык
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Подписка
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Дата регистрации
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.language_preference || 'ru'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.subscription_status || 'trial'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button
                    onClick={() => handleSendInvite(user.id)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Отправить приглашение
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => handleGiveFullAccess(user.id)}
                    className="text-green-600 hover:text-green-800 font-medium"
                  >
                    Дать полный доступ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Stats Section Component
function StatsSection() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadUserStats(selectedUserId);
    }
  }, [selectedUserId]);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async (userId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/stats?userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !selectedUserId) {
    return <div className="text-gray-600">Загрузка пользователей...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Выберите пользователя
        </label>
        <select
          value={selectedUserId || ''}
          onChange={(e) => setSelectedUserId(e.target.value || null)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
        >
          <option value="">-- Выберите пользователя --</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.email}
            </option>
          ))}
        </select>
      </div>

      {selectedUserId && loading ? (
        <div className="text-gray-600">Загрузка статистики...</div>
      ) : selectedUserId && stats ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Статистика прохождения курса</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Всего уроков: {stats.totalLessons || 0}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Начато уроков: {stats.startedLessons || 0}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Завершено уроков: {stats.completedLessons || 0}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Прогресс: {stats.completedLessons > 0 && stats.totalLessons > 0 
                  ? Math.round((stats.completedLessons / stats.totalLessons) * 100) 
                  : 0}%
              </p>
            </div>

            {stats.lessons && stats.lessons.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">По урокам:</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Урок
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Статус
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Дата начала
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Дата завершения
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Заданий завершено
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stats.lessons.map((lesson: any) => (
                        <tr key={lesson.day_number}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            Урок {lesson.day_number}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${
                              lesson.status === 'completed' 
                                ? 'bg-green-100 text-green-800'
                                : lesson.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {lesson.status === 'completed' ? 'Завершено' :
                               lesson.status === 'in_progress' ? 'В процессе' : 'Не начато'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {lesson.started_at ? new Date(lesson.started_at).toLocaleDateString('ru-RU') : '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {lesson.completed_at ? new Date(lesson.completed_at).toLocaleDateString('ru-RU') : '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {lesson.completed_tasks || 0} / {lesson.total_tasks || 5}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : selectedUserId ? (
        <div className="text-gray-600">Статистика не найдена</div>
      ) : null}
    </div>
  );
}

// Payments Section Component
function PaymentsSection() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/payments');
      const data = await response.json();
      if (data.success) {
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error('Error loading payments:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-gray-600">Загрузка оплат...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-gray-600">Всего оплат: {payments.length}</p>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Сумма
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Статус
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Дата оплаты
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stripe ID
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  Нет данных об оплатах
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.user_email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.amount ? `${payment.amount / 100} ${payment.currency || 'EUR'}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      payment.status === 'paid' 
                        ? 'bg-green-100 text-green-800'
                        : payment.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {payment.status === 'paid' ? 'Оплачено' :
                       payment.status === 'pending' ? 'Ожидает' : payment.status || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payment.created_at ? new Date(payment.created_at).toLocaleDateString('ru-RU') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">
                    {payment.stripe_payment_intent_id || payment.stripe_session_id || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Lessons Section Component
function LessonsSection() {
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null);
  const [editingLesson, setEditingLesson] = useState<string | null>(null); // Store as JSON string for editing

  useEffect(() => {
    loadLessons();
  }, []);

  const loadLessons = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/lessons');
      const data = await response.json();
      if (data.success) {
        setLessons(data.lessons || []);
      }
    } catch (err) {
      console.error('Error loading lessons:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditLesson = (lesson: any) => {
    setSelectedLesson(lesson);
    // Convert yaml_content to JSON string for editing
    const yamlContent = lesson.yaml_content || {};
    setEditingLesson(JSON.stringify(yamlContent, null, 2));
  };

  const handleSaveLesson = async () => {
    if (!selectedLesson || !editingLesson) return;

    // Validate JSON before saving
    let parsedContent;
    try {
      if (typeof editingLesson === 'string') {
        parsedContent = JSON.parse(editingLesson);
      } else {
        parsedContent = editingLesson;
      }
    } catch (err) {
      alert('Ошибка: Неверный формат JSON. Проверьте синтаксис.');
      return;
    }

    try {
      const response = await fetch(`/api/admin/lessons/${selectedLesson.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yaml_content: parsedContent,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert('Урок успешно обновлен');
        setSelectedLesson(null);
        setEditingLesson(null);
        loadLessons();
      } else {
        alert('Ошибка при обновлении урока: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Ошибка при обновлении урока');
    }
  };

  if (loading) {
    return <div className="text-gray-600">Загрузка уроков...</div>;
  }

  if (selectedLesson && editingLesson) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Редактирование урока {selectedLesson.day_number}</h3>
          <div className="flex gap-2">
            <button
              onClick={handleSaveLesson}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Сохранить
            </button>
            <button
              onClick={() => {
                setSelectedLesson(null);
                setEditingLesson(null);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Содержимое урока (JSON)
            </label>
            <textarea
              value={editingLesson || ''}
              onChange={(e) => {
                // Store as string for editing, parse on save
                setEditingLesson(e.target.value);
              }}
              className="w-full h-96 px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm text-black"
              style={{ fontFamily: 'monospace' }}
            />
            <p className="text-xs text-gray-500 mt-2">
              Внимание: Изменения в формате JSON. Убедитесь в корректности синтаксиса перед сохранением.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveLesson}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Сохранить
            </button>
            <button
              onClick={() => {
                setSelectedLesson(null);
                setEditingLesson(null);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                № Урока
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Название
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Заданий
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {lessons.map((lesson) => {
              const yamlContent = typeof lesson.yaml_content === 'string' 
                ? JSON.parse(lesson.yaml_content || '{}')
                : lesson.yaml_content || {};
              const dayInfo = yamlContent.day || {};
              const tasks = yamlContent.tasks || [];

              return (
                <tr key={lesson.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lesson.day_number}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {dayInfo.title?.ru || dayInfo.title || 'Без названия'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {tasks.length || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleEditLesson(lesson)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Редактировать
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

