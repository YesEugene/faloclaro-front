import { normalizeTasksArray } from '@/lib/lesson-tasks-normalizer';

function isObject(v: any): v is Record<string, any> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function stripAudioUrlsInPlace(root: any) {
  const stack: any[] = [root];
  const seen = new Set<any>();
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== 'object') continue;
    if (seen.has(cur)) continue;
    seen.add(cur);

    if (Array.isArray(cur)) {
      for (const item of cur) stack.push(item);
      continue;
    }

    for (const key of Object.keys(cur)) {
      if (key === 'audio_url') {
        delete cur[key];
        continue;
      }
      stack.push(cur[key]);
    }
  }
}

function normalizeCorrectFlagsInPlace(root: any) {
  const stack: any[] = [root];
  const seen = new Set<any>();
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== 'object') continue;
    if (seen.has(cur)) continue;
    seen.add(cur);

    if (Array.isArray(cur)) {
      for (const item of cur) stack.push(item);
      continue;
    }

    // Normalize options arrays: keep only `correct` in exported JSON.
    if (Array.isArray(cur.options)) {
      for (const opt of cur.options) {
        if (!opt || typeof opt !== 'object') continue;
        if (opt.correct === undefined && opt.is_correct !== undefined) {
          opt.correct = !!opt.is_correct;
        }
        if (opt.is_correct !== undefined) delete opt.is_correct;
      }
    }

    for (const key of Object.keys(cur)) stack.push(cur[key]);
  }
}

function cleanRulesReinforcementBlocksInPlace(task: any) {
  if (!task || task.type !== 'rules' || !Array.isArray(task.blocks)) return;

  for (const block of task.blocks) {
    if (!block || typeof block !== 'object') continue;
    if (block.block_type !== 'reinforcement') continue;

    if (!isObject(block.content)) block.content = {};

    // Some editor states accidentally lift task_1/task_2 to the block root.
    if (block.task_1 && !block.content.task_1) block.content.task_1 = block.task_1;
    if (block.task_2 && !block.content.task_2) block.content.task_2 = block.task_2;
    if (block.task_1) delete block.task_1;
    if (block.task_2) delete block.task_2;
  }
}

function pickDefined(obj: Record<string, any>, keys: string[]) {
  const out: Record<string, any> = {};
  for (const k of keys) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

function canonicalizeRulesBlock(block: any) {
  const out: any = {
    block_id: block.block_id,
    block_type: block.block_type,
  };

  if (isObject(block.content)) {
    if (block.block_type === 'reinforcement') {
      out.content = pickDefined(block.content, ['title', 'task_1', 'task_2']);
    } else if (block.block_type === 'comparison') {
      out.content = pickDefined(block.content, ['title', 'comparison_card', 'note']);
    } else if (block.block_type === 'speak_out_loud') {
      out.content = pickDefined(block.content, ['instruction_text', 'action_button']);
    } else {
      out.content = pickDefined(block.content, ['title', 'explanation_text', 'examples', 'hint', 'hints']);
    }
  }

  return out;
}

function canonicalizeTask(task: any) {
  const type = String(task?.type || '');

  if (type === 'vocabulary') {
    return {
      task_id: task.task_id,
      type: task.type,
      title: task.title,
      subtitle: task.subtitle,
      recommended_time: task.recommended_time,
      completion_rule: task.completion_rule,
      ui: task.ui,
      content: task.content,
      completion_message: task.completion_message,
    };
  }

  if (type === 'rules') {
    return {
      task_id: task.task_id,
      type: task.type,
      title: task.title,
      subtitle: task.subtitle,
      structure: task.structure,
      blocks: Array.isArray(task.blocks) ? task.blocks.map(canonicalizeRulesBlock) : task.blocks,
      completion_message: task.completion_message,
    };
  }

  if (type === 'listening_comprehension') {
    return {
      task_id: task.task_id,
      type: task.type,
      title: task.title,
      subtitle: task.subtitle,
      ui_rules: task.ui_rules,
      items: task.items,
      completion_message: task.completion_message,
    };
  }

  if (type === 'attention') {
    return {
      task_id: task.task_id,
      type: task.type,
      title: task.title,
      subtitle: task.subtitle,
      ui_rules: task.ui_rules,
      items: task.items,
      completion_message: task.completion_message,
    };
  }

  if (type === 'writing_optional') {
    return {
      task_id: task.task_id,
      type: task.type,
      title: task.title,
      subtitle: task.subtitle,
      instruction: task.instruction,
      main_task: task.main_task,
      example: task.example,
      alternative: task.alternative,
      completion_message: task.completion_message,
    };
  }

  // Fallback: keep as-is.
  return task;
}

export function buildAuthoringLessonExport(params: {
  dayNumber: number | null;
  title_ru: string;
  title_en: string;
  title_pt: string;
  subtitle_ru: string;
  subtitle_en: string;
  subtitle_pt: string;
  estimated_time: string;
  tasks: any[];
}) {
  const tasksClone = deepClone(params.tasks || []);
  const normalizedTasks = normalizeTasksArray(tasksClone);

  // Clean up editor artifacts and generated-only fields.
  for (const t of normalizedTasks) cleanRulesReinforcementBlocksInPlace(t);
  stripAudioUrlsInPlace(normalizedTasks);
  normalizeCorrectFlagsInPlace(normalizedTasks);

  const canonicalTasks = normalizedTasks.map(canonicalizeTask);

  return {
    day_number: params.dayNumber,
    title_ru: params.title_ru || '',
    title_en: params.title_en || '',
    title_pt: params.title_pt || '',
    subtitle_ru: params.subtitle_ru || '',
    subtitle_en: params.subtitle_en || '',
    subtitle_pt: params.subtitle_pt || '',
    estimated_time: params.estimated_time || '',
    tasks: canonicalTasks,
    day: {
      day_number: params.dayNumber,
      title: {
        ru: params.title_ru || '',
        en: params.title_en || '',
        pt: params.title_pt || '',
      },
      subtitle: {
        ru: params.subtitle_ru || '',
        en: params.subtitle_en || '',
        pt: params.subtitle_pt || '',
      },
      estimated_time: params.estimated_time || '',
    },
  };
}
