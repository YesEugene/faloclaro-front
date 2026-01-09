/**
 * Utility functions for getting translated texts from lesson YAML data
 */

type AppLanguage = 'en' | 'ru';

/**
 * Get translated text from an object that can have language-specific fields
 * Supports both old format (string) and new format (object with ru/en)
 */
export function getTranslatedText(
  textOrObject: string | { ru?: string; en?: string } | undefined,
  language: AppLanguage
): string {
  if (!textOrObject) return '';
  
  // If it's a string (old format), return as is
  if (typeof textOrObject === 'string') {
    return textOrObject;
  }
  
  // If it's an object with language keys
  if (typeof textOrObject === 'object') {
    // Try to get the requested language, fallback to ru, then en, then empty string
    return textOrObject[language] || textOrObject.ru || textOrObject.en || '';
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
 */
export function getInstructionText(instruction: any, language: AppLanguage): string {
  if (!instruction) return '';
  return getTranslatedText(instruction.text || instruction, language);
}

