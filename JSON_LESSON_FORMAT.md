# Формат урока в JSON (для CRM)

## Общая структура

```json
{
  "day": {
    "title": {
      "ru": "Знакомство",
      "en": "Acquaintance"
    },
    "subtitle": {
      "ru": "Первые фразы, чтобы услышать язык и начать говорить",
      "en": "First phrases to hear the language and start speaking"
    },
    "estimated_time": "15–25"
  },
  "tasks": [
    {
      "task_id": 1,
      "task_type": "listen_and_repeat",
      "title": {
        "ru": "Слова и фразы",
        "en": "Words and phrases"
      },
      "subtitle": {
        "ru": "Слушай, повторяй и привыкай к звучанию языка",
        "en": "Listen, repeat and get used to the sound of the language"
      },
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
    }
  ]
}
```

## Преимущества JSON над YAML

1. **Простота парсинга** - нативный JSON.parse() в JavaScript
2. **Валидация** - легко валидировать через JSON Schema
3. **Редактирование в CRM** - проще работать с JSON в веб-интерфейсе
4. **Меньше ошибок** - нет проблем с отступами и форматированием
5. **Совместимость** - JSON легко конвертируется в любой формат

## Конвертация YAML → JSON

При импорте старых YAML файлов:
1. Парсим YAML через `js-yaml`
2. Конвертируем в JSON
3. Сохраняем в БД

При экспорте:
1. Берем JSON из БД
2. Можно экспортировать как JSON (для CRM) или YAML (для backup)

## Примеры блоков в JSON

### Блок listen_and_repeat
```json
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
```

### Блок how_to_say
```json
{
  "block_id": "block_1",
  "block_type": "how_to_say",
  "content": {
    "title": {
      "ru": "Как попросить о помощи",
      "en": "How to ask for help"
    },
    "explanation_text": {
      "ru": "Чтобы попросить о помощи, используй:",
      "en": "To ask for help, use:"
    },
    "examples": [
      {
        "text": "Preciso de ajuda.",
        "audio": true,
        "pause_after_audio_sec": 1.5
      }
    ],
    "hint": [
      {
        "ru": "Preciso — «Мне нужно»",
        "en": "Preciso means «I need»"
      }
    ]
  }
}
```

### Блок reinforcement
```json
{
  "block_id": "block_2",
  "block_type": "reinforcement",
  "content": {
    "task_1": {
      "format": "single_choice",
      "audio": "Preciso de ajuda.",
      "question": {
        "ru": "О чём говорит человек?",
        "en": "What is the person saying?"
      },
      "options": [
        {
          "text": {
            "ru": "Просит о помощи",
            "en": "Asking for help"
          },
          "correct": true
        },
        {
          "text": {
            "ru": "Благодарит",
            "en": "Thanking"
          },
          "correct": false
        }
      ]
    }
  }
}
```

## Валидация JSON

Можно использовать JSON Schema для валидации структуры урока:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["day", "tasks"],
  "properties": {
    "day": {
      "type": "object",
      "required": ["title", "estimated_time"],
      "properties": {
        "title": {
          "type": "object",
          "required": ["ru", "en"]
        }
      }
    },
    "tasks": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["task_id", "task_type", "blocks"]
      }
    }
  }
}
```




