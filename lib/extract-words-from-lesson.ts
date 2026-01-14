/**
 * Extract words from a lesson's vocabulary task (Task 1)
 */
export function extractWordsFromLesson(yamlContent: any): string[] {
  const words: string[] = [];
  
  if (!yamlContent || !yamlContent.tasks) {
    return words;
  }

  const tasks = yamlContent.tasks;
  const vocabularyTask = tasks.find((t: any) => t.type === 'vocabulary' && t.task_id === 1);
  
  if (!vocabularyTask) {
    return words;
  }

  // Extract words from cards
  if (vocabularyTask.content && vocabularyTask.content.cards) {
    vocabularyTask.content.cards.forEach((card: any) => {
      if (card.word && typeof card.word === 'string') {
        const word = card.word.trim();
        if (word && word.length > 0) {
          words.push(word);
        }
      }
    });
  }
  
  // Extract words from blocks (if structure uses blocks)
  if (vocabularyTask.blocks) {
    const blocks = Array.isArray(vocabularyTask.blocks) 
      ? vocabularyTask.blocks 
      : Object.values(vocabularyTask.blocks);
    
    blocks.forEach((block: any) => {
      if (block.content && block.content.cards) {
        block.content.cards.forEach((card: any) => {
          if (card.word && typeof card.word === 'string') {
            const word = card.word.trim();
            if (word && word.length > 0) {
              words.push(word);
            }
          }
        });
      }
    });
  }

  return words;
}

