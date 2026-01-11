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

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Вы уверены, что хотите удалить пользователя "${userEmail}"? Это действие нельзя отменить.`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(`Пользователь ${userEmail} успешно удален`);
        loadUsers(); // Reload users list
      } else {
        setError(data.error || 'Ошибка при удалении пользователя');
      }
    } catch (err) {
      setError('Ошибка при удалении пользователя');
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
                  {(user.subscription_status !== 'active' && user.subscription_status !== 'paid') && (
                    <>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => handleGiveFullAccess(user.id)}
                        className="text-green-600 hover:text-green-800 font-medium"
                      >
                        Дать полный доступ
                      </button>
                    </>
                  )}
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => handleDeleteUser(user.id, user.email)}
                    className="text-red-600 hover:text-red-800 font-medium"
                  >
                    Удалить
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
  const [users, setUsers] = useState<any[]>([]);
  const [usersStats, setUsersStats] = useState<Map<string, any>>(new Map());
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingStats, setLoadingStats] = useState<Map<string, boolean>>(new Map());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (data.success) {
        const usersList = data.users || [];
        setUsers(usersList);
        // Load basic stats (started/completed counts) for all users immediately
        // so they can be shown in collapsed state
        usersList.forEach((user: any) => {
          loadUserStats(user.id, true); // true = load only basic stats
        });
      }
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadUserStats = async (userId: string, basicOnly: boolean = false) => {
    try {
      setLoadingStats(prev => new Map(prev).set(userId, true));
      const response = await fetch(`/api/admin/stats?userId=${userId}`);
      const data = await response.json();
      if (data.success && data.stats) {
        // If we already have stats for this user and we're loading basic stats,
        // merge them to preserve detailed stats if they exist
        if (basicOnly && usersStats.has(userId)) {
          const existingStats = usersStats.get(userId);
          setUsersStats(prev => new Map(prev).set(userId, {
            ...existingStats,
            startedLessons: data.stats.startedLessons,
            completedLessons: data.stats.completedLessons,
            totalLessons: data.stats.totalLessons,
          }));
        } else {
          setUsersStats(prev => new Map(prev).set(userId, data.stats));
        }
      } else {
        console.error('Failed to load stats for user:', userId, data);
      }
    } catch (err) {
      console.error('Error loading stats for user:', userId, err);
    } finally {
      setLoadingStats(prev => new Map(prev).set(userId, false));
    }
  };

  const toggleUserExpanded = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
      // Load full stats when expanding (including lessons details)
      // Basic stats (started/completed counts) should already be loaded
      const currentStats = usersStats.get(userId);
      if (!currentStats || !currentStats.lessons) {
        loadUserStats(userId, false); // false = load full stats including lessons
      }
    }
    setExpandedUsers(newExpanded);
  };

  if (loadingUsers) {
    return <div className="text-gray-600">Загрузка пользователей...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Статистика прохождения курса</h2>
      {users.length === 0 ? (
        <p className="text-gray-600">Нет пользователей</p>
      ) : (
        <div className="space-y-4">
          {users.map((user) => {
            const stats = usersStats.get(user.id);
            const isLoading = loadingStats.get(user.id);
            const isExpanded = expandedUsers.has(user.id);
            const subscriptionStatus = user.subscription_status || 'trial';
            const isFullAccess = subscriptionStatus === 'active' || subscriptionStatus === 'paid';

            // Get key stats for collapsed view
            const startedCount = stats?.startedLessons || 0;
            const completedCount = stats?.completedLessons || 0;

            return (
              <div key={user.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* Collapsed Header - Always Visible */}
                <div
                  onClick={() => toggleUserExpanded(user.id)}
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{user.email}</h3>
                      <div className="flex items-center gap-4 mt-2">
                        <span className={`text-sm font-medium ${
                          isFullAccess ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {isFullAccess ? 'Полный доступ' : 'Триал'}
                        </span>
                        <span className="text-sm text-gray-600">
                          Начато: <span className="font-semibold text-gray-900">{startedCount}</span>
                        </span>
                        <span className="text-sm text-gray-600">
                          Пройдено: <span className="font-semibold text-gray-900">{completedCount}</span>
                        </span>
                      </div>
                    </div>
                    <div className="text-gray-400">
                      {isExpanded ? '▼' : '▶'}
                    </div>
                  </div>
                </div>

                {/* Expanded Content - Only when expanded */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-6">
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <p className="text-sm text-gray-500">
                        Подписка: {subscriptionStatus} | 
                        Язык: {user.language_preference || 'ru'}
                      </p>
                    </div>

                    {isLoading ? (
                      <div className="text-gray-600">Загрузка статистики...</div>
                    ) : stats ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Всего уроков</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalLessons || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Начато</p>
                            <p className="text-2xl font-bold text-yellow-600">{stats.startedLessons || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Завершено</p>
                            <p className="text-2xl font-bold text-green-600">{stats.completedLessons || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Прогресс</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {stats.completedLessons > 0 && stats.totalLessons > 0 
                                ? Math.round((stats.completedLessons / stats.totalLessons) * 100) 
                                : 0}%
                            </p>
                          </div>
                        </div>

                        {stats.lessons && stats.lessons.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-3 text-gray-900">По урокам:</h4>
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
                                  {stats.lessons
                                    .filter((lesson: any) => lesson.status !== 'not_started')
                                    .map((lesson: any) => (
                                    <tr key={lesson.day_number || lesson.lesson_id}>
                                      <td className="px-4 py-2 text-sm text-gray-900">
                                        Урок {lesson.day_number || 'N/A'}
                                      </td>
                                      <td className="px-4 py-2 text-sm">
                                        <span className={`px-2 py-1 rounded text-xs ${
                                          lesson.status === 'completed' 
                                            ? 'bg-green-100 text-green-800'
                                            : lesson.status === 'in_progress'
                                            ? 'bg-yellow-100 text-yellow-800'
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
                                      <td className="px-4 py-2 text-sm text-gray-900">
                                        {lesson.completed_tasks || 0}/{lesson.total_tasks || 5}
                                      </td>
                                    </tr>
                                  ))}
                                  {stats.lessons.filter((lesson: any) => lesson.status !== 'not_started').length === 0 && (
                                    <tr>
                                      <td colSpan={5} className="px-4 py-4 text-center text-sm text-gray-500">
                                        Нет начатых уроков
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-600">Статистика не найдена</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
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
  const router = useRouter();
  const [lessons, setLessons] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null); // null = all lessons
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null);
  const [editingLesson, setEditingLesson] = useState<string | null>(null); // Store as JSON string for editing
  const [showCreateLevel, setShowCreateLevel] = useState(false);

  useEffect(() => {
    loadLevels();
    loadLessons();
  }, []);

  useEffect(() => {
    loadLessons();
  }, [selectedLevelId]);

  const loadLevels = async () => {
    try {
      const response = await fetch('/api/admin/levels');
      const data = await response.json();
      console.log('Levels API response:', data);
      if (data.success) {
        setLevels(data.levels || []);
        console.log('Levels loaded:', data.levels);
      } else {
        console.error('Failed to load levels:', data.error);
      }
    } catch (err) {
      console.error('Error loading levels:', err);
    }
  };

  const loadLessons = async () => {
    try {
      setLoading(true);
      const url = selectedLevelId 
        ? `/api/admin/lessons?level_id=${selectedLevelId}`
        : '/api/admin/lessons';
      const response = await fetch(url);
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

  const handleCreateLevel = async (levelData: any) => {
    try {
      const response = await fetch('/api/admin/levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(levelData),
      });

      const data = await response.json();
      if (data.success) {
        setShowCreateLevel(false);
        loadLevels();
      } else {
        alert('Ошибка при создании уровня: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Ошибка при создании уровня');
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Создание курса</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateLevel(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            + Создать уровень
          </button>
          <button
            onClick={() => router.push('/admin/lessons/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Создать урок
          </button>
        </div>
      </div>

      {/* Level Filter Tabs */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-sm text-gray-600 mr-2">Фильтр по уровням:</span>
        <button
          onClick={() => setSelectedLevelId(null)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedLevelId === null
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Все уроки
        </button>
        {levels.length === 0 ? (
          <span className="text-sm text-gray-500 italic">Уровни не созданы. Создайте первый уровень.</span>
        ) : (
          levels.map((level) => (
            <button
              key={level.id}
              onClick={() => setSelectedLevelId(level.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedLevelId === level.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {level.level_number} Уровень
            </button>
          ))
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                № УРОКА
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                НАЗВАНИЕ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                УРОВЕНЬ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ЗАДАНИЙ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ДЕЙСТВИЯ
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <select
                      value={lesson.level_id || ''}
                      onChange={async (e) => {
                        const newLevelId = e.target.value || null;
                        try {
                          const response = await fetch(`/api/admin/lessons/${lesson.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              level_id: newLevelId,
                            }),
                          });

                          const data = await response.json();
                          if (data.success) {
                            loadLessons();
                          } else {
                            alert('Ошибка при обновлении уровня: ' + (data.error || 'Unknown error'));
                          }
                        } catch (err) {
                          alert('Ошибка при обновлении уровня');
                        }
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                    >
                      <option value="">Нет уровня</option>
                      {levels.map((level) => (
                        <option key={level.id} value={level.id}>
                          {level.level_number} Уровень
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {tasks.length || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => router.push(`/admin/lessons/${lesson.id}/edit`)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Редактировать
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={async () => {
                        const newStatus = !lesson.is_published;
                        if (!confirm(`Урок будет ${newStatus ? 'опубликован' : 'скрыт'}. Продолжить?`)) {
                          return;
                        }
                        try {
                          const response = await fetch(`/api/admin/lessons/${lesson.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              is_published: newStatus,
                            }),
                          });

                          const data = await response.json();
                          if (data.success) {
                            loadLessons();
                          } else {
                            alert('Ошибка при обновлении статуса: ' + (data.error || 'Unknown error'));
                          }
                        } catch (err) {
                          alert('Ошибка при обновлении статуса');
                        }
                      }}
                      className={`text-sm ${lesson.is_published ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {lesson.is_published ? '✓ Опубликован' : 'Скрыт'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Level Modal */}
      {showCreateLevel && (
        <CreateLevelModal
          onSave={handleCreateLevel}
          onCancel={() => setShowCreateLevel(false)}
          existingLevels={levels}
        />
      )}
    </div>
  );
}

// Create Level Modal Component
function CreateLevelModal({ onSave, onCancel, existingLevels }: {
  onSave: (levelData: any) => void;
  onCancel: () => void;
  existingLevels: any[];
}) {
  const [levelNumber, setLevelNumber] = useState<string>('');
  const [nameRu, setNameRu] = useState<string>('');
  const [nameEn, setNameEn] = useState<string>('');
  const [descriptionRu, setDescriptionRu] = useState<string>('');
  const [descriptionEn, setDescriptionEn] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSave = () => {
    if (!levelNumber.trim()) {
      setError('Пожалуйста, укажите номер уровня');
      return;
    }

    if (!nameRu.trim() && !nameEn.trim()) {
      setError('Пожалуйста, укажите название уровня хотя бы на одном языке');
      return;
    }

    const existingNumbers = existingLevels.map(l => l.level_number);
    if (existingNumbers.includes(parseInt(levelNumber))) {
      setError(`Уровень с номером ${levelNumber} уже существует`);
      return;
    }

    onSave({
      level_number: parseInt(levelNumber),
      name_ru: nameRu.trim() || undefined,
      name_en: nameEn.trim() || undefined,
      description_ru: descriptionRu.trim() || undefined,
      description_en: descriptionEn.trim() || undefined,
      order_index: parseInt(levelNumber),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Создание уровня</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Номер уровня *
            </label>
            <input
              type="number"
              value={levelNumber}
              onChange={(e) => setLevelNumber(e.target.value)}
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
                value={nameRu}
                onChange={(e) => setNameRu(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Уровень 1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название (EN) *
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Level 1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Описание (RU)
              </label>
              <textarea
                value={descriptionRu}
                onChange={(e) => setDescriptionRu(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24"
                placeholder="Описание уровня..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Описание (EN)
              </label>
              <textarea
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24"
                placeholder="Level description..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Создать уровень
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

