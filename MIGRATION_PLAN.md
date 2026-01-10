# План миграции: Чистый старт с сохранением фронтенда

## Цель
Создать новую CRM систему для управления курсом, при этом **сохранить все существующие компоненты фронтенда** без изменений.

## Ключевой принцип
**Новая структура БД → Трансформер → Старый формат для фронтенда**

Все компоненты фронтенда (VocabularyTask, RulesTask, ListeningTask, AttentionTask, WritingTask) остаются без изменений и получают данные в том же формате, что и сейчас.

---

## 1. Новая структура базы данных

### 1.1 Таблица `levels` (уровни/модули)
```sql
CREATE TABLE levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_number INTEGER NOT NULL UNIQUE,
  name_ru TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ru TEXT,
  description_en TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 1.2 Обновление таблицы `lessons`
```sql
-- Добавить новые колонки
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS level_id UUID REFERENCES levels(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS order_in_level INTEGER,
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Индексы
CREATE INDEX IF NOT EXISTS idx_lessons_level_id ON lessons(level_id);
CREATE INDEX IF NOT EXISTS idx_lessons_is_published ON lessons(is_published);
```

### 1.3 Таблица `audio_files` (для управления аудио)
```sql
CREATE TABLE audio_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  task_id INTEGER, -- номер задачи (1-5)
  block_id TEXT, -- идентификатор блока (например, "block_1", "word_1")
  item_id TEXT, -- идентификатор элемента (например, "example_1", "card_1")
  text_pt TEXT NOT NULL, -- португальский текст
  audio_url TEXT, -- URL в Supabase Storage
  storage_path TEXT, -- путь в storage
  generation_method TEXT DEFAULT 'tts', -- 'tts' или 'upload'
  generated_at TIMESTAMP WITH TIME ZONE,
  uploaded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audio_files_lesson_id ON audio_files(lesson_id);
CREATE INDEX IF NOT EXISTS idx_audio_files_text_pt ON audio_files(text_pt);
```

---

## 2. Новая структура данных в CRM

### 2.1 Структура урока в `yaml_content` (новая версия)
```json
{
  "day": {
    "title": { "ru": "...", "en": "..." },
    "subtitle": { "ru": "...", "en": "..." },
    "estimated_time": "15–25"
  },
  "tasks": [
    {
      "task_id": 1,
      "task_type": "listen_and_repeat", // или "speak_correctly", "understand_meaning", "choose_situation", "try_yourself"
      "title": { "ru": "...", "en": "..." },
      "subtitle": { "ru": "...", "en": "..." },
      "estimated_time": "≈10",
      "blocks": [
        {
          "block_id": "block_1",
          "block_type": "listen_and_repeat", // тип блока
          "content": { ... } // содержимое блока
        }
      ]
    }
  ]
}
```

### 2.2 Маппинг: Новая структура → Старая структура для фронтенда

**Трансформер** преобразует новую структуру в формат, понятный фронтенду:

```typescript
// Новая структура (CRM)
task_type: "listen_and_repeat"
blocks: [{ block_type: "listen_and_repeat", content: { cards: [...] } }]

// → Трансформируется в (для фронтенда)
type: "vocabulary"
content: { cards: [...] }
```

**Маппинг типов задач:**
- `listen_and_repeat` → `vocabulary` (если блок `listen_and_repeat`)
- `speak_correctly` → `rules` (если блоки `how_to_say`, `reinforcement`, `speak_out_loud`)
- `understand_meaning` → `listening_comprehension` (если блок `listen_phrase`)
- `choose_situation` → `attention` (если блок `check_meaning`)
- `try_yourself` → `writing_optional` (если блок `write_by_hand`)

---

## 3. Сохранение компонентов фронтенда

### 3.1 Компоненты остаются без изменений:
- ✅ `VocabularyTask.tsx` - ожидает `task.type === 'vocabulary'`, `task.content.cards`
- ✅ `RulesTask.tsx` - ожидает `task.type === 'rules'`, `task.structure.blocks_order`, `task.blocks`
- ✅ `ListeningTask.tsx` - ожидает `task.type === 'listening_comprehension'`, `task.items`
- ✅ `AttentionTask.tsx` - ожидает `task.type === 'attention'`, `task.items`
- ✅ `WritingTask.tsx` - ожидает `task.type === 'writing_optional'`, `task.main_task`

### 3.2 Трансформер в API
Создать функцию `transformLessonForFrontend(lesson)` которая:
1. Берет `lesson.yaml_content` (новая структура)
2. Преобразует задачи и блоки в старый формат
3. Возвращает структуру, понятную фронтенду

---

## 4. План миграции (Вариант B - Чистый старт)

### Этап 1: Подготовка
1. ✅ Экспортировать существующие уроки в JSON файлы (backup)
2. ✅ Создать скрипт миграции БД
3. ✅ Создать трансформер для совместимости
4. ✅ Определить файлы, которые можно трогать (курс) и нельзя (тренажер)

### Этап 2: Миграция БД
1. Создать таблицу `levels`
2. Добавить колонки в `lessons`
3. Создать таблицу `audio_files`
4. **Удалить все существующие уроки** (чистый старт)
5. Удалить связанные данные (`user_progress`, `task_progress`, `lesson_access_tokens`)

### Этап 3: CRM система
1. Создать API для уровней (CRUD)
2. Создать API для уроков (CRUD)
3. Создать UI для управления уровнями
4. Создать UI для создания/редактирования уроков
5. Создать редакторы блоков

### Этап 4: Аудио система
1. API для генерации аудио (Google TTS)
2. API для загрузки аудио файлов
3. UI кнопки в редакторах блоков
4. Интеграция с Supabase Storage

### Этап 5: Фронтенд
1. Обновить `/pt` для группировки по уровням
2. Добавить раскрывающиеся секции
3. Фильтрация опубликованных уроков
4. **Трансформер в API** для преобразования данных

---

## 5. Структура файлов

```
/database
  /migrations
    - 001_create_levels.sql
    - 002_update_lessons.sql
    - 003_create_audio_files.sql
    - 004_clean_start.sql (удаление старых данных)

/lib
  /transformers
    - lesson-transformer.ts (преобразование новой структуры в старую)

/app
  /api
    /admin
      /levels (CRUD)
      /lessons (CRUD)
      /audio (генерация и загрузка)
    /lessons
      - [id]/route.ts (с трансформером для фронтенда)

/components
  /admin
    /levels (редактор уровней)
    /lessons (редактор уроков)
    /blocks (редакторы блоков)
```

---

## 6. Важные моменты

### 6.1 Обратная совместимость
- Фронтенд **не знает** о новой структуре
- API преобразует данные перед отправкой на фронтенд
- Все компоненты работают как раньше

### 6.2 Аудио
- Аудио хранится в `audio_files` с ссылками на `phrases` таблицу
- При генерации/загрузке аудио создается запись в `audio_files`
- При трансформации урока аудио URL подставляются из `audio_files`

### 6.3 Экспорт/Импорт
- Можно экспортировать урок в JSON (новая структура)
- Можно импортировать JSON в CRM
- Парсер понимает и старую YAML структуру (для обратной совместимости), и новую JSON структуру

---

## 7. Порядок разработки

1. **Миграция БД** (создать таблицы, очистить данные)
2. **Трансформер** (функция преобразования)
3. **API для уровней** (CRUD)
4. **API для уроков** (CRUD + трансформер)
5. **CRM UI - Уровни** (создание, редактирование)
6. **CRM UI - Уроки** (базовая структура)
7. **CRM UI - Редакторы блоков** (постепенно)
8. **Аудио система** (генерация + загрузка)
9. **Фронтенд** (группировка по уровням)
10. **Тестирование** (создание урока через CRM → проверка на фронте)

---

## 8. Риски и митигация

| Риск | Митигация |
|------|-----------|
| Потеря данных при миграции | ✅ Экспорт в YAML перед удалением |
| Несовместимость форматов | ✅ Трансформер обеспечивает совместимость |
| Проблемы с аудио | ✅ Аудио хранится отдельно, можно перегенерировать |
| Сложность трансформации | ✅ Пошаговая разработка, тестирование на каждом этапе |

---

## Готов к началу разработки?

После подтверждения начну с:
1. Создания миграций БД
2. Создания трансформера
3. Базовой структуры CRM

