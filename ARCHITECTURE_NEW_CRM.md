# Архитектура новой CRM системы

## Принцип работы: Трансформер для совместимости

```
CRM (новая структура) → Трансформер → Фронтенд (старая структура)
```

Все компоненты фронтенда остаются **без изменений**.

---

## 1. Структура данных

### 1.1 Новая структура в CRM (yaml_content - JSON формат)

**Важно:** Используем JSON вместо YAML для простоты работы в CRM.

```json
{
  "day": {
    "title": { "ru": "Знакомство", "en": "Acquaintance" },
    "subtitle": { "ru": "...", "en": "..." },
    "estimated_time": "15–25"
  },
  "tasks": [
    {
      "task_id": 1,
      "task_type": "listen_and_repeat",
      "title": { "ru": "Слова и фразы", "en": "Words and phrases" },
      "subtitle": { "ru": "...", "en": "..." },
      "estimated_time": "≈10",
      "blocks": [
        {
          "block_id": "block_1",
          "block_type": "listen_and_repeat",
          "content": {
            "cards": [
              {
                "word": "Olá",
                "transcription": "[oˈla]",
                "example_sentence": "Olá, chamo-me Ana.",
                "sentence_translation_ru": "Привет, меня зовут Ана.",
                "sentence_translation_en": "Hello, my name is Ana.",
                "word_translation_ru": "Привет",
                "word_translation_en": "Hello"
              }
            ]
          },
          "ui": {
            "show_audio_settings": true,
            "show_timer": true,
            "allow_repeat": true
          },
          "completion_rule": "auto_after_audio_10_min"
        }
      ]
    },
    {
      "task_id": 2,
      "task_type": "speak_correctly",
      "title": { "ru": "Как это сказать", "en": "How to say it" },
      "blocks": [
        {
          "block_id": "block_1",
          "block_type": "how_to_say",
          "content": {
            "title": { "ru": "Как попросить о помощи", "en": "How to ask for help" },
            "explanation_text": { "ru": "...", "en": "..." },
            "examples": [
              { "text": "Preciso de ajuda.", "audio": true, "pause_after_audio_sec": 1.5 }
            ],
            "hint": [
              { "ru": "Preciso — «Мне нужно»", "en": "Preciso means «I need»" }
            ]
          }
        },
        {
          "block_id": "block_2",
          "block_type": "reinforcement",
          "content": {
            "task_1": {
              "format": "single_choice",
              "audio": "Preciso de ajuda.",
              "question": { "ru": "О чём говорит человек?", "en": "What is the person saying?" },
              "options": [
                { "text": { "ru": "Просит о помощи", "en": "Asking for help" }, "correct": true },
                { "text": { "ru": "Благодарит", "en": "Thanking" }, "correct": false }
              ]
            }
          }
        },
        {
          "block_id": "block_3",
          "block_type": "speak_out_loud",
          "content": {
            "instruction_text": { "ru": "...", "en": "..." },
            "action_button": {
              "text": { "ru": "✔ Я сказал(а) вслух", "en": "✔ I said it out loud" },
              "completes_task": true
            }
          }
        }
      ]
    }
  ]
}
```

### 1.2 Старая структура для фронтенда (после трансформации)

```json
{
  "day": { ... },
  "tasks": [
    {
      "task_id": 1,
      "type": "vocabulary", // ← преобразовано из task_type + block_type
      "title": { ... },
      "subtitle": { ... },
      "estimated_time": "≈10",
      "content": { // ← из блока listen_and_repeat
        "cards": [ ... ]
      },
      "ui": { ... },
      "completion_rule": "auto_after_audio_10_min"
    },
    {
      "task_id": 2,
      "type": "rules", // ← преобразовано из task_type + блоков
      "title": { ... },
      "structure": { // ← из блоков
        "blocks_order": ["block_1", "block_2", "block_3"]
      },
      "blocks": { // ← все блоки задачи
        "block_1": { ... },
        "block_2": { ... },
        "block_3": { ... }
      }
    }
  ]
}
```

---

## 2. Маппинг типов

### 2.1 Задачи (task_type) → Тип для фронтенда (type)

| task_type (CRM) | Блоки в задаче | type (Фронтенд) | Компонент |
|----------------|----------------|-----------------|-----------|
| `listen_and_repeat` | `listen_and_repeat` | `vocabulary` | VocabularyTask |
| `speak_correctly` | `how_to_say`, `reinforcement`, `speak_out_loud` | `rules` | RulesTask |
| `understand_meaning` | `listen_phrase` | `listening_comprehension` | ListeningTask |
| `choose_situation` | `check_meaning` | `attention` | AttentionTask |
| `try_yourself` | `write_by_hand` | `writing_optional` | WritingTask |

### 2.2 Блоки (block_type) → Структура для фронтенда

| block_type | Преобразование |
|------------|----------------|
| `listen_and_repeat` | → `content.cards` (для vocabulary) |
| `how_to_say` | → `blocks.block_X` (explanation блок) |
| `reinforcement` | → `blocks.block_X` (reinforcement блок) |
| `speak_out_loud` | → `blocks.block_X` (speak_out_loud блок) |
| `listen_phrase` | → `items[]` (для listening_comprehension) |
| `check_meaning` | → `items[]` (для attention) |
| `write_by_hand` | → `main_task`, `instruction`, `example` (для writing) |

---

## 3. Трансформер (lesson-transformer.ts)

```typescript
export function transformLessonForFrontend(lesson: any): any {
  const yamlContent = lesson.yaml_content;
  const transformedTasks = yamlContent.tasks.map((task: any) => {
    // Определяем тип задачи для фронтенда
    const frontendType = determineFrontendType(task);
    
    // Преобразуем блоки в структуру для фронтенда
    const transformedTask = {
      task_id: task.task_id,
      type: frontendType,
      title: task.title,
      subtitle: task.subtitle,
      estimated_time: task.estimated_time,
    };
    
    // Преобразуем в зависимости от типа
    switch (frontendType) {
      case 'vocabulary':
        // Берем первый блок listen_and_repeat
        const listenBlock = task.blocks.find((b: any) => b.block_type === 'listen_and_repeat');
        return {
          ...transformedTask,
          content: listenBlock.content,
          ui: listenBlock.ui,
          completion_rule: listenBlock.completion_rule,
        };
        
      case 'rules':
        // Собираем все блоки в structure и blocks
        const blocksOrder = task.blocks.map((b: any) => b.block_id);
        const blocks = {};
        task.blocks.forEach((block: any) => {
          blocks[block.block_id] = transformBlockForRules(block);
        });
        return {
          ...transformedTask,
          structure: { blocks_order: blocksOrder },
          blocks: blocks,
        };
        
      case 'listening_comprehension':
        // Преобразуем блоки listen_phrase в items
        const items = [];
        task.blocks.forEach((block: any) => {
          if (block.block_type === 'listen_phrase') {
            items.push(...transformListenPhraseBlock(block));
          }
        });
        return {
          ...transformedTask,
          items: items,
          ui_rules: task.ui_rules || {},
        };
        
      // ... аналогично для attention и writing
    }
  });
  
  return {
    ...yamlContent,
    tasks: transformedTasks,
  };
}
```

---

## 4. API с трансформером

```typescript
// app/api/lessons/[id]/route.ts
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const lesson = await getLessonById(params.id);
  
  // Для фронтенда - трансформируем
  if (request.headers.get('x-client') === 'frontend') {
    lesson.yaml_content = transformLessonForFrontend(lesson);
  }
  
  // Для админки - возвращаем как есть
  return NextResponse.json({ lesson });
}
```

---

## 5. Структура блоков в CRM

### 5.1 Блок `listen_and_repeat`
```json
{
  "block_type": "listen_and_repeat",
  "content": {
    "cards": [
      {
        "word": "Olá",
        "transcription": "[oˈla]",
        "example_sentence": "Olá, chamo-me Ana.",
        "sentence_translation_ru": "...",
        "sentence_translation_en": "...",
        "word_translation_ru": "...",
        "word_translation_en": "..."
      }
    ]
  },
  "ui": {
    "show_audio_settings": true,
    "show_timer": true,
    "allow_repeat": true
  },
  "completion_rule": "auto_after_audio_10_min"
}
```

### 5.2 Блок `how_to_say`
```json
{
  "block_type": "how_to_say",
  "content": {
    "title": { "ru": "...", "en": "..." },
    "explanation_text": { "ru": "...", "en": "..." },
    "examples": [
      {
        "text": "Preciso de ajuda.",
        "audio": true,
        "pause_after_audio_sec": 1.5
      }
    ],
    "hint": [
      { "ru": "...", "en": "..." }
    ]
  }
}
```

### 5.3 Блок `reinforcement`
```json
{
  "block_type": "reinforcement",
  "content": {
    "task_1": {
      "format": "single_choice",
      "audio": "Preciso de ajuda.",
      "question": { "ru": "...", "en": "..." },
      "options": [
        { "text": { "ru": "...", "en": "..." }, "correct": true }
      ]
    },
    "task_2": {
      "format": "situation_to_phrase",
      "situation_text": { "ru": "...", "en": "..." },
      "options": [
        { "text": "Preciso de ajuda.", "correct": true }
      ]
    }
  }
}
```

### 5.4 Блок `listen_phrase`
```json
{
  "block_type": "listen_phrase",
  "content": {
    "items": [
      {
        "item_id": 1,
        "audio": "Preciso de ajuda.",
        "text_hidden_before_answer": true,
        "question": { "ru": "...", "en": "..." },
        "options": [
          { "text": "Просит о помощи", "correct": true }
        ]
      }
    ]
  }
}
```

---

## 6. Аудио система

### 6.1 Хранение аудио
- В таблице `audio_files` хранятся метаданные
- Файлы в Supabase Storage: `lessons/{lesson_id}/audio/{block_id}_{item_id}.mp3`
- Связь с `phrases` таблицей для совместимости

### 6.2 Генерация аудио
```typescript
// При создании/редактировании блока в CRM
async function generateAudio(text: string, lessonId: string, blockId: string, itemId: string) {
  // 1. Генерируем через Google TTS
  const audioBuffer = await generateTTS(text);
  
  // 2. Загружаем в Supabase Storage
  const storagePath = `lessons/${lessonId}/audio/${blockId}_${itemId}.mp3`;
  const { data } = await supabase.storage
    .from('lesson-audio')
    .upload(storagePath, audioBuffer);
  
  // 3. Получаем публичный URL
  const { data: { publicUrl } } = supabase.storage
    .from('lesson-audio')
    .getPublicUrl(storagePath);
  
  // 4. Сохраняем в audio_files
  await supabase.from('audio_files').insert({
    lesson_id: lessonId,
    block_id: blockId,
    item_id: itemId,
    text_pt: text,
    audio_url: publicUrl,
    storage_path: storagePath,
    generation_method: 'tts',
    generated_at: new Date().toISOString(),
  });
  
  // 5. Обновляем phrases для совместимости
  await supabase.from('phrases').upsert({
    portuguese_text: text,
    audio_url: publicUrl,
    lesson_id: lessonId,
  });
}
```

---

## 7. Порядок разработки

1. ✅ **Миграция БД** - создать таблицы, очистить данные
2. ✅ **Трансформер** - функция преобразования новой структуры в старую
3. ✅ **API уровней** - CRUD для уровней
4. ✅ **API уроков** - CRUD + трансформер для фронтенда
5. ✅ **CRM UI - Уровни** - создание, редактирование, удаление
6. ✅ **CRM UI - Уроки** - базовая структура (левая панель + правая панель)
7. ✅ **CRM UI - Редакторы блоков** - по одному типу блока
8. ✅ **Аудио система** - генерация + загрузка
9. ✅ **Фронтенд** - группировка по уровням
10. ✅ **Тестирование** - создание урока → проверка на фронте

---

## 8. Критерии успеха

- ✅ Все компоненты фронтенда работают без изменений
- ✅ Урок, созданный в CRM, корректно отображается на фронте
- ✅ Аудио генерируется и загружается корректно
- ✅ Уровни отображаются на фронте с раскрывающимися секциями
- ✅ Трансформер работает прозрачно для фронтенда

