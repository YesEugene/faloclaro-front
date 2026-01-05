# Руководство по генерации и загрузке аудио для FaloClaro

## Вариант 1: Google Cloud Text-to-Speech (Рекомендуется)

### Шаг 1: Настройка Google Cloud

1. Создайте проект в [Google Cloud Console](https://console.cloud.google.com)
2. Включите API: **Cloud Text-to-Speech API**
3. Создайте Service Account:
   - IAM & Admin → Service Accounts
   - Create Service Account
   - Роль: **Cloud Text-to-Speech API User**
   - Создайте JSON ключ и скачайте его
4. Сохраните JSON файл как `google-credentials.json` в корне проекта

### Шаг 2: Установка зависимостей

```bash
cd "/Users/yes/Downloads/YES PROJECTS/FaloClaro/faloclaro-app"
npm install @google-cloud/text-to-speech
```

### Шаг 3: Генерация аудио

```bash
# Установите переменную окружения
export GOOGLE_APPLICATION_CREDENTIALS="./google-credentials.json"

# Запустите скрипт
node scripts/generate-audio.js
```

Аудио файлы будут созданы в папке `audio-output/`

### Шаг 4: Загрузка в Supabase Storage

1. Откройте Supabase → **Storage** → bucket `audio`
2. Нажмите **"Upload file"** или перетащите файлы
3. Загрузите все MP3 файлы из `audio-output/`

### Шаг 5: Обновление audio_url в базе данных

После загрузки файлов, обновите `audio_url` в таблице `phrases`:

```sql
-- Пример для первой фразы
UPDATE phrases 
SET audio_url = 'https://youvkbqaruadfpqxxbwi.supabase.co/storage/v1/object/public/audio/phrase-1-sim.mp3'
WHERE portuguese_text = 'Sim.';

-- Или массовое обновление через скрипт (см. ниже)
```

---

## Вариант 2: Amazon Polly (Альтернатива)

### Настройка

1. Создайте аккаунт AWS
2. Установите AWS CLI: `npm install aws-sdk`
3. Настройте credentials: `aws configure`

### Генерация через AWS CLI

```bash
# Для одной фразы
aws polly synthesize-speech \
  --output-format mp3 \
  --voice-id Ines \
  --text "Sim." \
  phrase-1-sim.mp3

# Ines - женский голос для pt-PT
# Alternative: Cristiano (мужской голос)
```

---

## Вариант 3: Онлайн сервисы (Быстрый старт)

### Использование онлайн TTS:

1. **Google Translate TTS** (бесплатно, но ограничено):
   - https://translate.google.com
   - Введите фразу, нажмите на иконку звука
   - Используйте расширение браузера для скачивания аудио

2. **TTSMaker** (бесплатно):
   - https://ttsmaker.com
   - Выберите язык: Portuguese (Portugal)
   - Голос: pt-PT-Female или pt-PT-Male
   - Введите фразу и скачайте MP3

3. **NaturalReader**:
   - https://www.naturalreaders.com
   - Поддержка pt-PT

---

## Автоматическое обновление audio_url

После загрузки всех файлов в Supabase Storage, создайте SQL скрипт для обновления:

```sql
-- Обновление audio_url для всех фраз
-- Формат имени файла: phrase-{номер}-{текст}.mp3

UPDATE phrases 
SET audio_url = 'https://youvkbqaruadfpqxxbwi.supabase.co/storage/v1/object/public/audio/phrase-1-sim.mp3'
WHERE portuguese_text = 'Sim.';

UPDATE phrases 
SET audio_url = 'https://youvkbqaruadfpqxxbwi.supabase.co/storage/v1/object/public/audio/phrase-2-nao.mp3'
WHERE portuguese_text = 'Não.';

-- И так далее для всех 100 фраз...
```

Или используйте скрипт для автоматизации (см. `scripts/update-audio-urls.js`)

---

## Рекомендации

1. **Качество**: Google Cloud TTS (Wavenet) дает лучшее качество
2. **Стоимость**: 
   - Google Cloud: ~$16 за 1M символов (первые 4M бесплатно)
   - Amazon Polly: ~$4 за 1M символов
3. **Скорость**: Для 100 фраз (~500 символов) - бесплатно на обоих сервисах
4. **Формат**: MP3, 44.1kHz, моно - оптимально для веб

---

## Проверка

После загрузки:
1. Откройте приложение
2. Выберите кластер
3. Нажмите на фразу
4. Проверьте, что аудио воспроизводится

Если аудио не играет:
- Проверьте, что bucket `audio` публичный
- Проверьте URL в базе данных
- Проверьте консоль браузера на ошибки CORS


