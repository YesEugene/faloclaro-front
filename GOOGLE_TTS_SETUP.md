# Настройка Google Cloud Text-to-Speech для генерации аудио

## Проблема
Если генерация аудио не работает, скорее всего проблема в отсутствии или неправильной настройке Google Cloud credentials.

## Решение

### 1. Получите JSON файл с credentials от Google Cloud

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Выберите ваш проект (или создайте новый)
3. Перейдите в **IAM & Admin** → **Service Accounts**
4. Создайте новый Service Account или используйте существующий
5. Нажмите на Service Account → **Keys** → **Add Key** → **Create new key**
6. Выберите формат **JSON** и скачайте файл
7. **Включите Text-to-Speech API** для вашего проекта:
   - Перейдите в **APIs & Services** → **Library**
   - Найдите "Cloud Text-to-Speech API"
   - Нажмите **Enable**

### 2. Настройте переменные окружения в Vercel

Для **production** окружения (Vercel):

1. Перейдите в ваш проект на Vercel
2. Откройте **Settings** → **Environment Variables**
3. Добавьте переменную окружения:
   - **Name**: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
   - **Value**: Содержимое JSON файла (весь файл как одну строку)
   - **Environment**: Production (и другие, если нужно)

   **Важно**: 
   - Скопируйте весь JSON файл целиком, включая фигурные скобки
   - Не добавляйте кавычки вокруг JSON
   - JSON должен быть валидным (можно проверить на [jsonlint.com](https://jsonlint.com/))

### 3. Альтернативный способ (для локальной разработки)

Для **локальной разработки**:

1. Сохраните JSON файл в корень проекта как `google-credentials.json`
2. Добавьте в `.env.local`:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
   ```
3. **Важно**: Добавьте `google-credentials.json` в `.gitignore`, чтобы не коммитить credentials в Git!

### 4. Структура JSON credentials

JSON файл должен содержать следующие поля:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

### 5. Проверка настройки

После настройки переменных окружения:

1. **Redeploy** приложение на Vercel (чтобы новые переменные окружения применились)
2. Попробуйте сгенерировать аудио в админ-панели
3. Проверьте логи в Vercel:
   - Откройте **Deployments** → выберите последний deployment → **Functions** → `/api/admin/audio/generate`
   - Ищите логи с префиксами: `🔍`, `✅`, `❌`, `🎵`

### 6. Типичные ошибки

**Ошибка: "GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable must be set"**
- Решение: Проверьте, что переменная `GOOGLE_APPLICATION_CREDENTIALS_JSON` добавлена в Vercel Environment Variables

**Ошибка: "Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON"**
- Решение: Убедитесь, что JSON валидный и не содержит лишних кавычек

**Ошибка: "Permission denied" или "PERMISSION_DENIED"**
- Решение: Убедитесь, что Text-to-Speech API включен для вашего проекта в Google Cloud Console

**Ошибка: "Invalid credentials structure"**
- Решение: Проверьте, что JSON содержит все необходимые поля: `type`, `project_id`, `private_key`, `client_email`

### 7. Дополнительная информация

- Документация Google Cloud TTS: https://cloud.google.com/text-to-speech/docs
- Лимиты и цены: https://cloud.google.com/text-to-speech/pricing
- Поддерживаемые голоса: https://cloud.google.com/text-to-speech/docs/voices


