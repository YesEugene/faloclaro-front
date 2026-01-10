# Тестирование интеграции Resend

## 1. Проверка конфигурации

### Проверить, что Resend настроен:

```bash
curl https://www.faloclaro.com/api/subscription/test-email
```

Должен вернуть:
```json
{
  "configured": true,
  "fromEmail": "FaloClaro <noreply@faloclaro.com>",
  "message": "Resend is configured. Use POST to send test email."
}
```

## 2. Отправка тестового email

### Через curl:

```bash
curl -X POST https://www.faloclaro.com/api/subscription/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

### Через браузер (POST запрос):

Используйте Postman, Insomnia или любой другой HTTP клиент:
- **URL:** `https://www.faloclaro.com/api/subscription/test-email`
- **Method:** POST
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "email": "your-email@example.com"
}
```

## 3. Тестирование регистрации

1. Зайдите на https://www.faloclaro.com/pt
2. Введите ваш email
3. Нажмите "Начать бесплатные 3 дня"
4. Проверьте почту - должно прийти письмо с ссылкой на первый урок

## 4. Проверка логов

### В Vercel:
1. Зайдите в Vercel Dashboard
2. Выберите проект faloclaro
3. Перейдите в **Logs**
4. Ищите сообщения о отправке email

### В Resend:
1. Зайдите в https://resend.com/emails
2. Проверьте список отправленных писем
3. Проверьте статус доставки

## 5. Возможные проблемы

### Проблема: "RESEND_API_KEY not configured"

**Решение:**
1. Проверьте, что переменная добавлена в Vercel:
   - Vercel Dashboard → Settings → Environment Variables
   - Убедитесь, что `RESEND_API_KEY` есть для всех окружений
2. Перезапустите деплой после добавления переменной

### Проблема: "Domain not verified"

**Решение:**
1. Проверьте статус домена в Resend: https://resend.com/domains
2. Убедитесь, что домен показывает статус "Verified" ✅
3. Если нет - проверьте DNS записи на GoDaddy

### Проблема: Email не доставляется

**Проверьте:**
1. Статус в Resend Dashboard → Emails
2. Проверьте папку "Спам" в почтовом ящике
3. Проверьте логи в Vercel на наличие ошибок

### Проблема: "Invalid from address"

**Решение:**
1. Убедитесь, что домен верифицирован в Resend
2. Используйте email с верифицированного домена: `@faloclaro.com`
3. Проверьте формат: `FaloClaro <noreply@faloclaro.com>`

## 6. Проверка DNS записей

Если письма не доставляются, проверьте DNS:

1. **SPF проверка:**
   - https://mxtoolbox.com/spf.aspx
   - Введите: `faloclaro.com`
   - Должна быть запись: `include:resend.com`

2. **DKIM проверка:**
   - https://mxtoolbox.com/dkim.aspx
   - Введите: `faloclaro.com`
   - Должны быть CNAME записи от Resend

## 7. Успешная настройка

Если тестовый email пришел успешно, значит:
- ✅ Resend API ключ настроен
- ✅ Домен faloclaro.com верифицирован
- ✅ DNS записи работают
- ✅ Система готова к отправке уроков

Теперь пользователи будут получать письма с уроками автоматически после регистрации!







