const TASK_ID_BY_TYPE: Record<string, number> = {
  vocabulary: 1,
  rules: 2,
  listening_comprehension: 3,
  listening: 3,
  attention: 4,
  writing_optional: 5,
  writing: 5,
};

function isObject(v: any): v is Record<string, any> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function templateLinesToParts(lines: string[]): any[] {
  return lines.map((line, idx) => ({
    type: 'text',
    text: `${line}${idx < lines.length - 1 ? '\n' : ''}`,
  }));
}

export function normalizeTasksArray(input: any[]): any[] {
  const tasks = Array.isArray(input) ? input.filter((t) => t && typeof t === 'object') : [];
  const normalized = tasks.map((t) => ({ ...(t as any) }));

  // Normalize type aliases early.
  for (const t of normalized) {
    if (t.type === 'listening') t.type = 'listening_comprehension';
    if (t.type === 'writing') t.type = 'writing_optional';
  }

  // Fix missing task_id using type mapping.
  for (const t of normalized) {
    const inferred = TASK_ID_BY_TYPE[String(t.type || '')];
    if (!t.task_id && inferred) t.task_id = inferred;
  }

  // Fix Task 5 shape if it comes in as the wrong legacy format.
  const maybeT5 = normalized.find((t) => t.task_id === 5) || normalized.find((t) => t.type === 'writing_optional');
  if (maybeT5) {
    // Some bad exports/models used: main_task: string[]
    if (Array.isArray(maybeT5.main_task)) {
      const lines = maybeT5.main_task.filter((x: any) => typeof x === 'string').map((s: string) => s.trimEnd()).filter(Boolean);
      maybeT5.main_task = {
        format: 'template_fill_or_speak',
        template: lines,
        template_parts: templateLinesToParts(lines),
      };
    }
    // Ensure main_task is an object with template array.
    if (!isObject(maybeT5.main_task)) {
      maybeT5.main_task = { format: 'template_fill_or_speak', template: [] };
    }
    if (Array.isArray(maybeT5.main_task.template) && maybeT5.main_task.template.length > 0 && typeof maybeT5.main_task.template[0] !== 'string') {
      // If template is accidentally stored as parts/objects, best-effort stringify.
      maybeT5.main_task.template = maybeT5.main_task.template.map((v: any) => (typeof v === 'string' ? v : String(v?.text ?? v?.content ?? ''))).filter(Boolean);
    }
    if (!Array.isArray(maybeT5.main_task.template)) {
      maybeT5.main_task.template = [];
    }
    if (!Array.isArray(maybeT5.main_task.template_parts)) {
      maybeT5.main_task.template_parts = templateLinesToParts(maybeT5.main_task.template);
    }
  }

  // Build canonical order 1..5, prefer explicit task_id, then infer by type.
  const byId = new Map<number, any>();
  for (const t of normalized) {
    const id = Number(t.task_id);
    if (id >= 1 && id <= 5 && !byId.has(id)) byId.set(id, t);
  }
  for (const t of normalized) {
    const inferred = TASK_ID_BY_TYPE[String(t.type || '')];
    if (inferred && !byId.has(inferred)) {
      t.task_id = inferred;
      byId.set(inferred, t);
    }
  }

  const out: any[] = [];
  for (let id = 1; id <= 5; id++) {
    const t = byId.get(id);
    if (t) out.push(t);
  }
  return out;
}


