# Subscription Course Module

Модуль обучения португальскому языку по подписке на 60 дней.

## Структура

### Страницы

- `/pt` - Лендинг с формой регистрации по email
- `/pt/lesson/[day]/[token]` - Страница урока с заданиями

### Компоненты

- `components/subscription/LessonContent.tsx` - Основной контейнер урока
- `components/subscription/TaskCard.tsx` - Карточка задания
- `components/subscription/ProgressBar.tsx` - Индикатор прогресса
- `components/subscription/AudioPlayer.tsx` - Проигрыватель аудио
- `components/subscription/tasks/` - Компоненты заданий:
  - `VocabularyTask.tsx` - Слова и фразы
  - `RulesTask.tsx` - Правила грамматики
  - `ListeningTask.tsx` - Понимание на слух
  - `AttentionTask.tsx` - Внимательность
  - `WritingTask.tsx` - Письмо (опционально)

### API Routes

- `/api/subscription/register` - Регистрация email и создание trial подписки

### База данных

Схема находится в `database/subscription-schema.sql`. Таблицы:

- `subscription_users` - Пользователи (email-based)
- `subscriptions` - Подписки (trial/active/expired)
- `lessons` - 60 уроков курса
- `user_progress` - Прогресс пользователя по урокам
- `task_progress` - Прогресс по отдельным заданиям
- `lesson_access_tokens` - Уникальные токены для email-ссылок
- `email_logs` - Логи отправленных писем

## Установка

1. **Создать таблицы в Supabase:**

```sql
-- Запустить database/subscription-schema.sql в Supabase SQL Editor
```

2. **Установить зависимости:**

```bash
npm install
```

3. **Импортировать уроки из YAML:**

```bash
node scripts/import-lessons.js
```

Уроки должны находиться в `Subsription/1 Day/` в формате `day_XX.yaml`.

## Формат YAML урока

```yaml
day:
  number: 1
  title: "Знакомство"
  subtitle: "Первые фразы"
  estimated_time: "15–25 минут"

tasks:
  - task_id: 1
    type: "vocabulary"
    title: "Слова и фразы"
    # ... контент задания
```

## Типы заданий

1. **vocabulary** - Слова и фразы с аудио
2. **rules** - Правила грамматики с вопросами
3. **listening_comprehension** - Понимание на слух
4. **attention** - Внимательность к контексту
5. **writing_optional** - Письмо (опционально)

## Процесс регистрации

1. Пользователь вводит email на `/pt`
2. Создается пользователь и trial подписка (3 дня)
3. Генерируется токен доступа к первому уроку
4. TODO: Отправка email с ссылкой на урок

## Отслеживание прогресса

- Каждое задание отслеживается в `task_progress`
- Прогресс урока обновляется в `user_progress`
- Следующее задание разблокируется только после завершения предыдущего

## TODO

- [ ] Интеграция с email сервисом (SendGrid/Resend) для отправки уроков
- [ ] Система оплаты через Stripe для продления подписки
- [ ] Генерация аудио для фраз из vocabulary заданий
- [ ] Мотивационные письма для неактивных пользователей
- [ ] Аналитика прогресса пользователей

## Примечания

- Модуль полностью изолирован от основного тренажера
- Использует существующий функционал проигрывания аудио
- Поддерживает переводы на RU/EN/PT







