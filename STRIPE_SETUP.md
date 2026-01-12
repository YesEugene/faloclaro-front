# Настройка Stripe для FaloClaro

## Шаг 1: Получение API ключей из Stripe Dashboard

1. Войдите в ваш Stripe Dashboard: https://dashboard.stripe.com
2. Перейдите в раздел **Developers** → **API keys**
3. Найдите секцию **Secret key** (для боевого режима)
4. Нажмите **Reveal test key** или **Reveal live key** (в зависимости от режима)
5. Скопируйте ключ (он начинается с `sk_live_` для боевого режима или `sk_test_` для тестового)

## Шаг 2: Настройка переменных окружения

1. Создайте файл `.env.local` в корне проекта (если его еще нет)
2. Добавьте следующие переменные:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_secret_key_here
NEXT_PUBLIC_BASE_URL=https://www.faloclaro.com
```

**Важно:**
- Замените `sk_live_your_secret_key_here` на ваш реальный секретный ключ из Stripe
- Для тестирования можно использовать тестовый ключ (`sk_test_...`)
- `NEXT_PUBLIC_BASE_URL` должен указывать на ваш домен

## Шаг 3: Настройка в Vercel (для продакшена)

1. Перейдите в настройки вашего проекта на Vercel
2. Откройте раздел **Settings** → **Environment Variables**
3. Добавьте переменные:
   - `STRIPE_SECRET_KEY` = ваш секретный ключ Stripe
   - `NEXT_PUBLIC_BASE_URL` = `https://www.faloclaro.com`

## Шаг 4: Проверка работы

1. Запустите проект локально: `npm run dev`
2. Перейдите на страницу `/methodology`
3. Внизу страницы должен появиться блок "Оставьте чаевые"
4. Нажмите на блок, чтобы развернуть форму
5. Выберите сумму или введите свою
6. Нажмите "Оплатить"
7. Должно произойти перенаправление на страницу оплаты Stripe

## Шаг 5: Настройка Webhooks (опционально, для отслеживания платежей)

Если вы хотите получать уведомления о платежах:

1. В Stripe Dashboard перейдите в **Developers** → **Webhooks**
2. Нажмите **Add endpoint**
3. URL endpoint: `https://www.faloclaro.com/api/webhooks/stripe`
4. Выберите события для отслеживания:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
5. Сохраните endpoint

## Важные замечания

- **Безопасность**: Никогда не коммитьте `.env.local` в Git
- **Тестовый режим**: Для тестирования используйте тестовые ключи (`sk_test_...`)
- **Боевой режим**: Для продакшена используйте боевые ключи (`sk_live_...`)
- **Валюта**: По умолчанию используется EUR. Если нужно изменить, отредактируйте `app/api/create-checkout-session/route.ts`

## Структура файлов

- `app/api/create-checkout-session/route.ts` - API endpoint для создания сессии оплаты
- `components/DonationBlock.tsx` - Компонент формы донатов
- `app/methodology/page.tsx` - Страница с интегрированным блоком донатов

## Поддержка

Если возникли проблемы:
1. Проверьте, что ключи Stripe правильно установлены
2. Убедитесь, что `NEXT_PUBLIC_BASE_URL` указывает на правильный домен
3. Проверьте консоль браузера и сервера на наличие ошибок








