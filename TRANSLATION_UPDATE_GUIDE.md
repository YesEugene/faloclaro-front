# 📝 РУКОВОДСТВО ПО ОБНОВЛЕНИЮ ПЕРЕВОДОВ

## ✅ ЧТО УЖЕ СДЕЛАНО

1. ✅ Убран португальский язык из меню выбора (оставлены только EN и RU)
2. ✅ Обновлен `language-context.tsx` - убран `pt` из типа `AppLanguage`
3. ✅ Создана утилита `lesson-translations.ts` для получения переводов
4. ✅ Обновлен `RulesTask.tsx` - убраны проверки на `pt`, добавлена поддержка переводов
5. ✅ Обновлен `app/pt/page.tsx` - убраны проверки на `pt`

## 🔧 ЧТО НУЖНО СДЕЛАТЬ

### 1. Обновить остальные компоненты заданий

Нужно убрать проверки на `pt` из следующих файлов:
- `components/subscription/tasks/VocabularyTask.tsx`
- `components/subscription/tasks/ListeningTask.tsx`
- `components/subscription/tasks/AttentionTask.tsx`
- `components/subscription/tasks/WritingTask.tsx`
- `components/subscription/tasks/VocabularyTaskPlayer.tsx`

**Пример замены:**
```typescript
// Было:
{appLanguage === 'ru' ? 'Текст' : appLanguage === 'en' ? 'Text' : 'Texto'}

// Стало:
{appLanguage === 'ru' ? 'Текст' : 'Text'}
```

### 2. Обновить страницы приложения

Нужно убрать проверки на `pt` из:
- `app/subcategories/page.tsx`
- `app/clusters/page.tsx`
- `app/phrases/page.tsx`
- `app/player/page.tsx`

**Пример замены:**
```typescript
// Было:
{language === 'ru' ? 'Текст' : language === 'pt' ? 'Texto' : 'Text'}

// Стало:
{language === 'ru' ? 'Текст' : 'Text'}
```

### 3. Обновить структуру YAML файлов

Все интерфейсные тексты должны иметь переводы на RU и EN.

**Формат для title, subtitle, completion_message:**
```yaml
title:
  ru: "Слова и фразы"
  en: "Words and phrases"
```

**Или старый формат (только RU) - будет работать, но рекомендуется обновить:**
```yaml
title: "Слова и фразы"  # Только RU
```

**Формат для блоков Rules (title, explanation_text, note, instruction_text):**
```yaml
block_1_identity:
  type: explanation
  title:
    ru: "Как сказать, кто ты"
    en: "How to say who you are"
  explanation_text: |
    ru: |
      Чтобы сказать, кто ты, в португальском говорят:
      Eu sou + имя
    en: |
      To say who you are in Portuguese, they say:
      Eu sou + name
```

**Или старый формат:**
```yaml
block_1_identity:
  type: explanation
  title: "Как сказать, кто ты"  # Только RU
  explanation_text: |
    Чтобы сказать, кто ты, в португальском говорят:
    Eu sou + имя
```

### 4. Обновить компоненты для использования функций переводов

Импортировать функции из `@/lib/lesson-translations`:
```typescript
import { getTaskTitle, getTaskSubtitle, getCompletionMessage, getBlockTitle, getBlockExplanationText } from '@/lib/lesson-translations';
```

Использовать:
```typescript
const title = getTaskTitle(task, appLanguage);
const subtitle = getTaskSubtitle(task, appLanguage);
const completionMessage = getCompletionMessage(task, appLanguage);
const blockTitle = getBlockTitle(block, appLanguage);
```

## 📋 ФУНКЦИИ ДЛЯ ПЕРЕВОДОВ

Все функции находятся в `lib/lesson-translations.ts`:

- `getTranslatedText(textOrObject, language)` - универсальная функция
- `getDayTitle(dayData, language)` - заголовок дня
- `getDaySubtitle(dayData, language)` - подзаголовок дня
- `getTaskTitle(task, language)` - заголовок задания
- `getTaskSubtitle(task, language)` - подзаголовок задания
- `getCompletionMessage(task, language)` - сообщение о завершении
- `getBlockTitle(block, language)` - заголовок блока
- `getBlockExplanationText(block, language)` - текст объяснения
- `getBlockNote(block, language)` - примечание
- `getInstructionText(instruction, language)` - текст инструкции

## 🎯 ПРИОРИТЕТЫ

1. **Высокий приоритет:** Обновить все проверки на `pt` в компонентах заданий
2. **Высокий приоритет:** Обновить все проверки на `pt` в страницах приложения
3. **Средний приоритет:** Обновить структуру YAML файлов для поддержки переводов
4. **Низкий приоритет:** Обновить компоненты для использования функций переводов (можно делать постепенно)

## 📝 ПРИМЕР ОБНОВЛЕННОГО YAML

```yaml
day:
  number: 1
  title:
    ru: "Знакомство"
    en: "Introduction"
  subtitle:
    ru: "Первые фразы, чтобы услышать язык и начать говорить"
    en: "First phrases to hear the language and start speaking"

tasks:
  - task_id: 1
    type: "vocabulary"
    title:
      ru: "Слова и фразы"
      en: "Words and phrases"
    subtitle:
      ru: "Слушай, повторяй и привыкай к звучанию языка"
      en: "Listen, repeat and get used to the sound of the language"
    completion_message:
      ru: "Уровень прогресса: Начало"
      en: "Progress level: Beginning"
```




