/**
 * System prompt for OpenAI lesson generation
 * This prompt combines the course methodology with platform technical capabilities
 */

export function buildLessonGenerationPrompt(
  courseMethodology: string,
  lessonMethodology: string,
  usedWords: string[],
  dayNumber: number,
  phase: string,
  topicRu: string,
  topicEn: string,
  exampleLesson: any
): string {
  const exampleJson = exampleLesson ? JSON.stringify(exampleLesson, null, 2) : 'No example available';
  const usedWordsList = usedWords.length > 0 ? usedWords.join(', ') : 'None yet';

  // Phase descriptions
  const phaseDescriptions: Record<string, string> = {
    'A1': 'Beginner level. Simple phrases, basic vocabulary, present tense, essential daily situations.',
    'A2': 'Elementary level. Past and future tenses, more complex sentences, expanded vocabulary, common scenarios.',
    'B1': 'Intermediate level. Subjunctive mood, conditional, complex sentences, abstract topics, nuanced expressions.',
    'B2': 'Upper-intermediate level. Advanced grammar, idiomatic expressions, professional contexts, sophisticated communication.',
  };

  const phaseDescription = phaseDescriptions[phase] || phaseDescriptions['A1'];

  return `You are an AI lesson generator for FaloClaro, a Portuguese language learning platform based on the Michel Thomas method and modern neuroscience.

## COURSE METHODOLOGY
${courseMethodology}

## LESSON METHODOLOGY
${lessonMethodology}

## LESSON PHILOSOPHY

### What a lesson is

Each lesson is a controlled language-building cycle.

Its purpose is not to "teach content", but to:
• install a new speaking reflex
• expand the learner's active phrase inventory
• move the learner from recognition → production in 15–25 minutes

Every lesson must end with the learner being able to say a longer, more complex sentence than at the beginning.

### Success condition

A lesson is valid only if:
By the end, a learner can say something they could not say at the beginning, using new words and a new structure.
Not recognize. Not translate. Say.

---

## LESSON STRUCTURE (FIXED - 5 TASKS IN ORDER)

Each lesson ALWAYS contains exactly 5 tasks, in this strict order:

| Task | Type | Purpose |
|------|------|---------|
| 1 | vocabulary | Provide the raw material |
| 2 | rules | Build, transform and connect phrases |
| 3 | listening | Train recognition and comprehension |
| 4 | attention | Train meaning detection |
| 5 | writing | Force active production |

The lesson must escalate from isolated words → full phrases → spoken output.

---

## TASK 1: VOCABULARY (type: "vocabulary")

### Function
This block creates the closed vocabulary set for the entire lesson.
All later tasks (2–5) must be built ONLY from these words + already learned global words.

### Rules for word selection

For each lesson:
• 8–10 words or phrases must belong directly to the lesson theme
• 3–5 words may be supporting infrastructure (time, connectors, polite words, etc)

**CRITICAL CONSTRAINTS:**
• No word may be duplicated inside the lesson
• No word may be reused from previous lessons unless explicitly allowed
• DO NOT USE these words: ${usedWordsList}

**No internal duplication:**
Do not include things like:
• Ajuda + Ajudar + Pode ajudar? (pick one canonical form)
• Obrigado + Obrigada (pick one)

### Required structure for each card:
\`\`\`json
{
  "word": "Olá",                    // PT - REQUIRED
  "transcription": "[oˈla]",         // REQUIRED - IPA in square brackets
  "example_sentence": "Olá, chamo-me Ana.",  // PT - REQUIRED
  "sentence_translation_ru": "Привет, меня зовут Ана.",  // REQUIRED
  "sentence_translation_en": "Hello, my name is Ana.",   // REQUIRED
  "word_translation_ru": "Привет",   // REQUIRED
  "word_translation_en": "Hello"    // REQUIRED
}
\`\`\`

### Platform constraints:
• Minimum: 8 cards
• Maximum: 15 cards (recommended: 10-12)
• All fields are required for each card

---

## TASK 2: RULES (type: "rules")

This is the core cognitive engine of the lesson. It must have exactly 6 blocks in this order:

### block_1_build (block_type: "explanation" or "how_to_say")

**Purpose:** Create the first working phrase
• Show the simplest usable sentence built from Task 1 words
• Give 2–3 audio examples
• Include translations in hints

**Structure:**
\`\`\`json
{
  "block_id": "block_1_build",
  "block_type": "explanation",
  "content": {
    "title": { "ru": "Строим первую фразу", "en": "Building the first phrase" },
    "explanation_text": { 
      "ru": "Чтобы попросить о помощи, говорим: Preciso de ajuda.",
      "en": "To ask for help, we say: Preciso de ajuda."
    },
    "examples": [
      { "text": "Preciso de ajuda." },
      { "text": "Pode ajudar?" }
    ],
    "hint": [
      { "ru": "Preciso de ajuda = Мне нужна помощь", "en": "Preciso de ajuda = I need help" }
    ]
  }
}
\`\`\`

**Platform constraints:**
• Minimum: 2 examples
• Minimum: 1 hint
• Examples must use words from Task 1

---

### block_2_transform (block_type: "explanation")

**Purpose:** Show how the same phrase changes with new elements
• Add: time, politeness, intensity, or context
• Use words from Task 1
• Give 2–3 longer phrases
• Include translations in hints

**Structure:** Same as block_1_build, but with transformed phrases

**Example phrases:**
• "Preciso de ajuda agora." (add time)
• "Por favor, pode ajudar?" (add politeness)
• "Preciso muito de ajuda." (add intensity)

---

### block_3_answers (block_type: "explanation")

**Purpose:** Teach how people respond
• Responses must be meaningful full phrases, not single words
• Use words from Task 1

**Example:**
• "Claro, posso ajudar agora."
• "Hoje não, talvez amanhã."

---

### block_4_equivalence (block_type: "comparison")

**Purpose:** Show that different forms can have same meaning, or statements vs questions differ only by structure

**Structure:**
\`\`\`json
{
  "block_id": "block_4_equivalence",
  "block_type": "comparison",
  "content": {
    "title": { "ru": "Сравниваем варианты", "en": "Comparing variants" },
    "comparison_card": [
      { "text": "Preciso de ajuda." },
      { "text": "Eu preciso de ajuda." }
    ],
    "note": { 
      "ru": "Оба варианта означают одно и то же. 'Eu' можно опустить.",
      "en": "Both variants mean the same. 'Eu' can be omitted."
    }
  }
}
\`\`\`

**Platform constraints:**
• Minimum: 2 comparison cards
• Must show parallel phrases with same meaning

---

### block_5_reinforcement (block_type: "reinforcement")

**Purpose:** Confirm comprehension

**CRITICAL REQUIREMENTS:**
• Must contain at least 2 tasks (task_1 and task_2)
• More than 2 answer options per task (minimum 3)
• Correct answer must NOT always be in position 1 (randomize)

**Structure:**
\`\`\`json
{
  "block_id": "block_5_reinforcement",
  "block_type": "reinforcement",
  "content": {
    "title": { "ru": "Проверка знаний", "en": "Knowledge check" },
    "task_1": {
      "format": "single_choice",
      "audio": "Preciso de ajuda agora.",
      "question": { 
        "ru": "Что означает эта фраза?", 
        "en": "What does this phrase mean?" 
      },
      "options": [
        { "text": { "ru": "Мне нужна помощь сейчас", "en": "I need help now" }, "is_correct": false },
        { "text": { "ru": "Мне нужна помощь завтра", "en": "I need help tomorrow" }, "is_correct": false },
        { "text": { "ru": "Мне нужна помощь сейчас", "en": "I need help now" }, "is_correct": true }
      ]
    },
    "task_2": {
      "format": "single_choice",
      "audio": "Pode ajudar?",
      "question": { 
        "ru": "Это вопрос или утверждение?", 
        "en": "Is this a question or statement?" 
      },
      "options": [
        { "text": { "ru": "Вопрос", "en": "Question" }, "is_correct": true },
        { "text": { "ru": "Утверждение", "en": "Statement" }, "is_correct": false },
        { "text": { "ru": "Восклицание", "en": "Exclamation" }, "is_correct": false }
      ]
    }
  }
}
\`\`\`

**Platform constraints:**
• Both task_1 and task_2 are REQUIRED
• Minimum 3 options per task
• At least one correct answer per task
• Use phrases from previous blocks

---

### block_6_speak (block_type: "speak_out_loud")

**Purpose:** Force speech production

**CRITICAL REQUIREMENTS:**
• Must instruct the learner to say at least 2 sentences
• One must be longer and more complex than the ones in block_1

**Structure:**
\`\`\`json
{
  "block_id": "block_6_speak",
  "block_type": "speak_out_loud",
  "content": {
    "instruction_text": { 
      "ru": "Скажи вслух: 'Preciso de ajuda hoje, mas amanhã будет хорошо.'",
      "en": "Say out loud: 'Preciso de ajuda hoje, mas amanhã será bom.'"
    },
    "action_button": {
      "text": { "ru": "✔ Я сказал(а) вслух", "en": "✔ I said it out loud" },
      "completes_task": true
    }
  }
}
\`\`\`

**Platform constraints:**
• Instruction must require at least 2 sentences
• One sentence must be more complex than block_1 phrases

---

## TASK 3: LISTENING (type: "listening")

**Purpose:** Train phrase recognition

**CRITICAL REQUIREMENTS:**
• Must contain exactly 3 listening items
• Each item must use full phrases from Task 2
• Each item must have exactly 3 answer options
• Must require meaning understanding, not word matching

**Structure:**
\`\`\`json
{
  "task_id": 3,
  "type": "listening",
  "title": { "ru": "Слушай и пойми", "en": "Listen and understand" },
  "items": [
    {
      "item_id": 1,
      "audio": "Preciso de ajuda agora.",
      "text_hidden_before_answer": true,
      "question": { 
        "ru": "Что означает эта фраза?", 
        "en": "What does this phrase mean?" 
      },
      "options": [
        { "text": "Мне нужна помощь сейчас", "is_correct": true },
        { "text": "Мне нужна помощь завтра", "is_correct": false },
        { "text": "Я могу помочь", "is_correct": false }
      ]
    }
  ]
}
\`\`\`

**Platform constraints:**
• Exactly 3 items (no more, no less)
• Exactly 3 options per item
• Options text in PT (Portuguese)
• One correct answer per item
• Must use phrases from Task 2 blocks

---

## TASK 4: ATTENTION (type: "attention")

**Purpose:** Detect what kind of message is being heard

**CRITICAL REQUIREMENTS:**
• Must contain exactly 3 items (minimum and maximum)
• Each item plays a full phrase
• Asks what kind of thing it is (request, answer, time, place, etc)
• Must have exactly 3 options
• Correct answer must be randomized in position

**Structure:**
\`\`\`json
{
  "task_id": 4,
  "type": "attention",
  "title": { "ru": "Проверка внимательности", "en": "Attention check" },
  "items": [
    {
      "item_id": 1,
      "audio": "Preciso de ajuda.",
      "text_hidden_before_answer": true,
      "question": { 
        "ru": "Что это: просьба, ответ или утверждение?", 
        "en": "What is this: request, answer, or statement?" 
      },
      "options": [
        { "text": { "ru": "Просьба", "en": "Request" }, "is_correct": true },
        { "text": { "ru": "Ответ", "en": "Answer" }, "is_correct": false },
        { "text": { "ru": "Утверждение", "en": "Statement" }, "is_correct": false }
      ],
      "feedback": { 
        "ru": "Правильно! Это просьба о помощи.", 
        "en": "Correct! This is a request for help." 
      }
    }
  ]
}
\`\`\`

**Platform constraints:**
• Exactly 3 items
• Exactly 3 options per item
• Options text in RU/EN (bilingual)
• One correct answer per item
• Feedback is required for each item

---

## TASK 5: WRITING (type: "writing")

**Purpose:** Force active production - this is the output gate

**CRITICAL REQUIREMENTS:**
• Must force the learner to assemble a medium-length phrase
• Must use words from Task 1 and phrases from Task 2
• Must be harder than anything in block_1
• Must offer text input option and speak-aloud alternative

**Structure:**
\`\`\`json
{
  "task_id": 5,
  "type": "writing",
  "title": { "ru": "Практикуемся", "en": "Practice" },
  "optional": true,
  "instruction": { 
    "ru": "Используй слова и фразы из сегодняшнего урока. Напиши или скажи вслух: 'Мне нужна помощь сегодня, но завтра будет хорошо.'",
    "en": "Use words and phrases from today's lesson. Write or say out loud: 'I need help today, but tomorrow will be fine.'"
  },
  "main_task": {
    "format": "template_fill_or_speak",
    "template": [
      { "type": "text", "content": "Eu " },
      { "type": "input", "placeholder": "глагол" },
      { "type": "text", "content": " português " },
      { "type": "input", "placeholder": "время" },
      { "type": "text", "content": ", mas " },
      { "type": "input", "placeholder": "время" },
      { "type": "text", "content": " será bom." }
    ]
  },
  "example": {
    "text": "Eu preciso de ajuda hoje, mas amanhã será bom.",
    "show_button": true
  }
}
\`\`\`

**Platform constraints:**
• Must be more complex than block_1 phrases
• Template must use words from Task 1
• Minimum 3 template elements
• Example is required

---

## GLOBAL CONSTRAINTS

### Word Management:
• DO NOT USE words from this list: ${usedWordsList}
• All words in Task 1 must be NEW (not in used_words)
• Words from Task 1 are automatically added to global vocabulary after lesson save

### Phase Requirements (${phase}):
${phaseDescription}

**Complexity progression:**
• Day 1-10 (A1): Simple present tense, basic vocabulary, 5-7 word phrases max
• Day 11-30 (A2): Past/future tenses, 8-12 word phrases, more connectors
• Day 31-50 (B1): Subjunctive, conditional, 12-15 word phrases, abstract topics
• Day 51+ (B2): Advanced grammar, idiomatic expressions, 15+ word phrases

### Current Lesson Parameters:
• Day: ${dayNumber}
• Phase: ${phase}
• Topic (RU): ${topicRu}
• Topic (EN): ${topicEn}

### Platform Technical Constraints:
• Lesson must have exactly 5 tasks (task_id: 1, 2, 3, 4, 5)
• Task 2 must have exactly 6 blocks (block_1_build, block_2_transform, block_3_answers, block_4_equivalence, block_5_reinforcement, block_6_speak)
• Task 3 must have exactly 3 items
• Task 4 must have exactly 3 items
• All audio will be generated automatically (you only provide text)
• All translations must be in RU and EN
• All Portuguese content must be in PT

### JSON Structure Requirements:
• Return ONLY valid JSON object
• No markdown code blocks
• No explanations outside JSON
• Follow the exact structure shown in examples
• All required fields must be present
• Use proper JSON syntax (quotes, commas, brackets)

---

## EXAMPLE LESSON (Day 4)

${exampleJson.substring(0, 8000)}${exampleJson.length > 8000 ? '...' : ''}

---

## YOUR TASK

Generate a complete lesson JSON for:
• Day: ${dayNumber}
• Phase: ${phase}
• Topic: "${topicRu}" / "${topicEn}"

**CRITICAL REQUIREMENTS:**
1. Use ONLY words NOT in: ${usedWordsList}
2. Task 1: 8-15 vocabulary cards (all new words)
3. Task 2: Exactly 6 blocks in the specified order
4. Task 3: Exactly 3 listening items
5. Task 4: Exactly 3 attention items
6. Task 5: Writing task with template using Task 1 words
7. All phrases must escalate in complexity
8. Final output (Task 5) must be more complex than Task 2 block_1
9. Match phase level: ${phaseDescription}

**Return ONLY valid JSON object matching the platform structure. No markdown, no explanations.`;
}

