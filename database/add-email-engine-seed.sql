-- Seed Email Engine v1: templates + campaigns + steps (RU/EN)
-- Run after migrations/004_email_engine.sql

-- Campaigns
INSERT INTO email_campaigns (key, name)
VALUES
  ('campaign_neg_inactivity', 'Negative: inactivity (trial + paid)'),
  ('campaign_neg_no_payment_after_day3', 'Negative: no payment after day 3'),
  ('campaign_core_weekly_stats', 'Core: weekly stats (every 7 days from registration)')
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name;

-- Templates (subjects + bodies). You can fully edit later in Admin -> Emails.
INSERT INTO email_templates (
  key, name, category, is_active,
  subject_ru, subject_en,
  body_ru, body_en,
  cta_enabled, cta_text_ru, cta_text_en, cta_url_template
)
VALUES
  (
    'core_welcome',
    'Welcome after registration',
    'core',
    true,
    'Добро пожаловать в FaloClaro. Начнем!',
    'Welcome to FaloClaro. Let''s start.',
    'Привет!\n\nЭто Ye из FaloClaro!\n\nСпасибо, что зарегистрировались и начали свои первые три дня.\nМне очень приятно, что вы решили попробовать этот способ изучения португальского.\n\nДавайте я расскажу, как устроен курс и как получить от него максимум.\n\nКаждый день — это короткий урок из пяти частей.\nОн сделан лёгким по ощущению, но это не значит, что его нужно проходить на скорости.\n\nНе спешите.\n\nПервый блок каждого урока — это словарь.\nЗдесь вы собираете слова, которые будете использовать дальше в этом же уроке.\nМы рекомендуем уделить этому около 10 минут.\nВ углу экрана вы увидите таймер — используйте его как ориентир, а не как давление.\n\nЕсли какие-то слова вам уже знакомы — отлично, можно идти дальше.\nЕсли нет — повторяйте, слушайте ещё раз, дайте им уложиться.\n\nВсе следующие задания в уроке строятся именно на этих словах.\nК концу урока цель — не просто узнавать слова, а уметь собирать из них живые фразы.\n\nУроки специально сделаны короткими.\nЭто позволяет встроить их в обычный день, но важно не превращать их в пролистывание.\nОставайтесь в задании до тех пор, пока вы действительно не почувствуете, что понимаете, что происходит.\n\nИменно так язык начинает закрепляться.\n\nЕщё раз спасибо, что вы здесь.\nПриятного обучения\nи добро пожаловать в FaloClaro 🇵🇹',
    'Hi,\n\nThis is Ye from FaloClaro.\n\nThank you for signing up and starting your first three days with us.\nI''m really glad you decided to try this way of learning Portuguese.\n\nHere''s how to get the most out of the course.\n\nEach day is a short lesson made of five parts.\nIt feels light and simple — but that doesn''t mean you should rush.\n\nTake your time.\n\nThe first block of every lesson is vocabulary.\nThis is where you build the set of words you will use in the rest of that lesson.\nWe recommend spending about 10 minutes there.\nYou will see a timer in the corner — use it as a guide, not as pressure.\n\nIf you already know some words — great, move on.\nIf not — listen again, repeat, and let them settle.\n\nAll next tasks in the lesson are built on these words.\nBy the end, the goal is not only to recognize words, but to build real phrases.\n\nLessons are intentionally short.\nThey fit into a normal day — but try not to just “scroll through”.\nStay with the task until you truly feel you understand what''s happening.\n\nThat''s how the language starts to stick.\n\nThanks again for being here.\nEnjoy learning — and welcome to FaloClaro 🇵🇹',
    true,
    'Открыть курс',
    'Open the course',
    '{{intro_url}}'
  ),
  (
    'core_day3_congrats',
    'Congrats after completing day 3 (payment CTA)',
    'core',
    true,
    'Поздравляем! Вы успешно завершили первые 3 урока',
    'Congratulations! You''ve completed the first 3 lessons',
    'Поздравляем! 🎉\n\nМы видим, что вы завершили первые 3 урока курса FaloClaro.\n\nЕсли вы готовы продолжить обучение, вы можете открыть полный доступ ко всем 60 урокам за 20€ (разовая оплата, не подписка).\n\nЕсли есть вопросы — просто ответьте на это письмо.',
    'Congratulations! 🎉\n\nWe see that you''ve completed the first 3 lessons of FaloClaro.\n\nIf you''re ready to continue, you can unlock full access to all 60 lessons for €20 (one-time purchase, not a subscription).\n\nIf you have any questions, just reply to this email.',
    true,
    'Оплатить 20€ и продолжить',
    'Pay €20 and continue',
    '{{payment_url}}'
  ),
  (
    'core_payment_thanks',
    'Thanks for payment',
    'core',
    true,
    'Спасибо за оплату — добро пожаловать в полный курс',
    'Thanks for your payment — welcome to the full course',
    'Спасибо за оплату! 🙌\n\nТеперь вам открыт полный доступ ко всем 60 урокам.\n\n60 уроков пролетят и не заметишь — а португальский язык уже поселится в голове.\n\nМожно продолжать с того места, где вы остановились.',
    'Thank you for your payment! 🙌\n\nYou now have full access to all 60 lessons.\n\nThese 60 lessons will fly by — and Portuguese will quietly settle in your head.\n\nYou can continue right where you left off.',
    true,
    'Открыть курс',
    'Open the course',
    '{{intro_url}}'
  ),
  (
    'core_weekly_stats',
    'Weekly learning stats',
    'core',
    true,
    'Твоя неделя в FaloClaro: прогресс и темы',
    'Your week in FaloClaro: progress and topics',
    'Вот твоя статистика за последние 7 дней:\n\n— Пройдено уроков: {{weekly_lessons_completed}}\n— Темы: {{weekly_topics}}\n— Выучено слов (суммарно): {{total_words_learned}}\n\nПродолжай в своём темпе — регулярность важнее скорости.',
    'Here are your stats for the last 7 days:\n\n— Lessons completed: {{weekly_lessons_completed}}\n— Topics: {{weekly_topics}}\n— Words learned (total): {{total_words_learned}}\n\nKeep going at your own pace — consistency beats speed.',
    true,
    'Продолжить обучение',
    'Continue learning',
    '{{intro_url}}'
  ),
  (
    'core_module_complete',
    'Module complete',
    'core',
    true,
    'Поздравляем! Завершён {{module_label_ru}}',
    'Congrats! You completed {{module_label_en}}',
    'Отлично! 🎉\n\nТы завершил(а) {{module_label_ru}}.\nЭто сильный шаг — дальше будет ещё интереснее.\n\nПродолжай в своём темпе.',
    'Great job! 🎉\n\nYou completed {{module_label_en}}.\nThat''s a strong milestone — the next phase will be even more interesting.\n\nKeep going at your own pace.',
    true,
    'Открыть курс',
    'Open the course',
    '{{intro_url}}'
  ),
  (
    'core_course_complete',
    'Course complete',
    'core',
    true,
    'Поздравляем! Ты завершил(а) курс FaloClaro',
    'Congratulations! You completed FaloClaro',
    'Поздравляем! 🎉\n\nТы прошёл(прошла) весь курс FaloClaro.\nЭто редкое достижение — теперь язык реально у тебя в голове.\n\nЕсли хочется — возвращайся к любым урокам и повторяй. Повторение — это сила.',
    'Congratulations! 🎉\n\nYou completed the full FaloClaro course.\nThat''s a rare achievement — the language is now truly in your head.\n\nIf you want, come back anytime and replay lessons. Repetition is power.',
    false, NULL, NULL, NULL
  ),
  (
    'neg_inactive_1_1',
    'Inactive 1/3',
    'neg',
    true,
    'Куда ты пропал?',
    'Where did you go?',
    'Кажется, ты давно не заходил(а) в FaloClaro.\n\nДостаточно пройти одно задание, чтобы снова включиться.\n\nОткрыть курс можно по кнопке ниже.',
    'Looks like you haven''t been in FaloClaro for a while.\n\nJust complete one task to get back into the flow.\n\nOpen the course below.',
    true,
    'Вернуться к курсу',
    'Return to the course',
    '{{intro_url}}'
  ),
  (
    'neg_inactive_1_2',
    'Inactive 2/3',
    'neg',
    true,
    'Дай себе шанс выучить португальский',
    'Give yourself a chance to learn Portuguese',
    'Напоминание: 15–20 минут в день достаточно.\n\nНе нужно “догонять” — просто сделай один маленький шаг сегодня.',
    'Reminder: 15–20 minutes a day is enough.\n\nNo need to “catch up” — just take one small step today.',
    true,
    'Открыть урок',
    'Open a lesson',
    '{{intro_url}}'
  ),
  (
    'neg_inactive_1_3',
    'Inactive 3/3',
    'neg',
    true,
    'Вернись к практике — это работает',
    'Come back to practice — it works',
    'Последнее короткое напоминание.\n\nВ FaloClaro всё построено так, чтобы язык “приживался” спокойно и без давления.\nЕсли хочешь — просто вернись и пройди одно задание.',
    'A final quick reminder.\n\nFaloClaro is designed so the language settles in calmly, without pressure.\nIf you want — just come back and complete one task.',
    true,
    'Вернуться',
    'Return',
    '{{intro_url}}'
  ),
  (
    'neg_pay_2_1',
    'No payment 1/3',
    'neg',
    true,
    'Продолжим? Полный курс доступен за 20€',
    'Ready to continue? Full course is €20',
    'Ты уже прошёл(прошла) первые 3 урока.\n\nЕсли тебе подходит формат — открой полный доступ ко всем 60 урокам за 20€ (разово, не подписка).',
    'You''ve already completed the first 3 lessons.\n\nIf the format works for you, unlock full access to all 60 lessons for €20 (one-time, not a subscription).',
    true,
    'Открыть полный доступ',
    'Unlock full access',
    '{{payment_url}}'
  ),
  (
    'neg_pay_2_2',
    'No payment 2/3',
    'neg',
    true,
    'Напоминание: полный доступ = 60 уроков практики',
    'Reminder: full access = 60 lessons of practice',
    'Полный курс — это 4 модуля и около 60 дней спокойной практики.\n\nЕсли хочешь продолжить — доступ открывается одной оплатой.',
    'The full course is 4 modules and about 60 days of calm practice.\n\nIf you want to continue, access unlocks with a one-time payment.',
    true,
    'Оплатить 20€',
    'Pay €20',
    '{{payment_url}}'
  ),
  (
    'neg_pay_2_3',
    'No payment 3/3',
    'neg',
    true,
    'Последнее письмо про доступ к курсу',
    'Final note about course access',
    'Это последнее письмо про оплату.\n\nЕсли формат тебе зашёл — будем рады видеть тебя дальше.\nЕсли нет — спасибо, что попробовал(а) первые уроки.',
    'This is the last note about payment.\n\nIf the format worked for you — we''ll be happy to see you continue.\nIf not — thanks for trying the first lessons.',
    true,
    'Продолжить обучение',
    'Continue learning',
    '{{payment_url}}'
  ),
  (
    'admin_full_access_granted',
    'Admin: full access granted',
    'admin',
    true,
    'Полный доступ к курсу открыт',
    'Full course access granted',
    'Мы открыли для вас полный доступ ко всему курсу FaloClaro.\n\nМожно продолжать обучение в своём темпе.',
    'We''ve granted you full access to the entire FaloClaro course.\n\nYou can continue learning at your own pace.',
    true,
    'Открыть курс',
    'Open the course',
    '{{intro_url}}'
  ),
  (
    'admin_course_revoked',
    'Admin: course revoked',
    'admin',
    true,
    'Доступ к курсу ограничен',
    'Course access limited',
    'Ваш доступ к полному курсу сейчас ограничен.\n\nВы всё ещё можете пройти первые 3 урока, а чтобы открыть все 60 — используйте оплату по кнопке ниже.',
    'Your full course access is currently limited.\n\nYou can still take the first 3 lessons, and to unlock all 60 use the payment button below.',
    true,
    'Открыть оплату',
    'Open payment',
    '{{payment_url}}'
  )
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  subject_ru = EXCLUDED.subject_ru,
  subject_en = EXCLUDED.subject_en,
  body_ru = EXCLUDED.body_ru,
  body_en = EXCLUDED.body_en,
  cta_enabled = EXCLUDED.cta_enabled,
  cta_text_ru = EXCLUDED.cta_text_ru,
  cta_text_en = EXCLUDED.cta_text_en,
  cta_url_template = EXCLUDED.cta_url_template,
  updated_at = NOW();

-- Campaign steps
-- Inactivity: 24h -> 72h -> 168h
INSERT INTO email_campaign_steps (campaign_key, step_index, template_key, delay_hours, stop_conditions)
VALUES
  ('campaign_neg_inactivity', 1, 'neg_inactive_1_1', 24, '{"stop_on_activity": true, "stop_on_email_off": true}'::jsonb),
  ('campaign_neg_inactivity', 2, 'neg_inactive_1_2', 72, '{"stop_on_activity": true, "stop_on_email_off": true}'::jsonb),
  ('campaign_neg_inactivity', 3, 'neg_inactive_1_3', 168, '{"stop_on_activity": true, "stop_on_email_off": true}'::jsonb),

  -- No payment after day3: 24h -> 72h -> 168h
  ('campaign_neg_no_payment_after_day3', 1, 'neg_pay_2_1', 24, '{"stop_on_paid": true, "stop_on_email_off": true}'::jsonb),
  ('campaign_neg_no_payment_after_day3', 2, 'neg_pay_2_2', 72, '{"stop_on_paid": true, "stop_on_email_off": true}'::jsonb),
  ('campaign_neg_no_payment_after_day3', 3, 'neg_pay_2_3', 168, '{"stop_on_paid": true, "stop_on_email_off": true}'::jsonb),

  -- Weekly stats: repeat every 168h
  ('campaign_core_weekly_stats', 1, 'core_weekly_stats', 168, '{"repeat": true, "repeat_delay_hours": 168, "stop_on_email_off": true}'::jsonb)
ON CONFLICT (campaign_key, step_index) DO NOTHING;


