# Настройка Resend для FaloClaro

## 1. Создание API ключа в Resend

1. Зайдите в Resend Dashboard: https://resend.com/api-keys
2. Нажмите **"+ Create API key"**
3. Назовите ключ: **"FaloClaro"**
4. Выберите разрешения: **"Sending access"**
5. Скопируйте ключ (он показывается только один раз!)
6. Добавьте в `.env.local`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   ```

## 2. Верификация домена faloclaro.com

### Шаг 1: Добавление домена в Resend

1. Зайдите в Resend Dashboard: https://resend.com/domains
2. Нажмите **"+ Add Domain"**
3. Введите: **faloclaro.com**
4. Resend покажет DNS записи, которые нужно добавить

### Шаг 2: Настройка DNS на GoDaddy

Вам нужно добавить следующие DNS записи в GoDaddy:

#### A. SPF запись (TXT)
```
Type: TXT
Name: @ (или faloclaro.com)
Value: v=spf1 include:resend.com ~all
TTL: 3600 (или Auto)
```

#### B. DKIM записи (CNAME)
Resend предоставит несколько CNAME записей, например:
```
Type: CNAME
Name: resend._domainkey
Value: [значение от Resend]
TTL: 3600
```

#### C. DMARC запись (TXT) - опционально, но рекомендуется
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@faloclaro.com
TTL: 3600
```

### Шаг 3: Добавление записей в GoDaddy

1. Войдите в GoDaddy: https://www.godaddy.com
2. Перейдите в **My Products** → **DNS** → выберите домен **faloclaro.com**
3. Нажмите **"Add"** для каждой записи
4. Введите данные из Resend
5. Сохраните изменения

### Шаг 4: Верификация в Resend

1. Вернитесь в Resend Dashboard → Domains
2. Нажмите **"Verify"** рядом с доменом
3. Дождитесь верификации (может занять до 48 часов, обычно 5-15 минут)
4. Статус изменится на **"Verified"** ✅

## 3. Обновление кода

После верификации домена, обновите email адрес отправителя в коде:

Файл: `app/api/subscription/send-lesson-email/route.ts`

Измените:
```typescript
from: 'FaloClaro <noreply@faloclaro.com>',
```

Или используйте другой адрес:
```typescript
from: 'FaloClaro <hello@faloclaro.com>',
```

## 4. Тестирование

После настройки, протестируйте отправку:

```bash
# Через API
curl -X POST http://localhost:3000/api/subscription/send-lesson-email \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-user-id",
    "lessonId": "your-lesson-id",
    "dayNumber": 1
  }'
```

Или зарегистрируйте тестовый email на `/pt` и проверьте почту.

## 5. Проверка статуса домена

В Resend Dashboard → Domains вы увидите:
- ✅ **Verified** - домен готов к использованию
- ⏳ **Pending** - ожидается верификация DNS
- ❌ **Failed** - проверьте DNS записи

## Важные замечания

1. **DNS изменения** могут занять до 48 часов, но обычно работают за 5-15 минут
2. **Проверьте DNS** через онлайн инструменты:
   - https://mxtoolbox.com/spf.aspx
   - https://mxtoolbox.com/dkim.aspx
3. **Не удаляйте** существующие DNS записи, если они используются для других сервисов
4. **SPF запись** может быть объединена с существующей, если она уже есть

## Пример объединения SPF записей

Если у вас уже есть SPF запись, объедините их:
```
v=spf1 include:_spf.google.com include:resend.com ~all
```


