# Environment Variables Setup

## Required Environment Variables

Для работы админ-панели и создания уровней необходимо добавить переменную окружения:

### `SUPABASE_SERVICE_ROLE_KEY`

Этот ключ используется для админских операций (создание, обновление, удаление уровней и уроков) и обходит RLS (Row Level Security) политики.

**Где найти:**
1. Откройте Supabase Dashboard
2. Перейдите в Settings → API
3. Найдите "service_role" key (⚠️ **секретный ключ, не публикуйте!**)
4. Скопируйте его

**Где добавить:**
- **Локально:** Добавьте в `.env.local`:
  ```
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
  ```

- **Vercel:**
  1. Откройте проект в Vercel Dashboard
  2. Перейдите в Settings → Environment Variables
  3. Добавьте новую переменную:
     - Name: `SUPABASE_SERVICE_ROLE_KEY`
     - Value: ваш service role key
     - Environment: Production, Preview, Development (все)
  4. Сохраните и перезапустите деплой

**Важно:**
- ⚠️ Service Role Key имеет полный доступ к базе данных и обходит все RLS политики
- ⚠️ Никогда не используйте этот ключ на фронтенде!
- ⚠️ Используйте только в серверных API routes

После добавления переменной окружения перезапустите приложение (или дождитесь автоматического деплоя в Vercel).


