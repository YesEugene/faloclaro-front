# Как добавить тестовые данные в FaloClaro

## Шаг 1: Убедитесь, что схема применена

В Supabase SQL Editor выполните код из `database/schema.sql` (если еще не сделали).

## Шаг 2: Добавить кластеры

В Supabase SQL Editor выполните:

```sql
INSERT INTO clusters (name, description, order_index) VALUES
('Приветствия', 'Основные приветствия и знакомство', 1),
('В ресторане', 'Фразы для заказа еды и напитков', 2),
('Покупки', 'Фразы для шопинга', 3),
('Путешествия', 'Фразы для путешествий и навигации', 4);
```

## Шаг 3: Проверить кластеры

1. Откройте **Table Editor** → `clusters`
2. Убедитесь, что кластеры созданы
3. Скопируйте ID первого кластера (для "Приветствия")

## Шаг 4: Добавить фразы

В SQL Editor выполните (замените `YOUR_CLUSTER_ID` на реальный ID):

```sql
-- Сначала получите ID кластера "Приветствия"
-- Затем используйте его ниже

INSERT INTO phrases (cluster_id, portuguese_text, ipa_transcription, audio_url, order_index)
SELECT 
  id,
  'Olá, como está?',
  'ˈɔlɐ ˈkomu ɨʃˈta',
  'https://youvkbqaruadfpqxxbwi.supabase.co/storage/v1/object/public/audio/ola-como-esta.mp3',
  1
FROM clusters WHERE name = 'Приветствия' LIMIT 1;

INSERT INTO phrases (cluster_id, portuguese_text, ipa_transcription, audio_url, order_index)
SELECT 
  id,
  'Bom dia!',
  'bõ ˈdiɐ',
  'https://youvkbqaruadfpqxxbwi.supabase.co/storage/v1/object/public/audio/bom-dia.mp3',
  2
FROM clusters WHERE name = 'Приветствия' LIMIT 1;

INSERT INTO phrases (cluster_id, portuguese_text, ipa_transcription, audio_url, order_index)
SELECT 
  id,
  'Boa tarde!',
  'ˈboɐ ˈtaɾdɨ',
  'https://youvkbqaruadfpqxxbwi.supabase.co/storage/v1/object/public/audio/boa-tarde.mp3',
  3
FROM clusters WHERE name = 'Приветствия' LIMIT 1;
```

## Шаг 5: Добавить переводы

```sql
-- Переводы для фразы "Olá, como está?"
INSERT INTO translations (phrase_id, language_code, translation_text)
SELECT 
  id,
  'en',
  'Hello, how are you?'
FROM phrases WHERE portuguese_text = 'Olá, como está?' LIMIT 1;

INSERT INTO translations (phrase_id, language_code, translation_text)
SELECT 
  id,
  'ru',
  'Привет, как дела?'
FROM phrases WHERE portuguese_text = 'Olá, como está?' LIMIT 1;

-- Переводы для "Bom dia!"
INSERT INTO translations (phrase_id, language_code, translation_text)
SELECT 
  id,
  'en',
  'Good morning!'
FROM phrases WHERE portuguese_text = 'Bom dia!' LIMIT 1;

INSERT INTO translations (phrase_id, language_code, translation_text)
SELECT 
  id,
  'ru',
  'Доброе утро!'
FROM phrases WHERE portuguese_text = 'Bom dia!' LIMIT 1;

-- Переводы для "Boa tarde!"
INSERT INTO translations (phrase_id, language_code, translation_text)
SELECT 
  id,
  'en',
  'Good afternoon!'
FROM phrases WHERE portuguese_text = 'Boa tarde!' LIMIT 1;

INSERT INTO translations (phrase_id, language_code, translation_text)
SELECT 
  id,
  'ru',
  'Добрый день!'
FROM phrases WHERE portuguese_text = 'Boa tarde!' LIMIT 1;
```

## Шаг 6: Загрузить аудио файлы

1. В Supabase откройте **Storage** → bucket `audio`
2. Загрузите MP3 файлы для каждой фразы
3. Скопируйте публичные URL файлов
4. Обновите `audio_url` в таблице `phrases` через Table Editor или SQL

## Проверка

После добавления данных:
1. Обновите страницу http://localhost:3000
2. Должны появиться кластеры на странице выбора
3. Можно выбрать кластер и увидеть фразы

## Важно

- Аудио файлы должны быть загружены в Storage bucket `audio`
- URL должны быть публичными (bucket должен быть public)
- Формат URL: `https://youvkbqaruadfpqxxbwi.supabase.co/storage/v1/object/public/audio/filename.mp3`


