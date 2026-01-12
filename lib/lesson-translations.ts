/**
 * Utility functions for getting translated texts from lesson YAML data
 */

type AppLanguage = 'en' | 'ru' | 'pt';

/**
 * Get translated text from an object that can have language-specific fields
 * Supports both old format (string) and new format (object with ru/en)
 */
export function getTranslatedText(
  textOrObject: string | { ru?: string; en?: string; pt?: string } | undefined,
  language: AppLanguage
): string {
  if (!textOrObject) return '';
  
  // If it's a string (old format), return as is
  if (typeof textOrObject === 'string') {
    return textOrObject;
  }
  
  // If it's an object with language keys
  if (typeof textOrObject === 'object') {
    // Try to get the requested language, fallback to ru, then en, then pt, then empty string
    return textOrObject[language] || textOrObject.ru || textOrObject.en || textOrObject.pt || '';
  }
  
  return '';
}

/**
 * Get day title with translation support
 */
export function getDayTitle(dayData: any, language: AppLanguage): string {
  if (!dayData) return '';
  return getTranslatedText(dayData.title, language);
}

/**
 * Get day subtitle with translation support
 */
export function getDaySubtitle(dayData: any, language: AppLanguage): string {
  if (!dayData) return '';
  return getTranslatedText(dayData.subtitle, language);
}

/**
 * Get task title with translation support
 */
export function getTaskTitle(task: any, language: AppLanguage): string {
  if (!task) return '';
  return getTranslatedText(task.title, language);
}

/**
 * Get task subtitle with translation support
 */
export function getTaskSubtitle(task: any, language: AppLanguage): string {
  if (!task) return '';
  return getTranslatedText(task.subtitle, language);
}

/**
 * Get completion message with translation support
 */
export function getCompletionMessage(task: any, language: AppLanguage): string {
  if (!task) return '';
  return getTranslatedText(task.completion_message, language);
}

/**
 * Get block title with translation support (for Rules task)
 */
export function getBlockTitle(block: any, language: AppLanguage): string {
  if (!block) return '';
  return getTranslatedText(block.title, language);
}

/**
 * Get block explanation text with translation support
 */
export function getBlockExplanationText(block: any, language: AppLanguage): string {
  if (!block) return '';
  return getTranslatedText(block.explanation_text, language);
}

/**
 * Get block note with translation support
 */
export function getBlockNote(block: any, language: AppLanguage): string {
  if (!block) return '';
  return getTranslatedText(block.note, language);
}

/**
 * Get instruction text with translation support
 * Supports both block.instruction_text and instruction.text formats
 */
export function getInstructionText(blockOrInstruction: any, language: AppLanguage): string {
  if (!blockOrInstruction) return '';
  // For speak_out_loud blocks, instruction_text is at the block level
  // For other blocks, it might be in instruction.text
  let text = blockOrInstruction.instruction_text;
  if (!text) {
    text = blockOrInstruction.instruction?.text || blockOrInstruction.instruction || blockOrInstruction.text || blockOrInstruction;
  }
  return getTranslatedText(text, language);
}

/**
 * Get hint text with translation support
 * Hint can be a string or an array of strings, each can have translations
 */
export function getHintText(hint: string | { ru?: string; en?: string }, language: AppLanguage): string {
  if (!hint) return '';
  return getTranslatedText(hint, language);
}

/**
 * Get question text with translation support (for reinforcement tasks)
 */
export function getQuestionText(task: any, language: AppLanguage): string {
  if (!task || !task.question) return '';
  return getTranslatedText(task.question, language);
}

/**
 * Get situation text with translation support (for reinforcement tasks)
 */
export function getSituationText(task: any, language: AppLanguage): string {
  if (!task || !task.situation_text) return '';
  return getTranslatedText(task.situation_text, language);
}

