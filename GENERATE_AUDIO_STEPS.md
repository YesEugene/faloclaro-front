# Генерация аудио для всех 100 фраз

## Вариант 1: Google Cloud TTS (Рекомендуется - лучшее качество)

### Шаг 1: Настройка Google Cloud

1. Перейдите на [Google Cloud Console](https://console.cloud.google.com)
2. Создайте новый проект (или используйте существующий)
3. Включите **Cloud Text-to-Speech API**:
   - APIs & Services → Library
   - Найдите "Cloud Text-to-Speech API"
   - Нажмите "Enable"
4. Создайте Service Account:
   - IAM & Admin → Service Accounts
   - Create Service Account
   - Название: `tts-service`
   - Роль: **Cloud Text-to-Speech API User**
   - Create and Continue → Done
5. Создайте ключ:
   - Нажмите на созданный Service Account
   - Keys → Add Key → Create new key
   - Выберите JSON
   - Скачайте файл
6. Сохраните файл как `google-credentials.json` в корне проекта

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
node scripts/generate-audio-simple.js
```

Скрипт создаст все 100 файлов в папке `audio-output/`

**Время:** ~2-3 минуты (с задержками между запросами)

---

## Вариант 2: Онлайн сервисы (Быстро, но вручную)

### TTSMaker (Бесплатно, без регистрации)

1. Откройте https://ttsmaker.com
2. Настройки:
   - Language: **Portuguese (Portugal)**
   - Voice: **pt-PT-Female** или **pt-PT-Male**
   - Speed: 1.0 (нормальная)
   - Format: MP3
3. Для каждой фразы:
   - Вставьте текст
   - Нажмите "Generate"
   - Скачайте файл
   - Переименуйте: `phrase-1-sim.mp3`, `phrase-2-nao.mp3`, и т.д.

**Минус:** Нужно делать вручную для каждой из 100 фраз

---

## Вариант 3: Google Translate TTS (Быстро, но требует автоматизации)

Можно использовать расширение браузера или скрипт для автоматизации.

---

## После генерации

### Шаг 1: Загрузить файлы в Supabase Storage

1. Откройте Supabase → **Storage** → bucket `audio`
2. Нажмите **"Upload file"** или перетащите все файлы из `audio-output/`
3. Убедитесь, что все 100 файлов загружены

### Шаг 2: Обновить audio_url в базе данных

```bash
# Сгенерировать SQL для обновления
cd "/Users/yes/Downloads/YES PROJECTS/FaloClaro/faloclaro-app"
node scripts/update-audio-urls.js > update-audio-urls.sql
```

Затем выполните `update-audio-urls.sql` в Supabase SQL Editor.

---

## Проверка

После загрузки:
1. Откройте приложение
2. Выберите кластер
3. Нажмите на фразу
4. Проверьте, что аудио воспроизводится

---

## Стоимость

- **Google Cloud TTS**: Первые 4 миллиона символов бесплатно (для 100 фраз ~500 символов - полностью бесплатно)
- **TTSMaker**: Бесплатно
- **Amazon Polly**: ~$4 за 1M символов (тоже бесплатно для 100 фраз)

---

## Рекомендация

Используйте **Вариант 1 (Google Cloud TTS)** - это даст лучшее качество и можно автоматизировать все 100 фраз за один запуск скрипта.







