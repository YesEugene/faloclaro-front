/**
 * Lesson Transformer
 * 
 * Transforms new CRM structure (tasks with blocks) to old frontend structure
 * This ensures all existing frontend components work without changes
 */

export interface TransformedTask {
  task_id: number;
  type: 'vocabulary' | 'rules' | 'listening_comprehension' | 'attention' | 'writing_optional';
  title: { ru: string; en: string } | string;
  subtitle?: { ru: string; en: string } | string;
  estimated_time?: string;
  [key: string]: any; // Allow additional properties
}

/**
 * Determines the frontend task type based on task_type and blocks
 */
function determineFrontendType(task: any): TransformedTask['type'] {
  const taskType = task.task_type;
  const blocks = task.blocks || [];

  // Map task_type + block_type to frontend type
  if (taskType === 'listen_and_repeat') {
    const hasListenBlock = blocks.some((b: any) => b.block_type === 'listen_and_repeat');
    if (hasListenBlock) return 'vocabulary';
  }

  if (taskType === 'speak_correctly') {
    // If has how_to_say, reinforcement, or speak_out_loud blocks → rules
    const hasRulesBlocks = blocks.some((b: any) => 
      ['how_to_say', 'reinforcement', 'speak_out_loud'].includes(b.block_type)
    );
    if (hasRulesBlocks) return 'rules';
  }

  if (taskType === 'understand_meaning') {
    const hasListenPhrase = blocks.some((b: any) => b.block_type === 'listen_phrase');
    if (hasListenPhrase) return 'listening_comprehension';
  }

  if (taskType === 'choose_situation') {
    const hasCheckMeaning = blocks.some((b: any) => b.block_type === 'check_meaning');
    if (hasCheckMeaning) return 'attention';
  }

  if (taskType === 'try_yourself') {
    const hasWriteByHand = blocks.some((b: any) => b.block_type === 'write_by_hand');
    if (hasWriteByHand) return 'writing_optional';
  }

  // Default fallback
  return 'vocabulary';
}

/**
 * Transforms a listen_and_repeat block to vocabulary task format
 */
function transformListenAndRepeatBlock(block: any): any {
  return {
    content: block.content || { cards: [] },
    ui: block.ui || {},
    completion_rule: block.completion_rule,
  };
}

/**
 * Transforms blocks for rules task format
 */
function transformBlocksForRules(blocks: any[]): { structure: any; blocks: any } {
  const blocksOrder = blocks.map((b: any) => b.block_id);
  const blocksObj: any = {};

  blocks.forEach((block: any) => {
    // Transform block based on its type
    const transformedBlock: any = {
      type: block.block_type,
    };

    // Copy content based on block type
    if (block.block_type === 'how_to_say') {
      transformedBlock.title = block.content?.title || {};
      transformedBlock.explanation_text = block.content?.explanation_text || {};
      transformedBlock.examples = block.content?.examples || [];
      transformedBlock.hint = block.content?.hint || [];
    } else if (block.block_type === 'comparison') {
      transformedBlock.comparison_card = block.content?.comparison_card || [];
      transformedBlock.note = block.content?.note || {};
    } else if (block.block_type === 'reinforcement') {
      transformedBlock.task_1 = block.content?.task_1 || null;
      transformedBlock.task_2 = block.content?.task_2 || null;
    } else if (block.block_type === 'speak_out_loud') {
      transformedBlock.instruction_text = block.content?.instruction_text || {};
      transformedBlock.action_button = block.content?.action_button || {};
    } else {
      // Copy all content for unknown block types
      transformedBlock.content = block.content;
    }

    blocksObj[block.block_id] = transformedBlock;
  });

  return {
    structure: {
      blocks_order: blocksOrder,
    },
    blocks: blocksObj,
  };
}

/**
 * Transforms listen_phrase blocks to listening_comprehension items
 */
function transformListenPhraseBlocks(blocks: any[]): any[] {
  const items: any[] = [];

  blocks.forEach((block: any) => {
    if (block.block_type === 'listen_phrase' && block.content?.items) {
      items.push(...block.content.items);
    }
  });

  return items;
}

/**
 * Transforms check_meaning blocks to attention items
 */
function transformCheckMeaningBlocks(blocks: any[]): any[] {
  const items: any[] = [];

  blocks.forEach((block: any) => {
    if (block.block_type === 'check_meaning' && block.content?.items) {
      items.push(...block.content.items);
    }
  });

  return items;
}

/**
 * Transforms write_by_hand block to writing task format
 */
function transformWriteByHandBlock(block: any): any {
  return {
    instruction: block.content?.instruction || {},
    main_task: block.content?.main_task || {},
    example: block.content?.example || {},
    alternative: block.content?.alternative || {},
    reflection: block.content?.reflection || {},
  };
}

/**
 * Main transformer function
 * Converts new CRM structure to old frontend-compatible structure
 */
export function transformLessonForFrontend(lesson: any): any {
  if (!lesson || !lesson.yaml_content) {
    return lesson;
  }

  const yamlContent = typeof lesson.yaml_content === 'string'
    ? JSON.parse(lesson.yaml_content)
    : lesson.yaml_content;

  if (!yamlContent.tasks || !Array.isArray(yamlContent.tasks)) {
    return lesson;
  }

  const transformedTasks: TransformedTask[] = yamlContent.tasks.map((task: any) => {
    const frontendType = determineFrontendType(task);
    const transformedTask: any = {
      task_id: task.task_id,
      type: frontendType,
      title: task.title || {},
      subtitle: task.subtitle || {},
      estimated_time: task.estimated_time,
    };

    // Transform based on frontend type
    switch (frontendType) {
      case 'vocabulary': {
        // Find first listen_and_repeat block
        const listenBlock = task.blocks?.find((b: any) => b.block_type === 'listen_and_repeat');
        if (listenBlock) {
          const transformed = transformListenAndRepeatBlock(listenBlock);
          Object.assign(transformedTask, transformed);
        }
        break;
      }

      case 'rules': {
        // Transform all blocks to rules structure
        const transformed = transformBlocksForRules(task.blocks || []);
        Object.assign(transformedTask, transformed);
        break;
      }

      case 'listening_comprehension': {
        // Transform listen_phrase blocks to items
        const items = transformListenPhraseBlocks(task.blocks || []);
        transformedTask.items = items;
        transformedTask.ui_rules = task.ui_rules || {
          audio_plays_first: true,
          show_text_after_answer: true,
        };
        break;
      }

      case 'attention': {
        // Transform check_meaning blocks to items
        const items = transformCheckMeaningBlocks(task.blocks || []);
        transformedTask.items = items;
        transformedTask.ui_rules = task.ui_rules || {
          audio_plays_first: true,
          show_text_after_answer: true,
          only_known_words: true,
          no_similar_distractors: true,
        };
        break;
      }

      case 'writing_optional': {
        // Find write_by_hand block
        const writeBlock = task.blocks?.find((b: any) => b.block_type === 'write_by_hand');
        if (writeBlock) {
          const transformed = transformWriteByHandBlock(writeBlock);
          Object.assign(transformedTask, transformed);
        }
        transformedTask.optional = task.optional !== false;
        break;
      }
    }

    return transformedTask;
  });

  // Return transformed lesson
  return {
    ...lesson,
    yaml_content: {
      ...yamlContent,
      tasks: transformedTasks,
    },
  };
}

/**
 * Helper to check if lesson uses new structure
 */
export function isNewStructure(lesson: any): boolean {
  if (!lesson?.yaml_content) return false;
  
  const yamlContent = typeof lesson.yaml_content === 'string'
    ? JSON.parse(lesson.yaml_content)
    : lesson.yaml_content;

  if (!yamlContent.tasks || !Array.isArray(yamlContent.tasks)) return false;

  // Check if any task has task_type and blocks (new structure)
  return yamlContent.tasks.some((task: any) => 
    task.task_type && Array.isArray(task.blocks)
  );
}



