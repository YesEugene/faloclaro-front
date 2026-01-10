# Добавление IPA транскрипций

## Формат данных

Подготовьте файл с транскрипциями в одном из форматов:

### Вариант 1: Простой текстовый формат (рекомендуется)

Создайте файл `transcriptions.txt` в формате:
```
португальский текст | IPA транскрипция
```

**Пример:**
```
Acho que isso faz sentido para mim. | ˈaʃu kɨ ˈisu faʃ sẽˈtidu pɐˈɾɐ mĩ
Não tenho a certeza se concordo totalmente. | nɐ̃w ˈtẽɲu ɐ sɨɾˈtezɐ sɨ kõˈkoɾdu totɐɫˈmẽtɨ
Isso não me parece uma boa ideia. | ˈisu nɐ̃w mɨ pɐˈɾesɨ ˈumɐ ˈboɐ iˈdɐjɐ
```

**Важно:**
- Каждая строка = одна фраза
- Разделитель: ` | ` (пробел, вертикальная черта, пробел)
- Португальский текст должен точно совпадать с текстом в базе (включая знаки препинания)

### Вариант 2: CSV формат

Создайте файл `transcriptions.csv`:
```csv
portuguese_text,ipa_transcription
"Acho que isso faz sentido para mim.","ˈaʃu kɨ ˈisu faʃ sẽˈtidu pɐˈɾɐ mĩ"
"Não tenho a certeza se concordo totalmente.","nɐ̃w ˈtẽɲu ɐ sɨɾˈtezɐ sɨ kõˈkoɾdu totɐɫˈmẽtɨ"
```

### Вариант 3: SQL формат (если хотите создать SQL файл сами)

Создайте файл `transcriptions.sql`:
```sql
UPDATE phrases SET ipa_transcription = 'ˈaʃu kɨ ˈisu faʃ sẽˈtidu pɐˈɾɐ mĩ' WHERE portuguese_text = 'Acho que isso faz sentido para mim.';
UPDATE phrases SET ipa_transcription = 'nɐ̃w ˈtẽɲu ɐ sɨɾˈtezɐ sɨ kõˈkoɾdu totɐɫˈmẽtɨ' WHERE portuguese_text = 'Não tenho a certeza se concordo totalmente.';
```

## Инструкция

1. **Подготовьте данные** в одном из форматов выше
2. **Проверьте**, что португальский текст точно совпадает (включая точки, запятые, знаки вопроса)
3. **Отправьте файл** мне, и я создам SQL скрипт для добавления в базу данных

## После получения файла

Я создам SQL скрипт, который:
1. Обновит поле `ipa_transcription` для всех фраз
2. Можно будет запустить в Supabase SQL Editor
3. Все транскрипции появятся в приложении

## Проверка после добавления

После выполнения SQL скрипта проверьте:
- Транскрипции отображаются на странице плеера
- Нет ошибок в консоли браузера
- Все фразы имеют транскрипции








