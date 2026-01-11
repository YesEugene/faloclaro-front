'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppLanguage } from '@/lib/language-context';
import { getBlockTitle, getBlockExplanationText, getBlockNote, getInstructionText, getHintText, getQuestionText, getSituationText, getTranslatedText } from '@/lib/lesson-translations';

interface RulesTaskProps {
  task: any;
  language: string;
  onComplete: (completionData?: any) => void;
  isCompleted: boolean;
  savedAnswers?: { [key: string]: string | null };
  savedShowResults?: { [key: string]: boolean };
  savedSpeakOutLoudCompleted?: boolean;
  onNextTask?: () => void;
  onPreviousTask?: () => void;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  progressCompleted?: number;
  progressTotal?: number;
}

export default function RulesTask({ task, language, onComplete, isCompleted, savedAnswers, savedShowResults, savedSpeakOutLoudCompleted, onNextTask, onPreviousTask, canGoNext = false, canGoPrevious = false, progressCompleted = 0, progressTotal = 5 }: RulesTaskProps) {
  const { language: appLanguage } = useAppLanguage();
  // Use ref to track if we've initialized to prevent reset on re-render
  const initializedRef = useRef(false);
  const lastBlockIndexRef = useRef<number | null>(null);
  
  // Initialize with saved block index if available, otherwise start from last block if task is completed
  const [currentBlockIndex, setCurrentBlockIndex] = useState(() => {
    // If task is completed and we have saved data, try to restore the last block index
    if (isCompleted && savedSpeakOutLoudCompleted) {
      // If speak out loud was completed, we were on the last block
      const blocksOrder = task?.structure?.blocks_order || [];
      const lastIndex = blocksOrder.length > 0 ? blocksOrder.length - 1 : 0;
      lastBlockIndexRef.current = lastIndex;
      initializedRef.current = true;
      return lastIndex;
    }
    initializedRef.current = true;
    return 0;
  });
  
  // Prevent reset of currentBlockIndex when isCompleted changes after user interaction
  useEffect(() => {
    // If we've already initialized and user is on a block, don't reset
    if (initializedRef.current && lastBlockIndexRef.current !== null && currentBlockIndex === lastBlockIndexRef.current) {
      // User is on the last block, keep them there even if isCompleted changes
      return;
    }
    // Only update if we haven't initialized yet and task is completed
    if (!initializedRef.current && isCompleted && savedSpeakOutLoudCompleted) {
      const blocksOrder = task?.structure?.blocks_order || [];
      if (blocksOrder.length > 0) {
        const lastIndex = blocksOrder.length - 1;
        setCurrentBlockIndex(lastIndex);
        lastBlockIndexRef.current = lastIndex;
        initializedRef.current = true;
      }
    }
  }, [isCompleted, savedSpeakOutLoudCompleted, task?.structure?.blocks_order, currentBlockIndex]);
  const [audioUrls, setAudioUrls] = useState<{ [key: string]: string }>({});
  const [isPlayingAudio, setIsPlayingAudio] = useState<{ [key: string]: boolean }>({});
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: string | null }>(savedAnswers || {});
  const [showResults, setShowResults] = useState<{ [key: string]: boolean }>(savedShowResults || {});
  const [speakOutLoudCompleted, setSpeakOutLoudCompleted] = useState(savedSpeakOutLoudCompleted || false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [localIsCompleted, setLocalIsCompleted] = useState(isCompleted);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  
  // Load saved answers and state from completion_data if task was already completed
  // Only load once on mount, not on every prop change
  const [hasLoadedSavedData, setHasLoadedSavedData] = useState(false);
  useEffect(() => {
    if (!hasLoadedSavedData) {
      if (savedAnswers && Object.keys(savedAnswers).length > 0) {
        console.log('📥 Loading saved answers:', savedAnswers);
        setSelectedAnswers(savedAnswers);
      }
      if (savedShowResults && Object.keys(savedShowResults).length > 0) {
        console.log('📥 Loading saved showResults:', savedShowResults);
        setShowResults(savedShowResults);
      }
      if (savedSpeakOutLoudCompleted) {
        console.log('📥 Loading saved speakOutLoudCompleted: true');
        setSpeakOutLoudCompleted(true);
      }
      setHasLoadedSavedData(true);
    }
  }, [savedAnswers, savedShowResults, savedSpeakOutLoudCompleted, hasLoadedSavedData]);

  // Update local completion state when prop changes
  // But don't reset if we're in replay mode
  useEffect(() => {
    if (!isReplaying) {
      setLocalIsCompleted(isCompleted);
    }
    // Don't reset currentBlockIndex when isCompleted changes
    // User should stay on the current block after completing
  }, [isCompleted, isReplaying]);

  // Get progress message based on completed tasks
  const getProgressMessage = (completed: number, total: number) => {
    if (appLanguage === 'ru') {
      if (completed === 1) return 'Назад дороги нет.';
      if (completed === 2) return 'Поймали ритм.';
      if (completed === 3) return 'Ты просто Вау!';
      if (completed === 4) return 'Почти финиш.';
      if (completed === 5) return 'Можно собой гордиться.';
      return '';
    } else {
      if (completed === 1) return 'No turning back.';
      if (completed === 2) return 'Catching the rhythm.';
      if (completed === 3) return "You're just Wow!";
      if (completed === 4) return 'Almost finish.';
      if (completed === 5) return 'You can be proud.';
      return '';
    }
  };

  // Parse task structure
  // Support both old structure (blocks object) and new structure (blocks array)
  const getBlocksStructure = () => {
    if (Array.isArray(task.blocks)) {
      // New structure: blocks is an array
      // Convert array to object for backward compatibility
      const blocksObj: { [key: string]: any } = {};
      const blocksOrder: string[] = [];
      
      task.blocks.forEach((block: any, index: number) => {
        const blockId = block.block_id || block.id || `block_${index + 1}`;
        blocksObj[blockId] = {
          ...block,
          type: block.block_type || block.type || 'explanation',
          // Ensure content is extracted correctly
          examples: block.content?.examples || block.examples,
          comparison_card: block.content?.comparison_card || block.comparison_card,
          task_1: block.content?.task_1 || block.task_1,
          task_2: block.content?.task_2 || block.task_2,
          hint: block.content?.hint || block.hint,
          note: block.content?.note || block.note,
          title: block.content?.title || block.title,
          explanation_text: block.content?.explanation_text || block.explanation_text,
          instruction_text: block.content?.instruction_text || block.instruction_text,
          action_button: block.content?.action_button || block.action_button,
        };
        blocksOrder.push(blockId);
      });
      
      return {
        blocks: blocksObj,
        blocksOrder,
        structure: {
          blocks_order: blocksOrder,
        },
      };
    } else if (task.blocks && typeof task.blocks === 'object' && !Array.isArray(task.blocks)) {
      // Old structure: blocks is an object
      const structure = task.structure || {};
      const blocksOrder = structure.blocks_order || Object.keys(task.blocks);
      return {
        blocks: task.blocks,
        blocksOrder,
        structure,
      };
    }
    // Fallback: empty structure
    return {
      blocks: {},
      blocksOrder: [],
      structure: {},
    };
  };

  const { blocks, blocksOrder, structure } = getBlocksStructure();

  // Don't auto-reset - let user explicitly click "Пройти заново" to reset

  // Debug: Log task structure
  useEffect(() => {
    console.log('🔍 RulesTask Debug:', {
      hasTask: !!task,
      taskType: task?.type,
      hasStructure: !!task?.structure,
      hasBlocks: !!task?.blocks,
      blocksOrder: blocksOrder,
      blocksKeys: Object.keys(blocks),
      currentBlockIndex,
      currentBlockKey: blocksOrder[currentBlockIndex],
      currentBlock: blocksOrder[currentBlockIndex] ? blocks[blocksOrder[currentBlockIndex]] : null,
      isCompleted,
      isReplaying,
      fullTask: task
    });
  }, [task, blocksOrder, blocks, currentBlockIndex, isCompleted, isReplaying]);

  // Get current block
  const currentBlockKey = blocksOrder[currentBlockIndex];
  const currentBlock = currentBlockKey ? blocks[currentBlockKey] : null;

  // Load audio URLs for all text examples
  useEffect(() => {
    const loadAudioUrls = async () => {
      const urls: { [key: string]: string } = {};
      const textsToLoad: string[] = [];

      // Collect all texts that need audio
      blocksOrder.forEach((blockKey: string) => {
        const block = blocks[blockKey];
        if (!block) return;

        if (block.type === 'explanation' && block.examples) {
          block.examples.forEach((example: any) => {
            if (example.audio && example.text) {
              textsToLoad.push(example.text);
            }
          });
        } else if (block.type === 'comparison' && block.comparison_card) {
          block.comparison_card.forEach((card: any) => {
            if (card.audio && card.text) {
              textsToLoad.push(card.text);
            }
          });
        } else if (block.type === 'reinforcement') {
          if (block.task_1?.audio) {
            textsToLoad.push(block.task_1.audio);
          }
        }
      });

      // Load audio URLs from database or Storage
      for (const text of textsToLoad) {
        if (urls[text]) continue; // Already loaded

        // Try to find in phrases table
        try {
          const { data: phraseArray } = await supabase
            .from('phrases')
            .select('audio_url')
            .eq('portuguese_text', text)
            .limit(1);

          if (phraseArray && phraseArray.length > 0 && phraseArray[0]?.audio_url) {
            urls[text] = phraseArray[0].audio_url;
            continue;
          }
        } catch (error) {
          console.warn(`Error loading audio for "${text}":`, error);
        }

        // Fallback to Storage
        const sanitizeForUrl = (text: string) => {
          return text
            .toLowerCase()
            .trim()
            .replace(/[^\w\s\-àáâãäåèéêëìíîïòóôõöùúûüçñ]/g, '')
            .replace(/[àáâãäå]/g, 'a')
            .replace(/[èéêë]/g, 'e')
            .replace(/[ìíîï]/g, 'i')
            .replace(/[òóôõö]/g, 'o')
            .replace(/[ùúûü]/g, 'u')
            .replace(/[ç]/g, 'c')
            .replace(/[ñ]/g, 'n')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 100);
        };

        const sanitized = sanitizeForUrl(text);
        const filename = `lesson-1-task2-${sanitized}.mp3`;
        const storagePath = `lesson-1/${filename}`;
        
        const { data: urlData } = supabase.storage
          .from('audio')
          .getPublicUrl(storagePath);
        
        if (urlData?.publicUrl) {
          urls[text] = urlData.publicUrl;
        }
      }

      setAudioUrls(urls);
    };

    if (blocksOrder.length > 0) {
      loadAudioUrls();
    }
  }, [blocksOrder, blocks]);

  // Play audio function
  const playAudio = useCallback(async (text: string) => {
    const audioUrl = audioUrls[text];
    if (!audioUrl) {
      console.warn(`No audio URL for: "${text}"`);
      return;
    }

    // Stop any currently playing audio
    Object.values(audioRefs.current).forEach(audio => {
      if (audio && !audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    });

    // Create or get audio element
    if (!audioRefs.current[text]) {
      const audio = new Audio(audioUrl);
      audio.crossOrigin = 'anonymous';
      audioRefs.current[text] = audio;
    }

    const audio = audioRefs.current[text];
    setIsPlayingAudio(prev => ({ ...prev, [text]: true }));

    try {
      await audio.play();
      audio.onended = () => {
        setIsPlayingAudio(prev => ({ ...prev, [text]: false }));
      };
      audio.onerror = () => {
        setIsPlayingAudio(prev => ({ ...prev, [text]: false }));
        console.error(`Error playing audio for: "${text}"`);
      };
    } catch (error) {
      setIsPlayingAudio(prev => ({ ...prev, [text]: false }));
      console.error(`Error playing audio:`, error);
    }
  }, [audioUrls]);

  // Handle answer selection for reinforcement tasks
  const handleAnswerSelect = (taskKey: string, answer: string) => {
    const updatedAnswers = { ...selectedAnswers, [taskKey]: answer };
    const updatedShowResults = { ...showResults, [taskKey]: true };
    
    setSelectedAnswers(updatedAnswers);
    setShowResults(updatedShowResults);
    
    // Check if all tasks in this reinforcement block are completed
    // We need to check with updated state, not current state
    const hasTask1 = !!currentBlock.task_1;
    const hasTask2 = !!currentBlock.task_2;
    const allTasksCompleted = (!hasTask1 || updatedShowResults['task_1']) && (!hasTask2 || updatedShowResults['task_2']);
    
    // Only mark task as completed if this is the LAST block (speak_out_loud block is index 4, which is last)
    // AND all reinforcement tasks are completed
    if (currentBlockIndex === blocksOrder.length - 1 && currentBlock.type === 'reinforcement' && allTasksCompleted) {
      setLocalIsCompleted(true);
      // Save all answers and state
      onComplete({
        selectedAnswers: updatedAnswers, // Save all selected answers
        showResults: updatedShowResults, // Save all show results
        speakOutLoudCompleted, // Save speak out loud completion state
        completedAt: new Date().toISOString(),
      });
    }
    // If this is NOT the last block (e.g., block 4 reinforcement, but block 5 is speak_out_loud),
    // we should NOT mark task as completed - user should continue to next block
  };
  
  // Check if all reinforcement tasks are completed
  const checkAllReinforcementTasksCompleted = (): boolean => {
    if (currentBlock.type !== 'reinforcement') return false;
    
    const hasTask1 = !!currentBlock.task_1;
    const hasTask2 = !!currentBlock.task_2;
    
    if (hasTask1 && !showResults['task_1']) return false;
    if (hasTask2 && !showResults['task_2']) return false;
    
    return true;
  };

  // Handle next block
  const handleNextBlock = () => {
    if (currentBlockIndex < blocksOrder.length - 1) {
      const nextIndex = currentBlockIndex + 1;
      setCurrentBlockIndex(nextIndex);
      lastBlockIndexRef.current = nextIndex; // Track the last block user was on
    }
  };

  // Handle previous block
  const handlePreviousBlock = () => {
    if (currentBlockIndex > 0) {
      setCurrentBlockIndex(prev => prev - 1);
    }
  };

  // Handle speak out loud completion
  const handleSpeakOutLoudComplete = () => {
    console.log('🎯 handleSpeakOutLoudComplete called', {
      currentBlockIndex,
      blocksOrderLength: blocksOrder.length,
      isLastBlock: currentBlockIndex === blocksOrder.length - 1,
      speakOutLoudCompleted,
      selectedAnswers,
      showResults
    });
    setSpeakOutLoudCompleted(true);
    // Mark task as completed if this is the last block and last action
    if (currentBlockIndex === blocksOrder.length - 1) {
      console.log('✅ Last block completed, calling onComplete');
      setLocalIsCompleted(true); // Update local state immediately
      // Complete the task - save all answers and state
      onComplete({
        selectedAnswers, // Save all selected answers
        showResults, // Save all show results
        speakOutLoudCompleted: true, // Save speak out loud completion
        completedAt: new Date().toISOString(),
      });
    }
  };
  
  // Handle replay - reset all progress and go to first block
  const handleReplay = () => {
    console.log('🔄 handleReplay called - resetting task');
    setHasUserInteracted(true); // Mark that user explicitly clicked replay
    setCurrentBlockIndex(0);
    lastBlockIndexRef.current = 0; // Reset tracked block index
    setSpeakOutLoudCompleted(false);
    setSelectedAnswers({});
    setShowResults({});
    setIsReplaying(true);
    setLocalIsCompleted(false); // Reset local completion state
  };

  // Render block based on type
  const renderBlock = () => {
    if (!currentBlock) return null;

    // Support both old structure (type) and new structure (block_type)
    const blockType = currentBlock.block_type || currentBlock.type;
    
    // Ensure blockType is a string, not an object
    const normalizedBlockType = typeof blockType === 'string' ? blockType : 'explanation';
    
    // Ensure currentBlock has required structure
    if (!normalizedBlockType || normalizedBlockType === 'unknown') {
      return (
        <div className="text-center text-red-600">
          {appLanguage === 'ru' ? 'Ошибка: тип блока не определен' : 'Error: block type is undefined'}
          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(currentBlock, null, 2)}
          </pre>
        </div>
      );
    }

    switch (normalizedBlockType) {
      case 'explanation':
    return (
          <div className="space-y-4">
            {/* Block indicator - above title */}
            <div className="text-sm text-gray-500 mb-2">
              {appLanguage === 'ru' 
                ? `Блок ${currentBlockIndex + 1} / ${blocksOrder.length}`
                : `Block ${currentBlockIndex + 1} / ${blocksOrder.length}`}
            </div>
            <h3 className="text-xl font-bold text-black mb-4">{getBlockTitle(currentBlock, appLanguage)}</h3>
            <p className="text-gray-700 whitespace-pre-line mb-4">{getBlockExplanationText(currentBlock, appLanguage)}</p>
            
            {currentBlock.examples && currentBlock.examples.length > 0 && (
              <div className="space-y-3">
                {currentBlock.examples.map((example: any, index: number) => (
                  <div 
                    key={index} 
                    className="p-4"
                    style={{ 
                      height: '50px',
                      backgroundColor: 'rgba(255, 255, 255, 1)',
                      borderRadius: '6px',
                      border: 'none'
                    }}
                  >
                    <div className="flex items-center justify-between" style={{ height: '10px', marginTop: '3px', marginBottom: '3px' }}>
                      <p className="text-black font-medium text-lg">{example.text}</p>
                      {example.audio && audioUrls[example.text] && (
                        <button
                          onClick={() => playAudio(example.text)}
                          disabled={isPlayingAudio[example.text]}
                          className="flex-shrink-0 ml-3 transition-colors"
                          style={{
                            width: '30px',
                            height: '30px',
                            paddingTop: '0px',
                            paddingBottom: '0px',
                            paddingLeft: '11px',
                            paddingRight: '11px',
                            borderRadius: '0px',
                            backgroundColor: 'transparent',
                            color: 'rgba(255, 255, 255, 0.58)'
                          }}
                        >
                          {isPlayingAudio[example.text] ? (
                            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'rgba(59, 130, 246, 1)' }}>
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {currentBlock.hint && currentBlock.hint.length > 0 && (
              <div 
                className="rounded-lg p-4 mt-4"
                style={{ 
                  borderWidth: '1px',
                  borderColor: 'rgba(194, 194, 194, 1)',
                  borderStyle: 'solid',
                  backgroundColor: '#F4F5F8'
                }}
              >
                <p className="text-sm font-semibold mb-2" style={{ color: 'rgba(0, 0, 0, 1)', backgroundClip: 'unset', WebkitBackgroundClip: 'unset' }}>
                  {appLanguage === 'ru' ? 'Подсказка:' : 'Hint:'}
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {currentBlock.hint.map((hint: string | { ru?: string; en?: string }, index: number) => (
                    <li key={index} className="text-sm" style={{ color: 'rgba(0, 0, 0, 1)', marginTop: '2px', marginBottom: '2px' }}>{getHintText(hint, appLanguage)}</li>
                  ))}
                </ul>
              </div>
            )}
      </div>
    );

      case 'comparison':
        return (
          <div className="space-y-4">
            {/* Block indicator - above title */}
            <div className="text-sm text-gray-500 mb-2">
              {appLanguage === 'ru' 
                ? `Блок ${currentBlockIndex + 1} / ${blocksOrder.length}`
                : `Block ${currentBlockIndex + 1} / ${blocksOrder.length}`}
            </div>
            <h3 className="text-xl font-bold text-black mb-4">{getBlockTitle(currentBlock, appLanguage)}</h3>
            
            {currentBlock.comparison_card && (
              <div className="grid grid-cols-1 gap-4">
                {currentBlock.comparison_card.map((card: any, index: number) => (
                  <div 
                    key={index} 
                    className="p-4"
                    style={{ 
                      height: '50px',
                      backgroundColor: 'rgba(255, 255, 255, 1)',
                      borderRadius: '6px',
                      border: 'none'
                    }}
                  >
                    <div className="flex items-center justify-between" style={{ height: '9px', marginTop: '3px', marginBottom: '3px' }}>
                      <p className="text-black font-medium text-lg">{card.text}</p>
                      {card.audio && audioUrls[card.text] && (
                        <button
                          onClick={() => playAudio(card.text)}
                          disabled={isPlayingAudio[card.text]}
                          className="flex-shrink-0 ml-3 transition-colors"
                          style={{
                            width: '30px',
                            height: '30px',
                            paddingTop: '0px',
                            paddingBottom: '0px',
                            paddingLeft: '11px',
                            paddingRight: '11px',
                            borderRadius: '0px',
                            backgroundColor: 'transparent',
                            color: 'rgba(255, 255, 255, 0.58)'
                          }}
                        >
                          {isPlayingAudio[card.text] ? (
                            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'rgba(59, 130, 246, 1)' }}>
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {currentBlock.note && (
              <div 
                className="rounded-lg p-4 mt-4"
                style={{ 
                  borderWidth: '1px',
                  borderColor: 'rgba(194, 194, 194, 1)',
                  borderStyle: 'solid',
                  backgroundColor: '#F4F5F8'
                }}
              >
                <p className="text-sm text-gray-700 whitespace-pre-line">{getBlockNote(currentBlock, appLanguage)}</p>
              </div>
            )}
          </div>
        );

      case 'reinforcement':
  return (
    <div className="space-y-6">
            {/* Block indicator - above title */}
            <div className="text-sm text-gray-500 mb-2">
              {appLanguage === 'ru' 
                ? `Блок ${currentBlockIndex + 1} / ${blocksOrder.length}`
                : `Block ${currentBlockIndex + 1} / ${blocksOrder.length}`}
            </div>
            
            {/* Block title */}
            <h2 className="text-xl font-bold text-black mb-4">
              {appLanguage === 'ru' 
                ? 'Проверим, понятен ли смысл'
                : 'Let\'s check if the meaning is clear'}
            </h2>
            
            {/* Task 1: Single Choice */}
            {currentBlock.task_1 && (
              <div className="space-y-4">
                <p className="text-lg font-semibold text-black mb-4">{getQuestionText(currentBlock.task_1, appLanguage)}</p>
                
                {currentBlock.task_1.audio && (
                  <div className="flex items-center justify-center mb-4">
                    <button
                      onClick={() => playAudio(currentBlock.task_1.audio)}
                      disabled={isPlayingAudio[currentBlock.task_1.audio]}
                      className="p-4 rounded-full transition-colors"
                      style={{ backgroundColor: '#F4F5F8' }}
                    >
                      {isPlayingAudio[currentBlock.task_1.audio] ? (
                        <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
                
            <div className="space-y-2">
                  {currentBlock.task_1.options?.map((option: any, index: number) => {
                    const taskKey = 'task_1';
                    // Always ensure optionText is a string, never an object
                    let optionText: string = getTranslatedText(option.text, appLanguage);
                    if (!optionText || typeof optionText !== 'string') {
                      // Fallback if getTranslatedText returns invalid value
                      if (typeof option.text === 'string') {
                        optionText = option.text;
                      } else if (option.text && typeof option.text === 'object') {
                        optionText = option.text.pt || option.text.portuguese || option.text.ru || option.text.en || String(option.text);
                      } else {
                        optionText = String(option.text || '');
                      }
                    }
                    const isSelected = selectedAnswers[taskKey] === optionText || (option.text && typeof option.text === 'object' && selectedAnswers[taskKey] === getTranslatedText(option.text, appLanguage));
                    const isCorrect = option.correct;
                    const showResult = showResults[taskKey];
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(taskKey, optionText)}
                        disabled={showResult}
                        className={`w-full text-left p-4 rounded-lg transition-colors ${
                          showResult
                            ? isCorrect
                              ? 'bg-green-100 border-2 border-green-500'
                              : isSelected && !isCorrect
                              ? 'bg-red-100 border-2 border-red-500'
                              : 'bg-white border-0' // Невыбранные варианты остаются белыми
                            : 'bg-white border-0'
                        }`}
                        style={{
                          backgroundColor: showResult
                            ? (isCorrect 
                                ? 'rgb(220 252 231)' 
                                : (isSelected && !isCorrect 
                                    ? 'rgb(254 226 226)' 
                                    : 'white')) // Невыбранные варианты остаются белыми
                            : 'white',
                          border: showResult
                            ? (isCorrect 
                                ? '2px solid rgb(34 197 94)' 
                                : (isSelected && !isCorrect 
                                    ? '2px solid rgb(239 68 68)' 
                                    : 'none'))
                            : 'none'
                        }}
                      >
                        {optionText}
                      </button>
                    );
                  })}
                </div>
            </div>
          )}

            {/* Task 2: Can be either Single Choice or Situation to Phrase */}
            {currentBlock.task_2 && (
              <div className="space-y-4 mt-6">
                {/* Show question if it exists (single_choice format), otherwise show situation_text */}
                {currentBlock.task_2.question ? (
                  <>
                    <p className="text-lg font-semibold text-black mb-4">{getQuestionText(currentBlock.task_2, appLanguage)}</p>
                    
                    {currentBlock.task_2.audio && (
                      <div className="flex items-center justify-center mb-4">
                        <button
                          onClick={() => playAudio(currentBlock.task_2.audio)}
                          disabled={isPlayingAudio[currentBlock.task_2.audio]}
                          className="p-4 rounded-full transition-colors"
                          style={{ backgroundColor: '#F4F5F8' }}
                        >
                          {isPlayingAudio[currentBlock.task_2.audio] ? (
                            <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-lg font-semibold text-black mb-2">{getSituationText(currentBlock.task_2, appLanguage)}</p>
                )}
                
          <div className="space-y-2">
                  {currentBlock.task_2.options?.map((option: any, index: number) => {
                    const taskKey = 'task_2';
                    // Handle both formats: translated text (single_choice) and plain Portuguese text (situation_to_phrase)
                    // Always ensure optionText is a string, never an object
                    let optionText: string;
                    if (currentBlock.task_2.format === 'single_choice') {
                      optionText = getTranslatedText(option.text, appLanguage);
                    } else {
                      // For situation_to_phrase, option.text might be a string or an object
                      if (typeof option.text === 'string') {
                        optionText = option.text;
                      } else if (option.text && typeof option.text === 'object') {
                        // If it's an object, extract Portuguese text or use getTranslatedText
                        optionText = option.text.pt || option.text.portuguese || getTranslatedText(option.text, appLanguage);
                      } else {
                        // Fallback if option.text is null/undefined or unexpected type
                        optionText = String(option.text || '');
                      }
                    }
                    // Ensure optionText is always a string, never null/undefined
                    if (!optionText || typeof optionText !== 'string') {
                      optionText = '';
                    }
                    const isSelected = selectedAnswers[taskKey] === optionText || (option.text && typeof option.text === 'object' && selectedAnswers[taskKey] === getTranslatedText(option.text, appLanguage));
                    const isCorrect = option.correct;
                    const showResult = showResults[taskKey];
                    
                    return (
              <button
                key={index}
                        onClick={() => handleAnswerSelect(taskKey, optionText)}
                disabled={showResult}
                        className={`w-full text-left p-4 rounded-lg transition-colors ${
                  showResult
                            ? isCorrect
                      ? 'bg-green-100 border-2 border-green-500'
                              : isSelected && !isCorrect
                      ? 'bg-red-100 border-2 border-red-500'
                      : 'bg-white border-0' // Невыбранные варианты остаются белыми
                    : 'bg-white border-0'
                }`}
                style={{
                  backgroundColor: showResult
                    ? (isCorrect 
                        ? 'rgb(220 252 231)' 
                        : (isSelected && !isCorrect 
                            ? 'rgb(254 226 226)' 
                            : 'white')) // Невыбранные варианты остаются белыми
                    : 'white',
                  border: showResult
                    ? (isCorrect 
                        ? '2px solid rgb(34 197 94)' 
                        : (isSelected && !isCorrect 
                            ? '2px solid rgb(239 68 68)' 
                            : 'none'))
                    : 'none'
                }}
              >
                {optionText}
              </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Show "Пройти заново" button if this is the last block and all tasks are completed */}
            {currentBlockIndex === blocksOrder.length - 1 && 
             currentBlock.type === 'reinforcement' && 
             checkAllReinforcementTasksCompleted() && (
              <button
                onClick={handleReplay}
                className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors mt-4"
              >
                {appLanguage === 'ru' ? 'Пройти заново' : 'Replay'}
              </button>
            )}
          </div>
        );

      case 'speak_out_loud':
        // Process instruction_text to make "Olá. Eu sou …" and "Olá. Chamo-me …" bold
        const processInstructionText = (text: string) => {
          if (!text) return text;
          // Replace "Olá. Eu sou …" with bold version
          let processed = text.replace(/(Olá\.\s*Eu sou\s*…)/gi, '<strong>$1</strong>');
          // Replace "Olá. Chamo-me …" with bold version
          processed = processed.replace(/(Olá\.\s*Chamo-me\s*…)/gi, '<strong>$1</strong>');
          return processed;
        };
        
        return (
          <div className="space-y-4">
            {/* Block indicator - above title */}
            <div className="text-sm text-gray-500 mb-2">
              {appLanguage === 'ru' 
                ? `Блок ${currentBlockIndex + 1} / ${blocksOrder.length}`
                : `Block ${currentBlockIndex + 1} / ${blocksOrder.length}`}
            </div>
            <h3 className="text-xl font-bold text-black mb-4">{getBlockTitle(currentBlock, appLanguage)}</h3>
            <p 
              className="text-gray-700 whitespace-pre-line mb-6"
              dangerouslySetInnerHTML={{ __html: processInstructionText(getInstructionText(currentBlock, appLanguage)) }}
            />
            
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔘 Button clicked', {
                  speakOutLoudCompleted,
                  currentBlockIndex,
                  blocksOrderLength: blocksOrder.length
                });
                if (!speakOutLoudCompleted) {
                  // First click: mark as completed (last action in last block)
                  console.log('✅ First click - marking as completed');
                  handleSpeakOutLoudComplete();
                  // DON'T call handleReplay here - just mark as completed
                } else {
                  // Second click: replay (reset to first block)
                  console.log('🔄 Second click - replaying');
                  handleReplay();
                }
              }}
              className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors ${
                !speakOutLoudCompleted
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {!speakOutLoudCompleted
                ? (getTranslatedText(currentBlock.action_button?.text, appLanguage) || (appLanguage === 'ru' ? '✔ Я сказал(а) вслух' : '✔ I said it out loud'))
                : (appLanguage === 'ru' ? 'Пройти заново' : 'Replay')}
            </button>
        </div>
        );

      default:
        return (
          <div className="text-center text-red-600">
            {appLanguage === 'ru' 
              ? `Неизвестный тип блока: ${normalizedBlockType}` 
              : `Unknown block type: ${normalizedBlockType}`}
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(currentBlock, null, 2)}
            </pre>
          </div>
        );
    }
  };

  // Don't hide task when completed - show it so user can replay
  // The completion block with stars will be shown at the bottom
  
  if (!currentBlock) {
    return (
      <div className="text-center text-gray-500">
        {appLanguage === 'ru' ? 'Задание не найдено' : 'Task not found'}
      </div>
    );
  }

  // Don't auto-reset - let user explicitly click "Пройти заново" to reset
  // No useEffect needed - user must manually click replay button

  return (
    <div className="space-y-6 w-full" style={{ paddingBottom: '140px' }}>
      {/* Block Content - Full width - Always show, even if completed */}
      <div className="rounded-lg border-2 border-gray-200 p-6 w-full" style={{ backgroundColor: '#F4F5F8' }}>
        {renderBlock()}
      </div>

      {/* Navigation buttons removed - now handled by bottom panel */}


      {/* Progress Bar - Above navigation panel */}
      <div className="fixed left-0 right-0 z-30" style={{ bottom: '69px', height: '33px', margin: 0, padding: 0 }}>
        <div className="max-w-md mx-auto relative" style={{ height: '100%', margin: 0, padding: 0 }}>
          {/* Progress Bar - Full height with green and gray sections */}
          <div className="absolute inset-0 flex">
            {/* Green section (completed) */}
            <div
              className="transition-all duration-300"
              style={{ 
                width: `${(progressCompleted / progressTotal) * 100}%`,
                backgroundColor: '#B2FDB0'
              }}
            />
            {/* Gray section (remaining) */}
            <div
              className="flex-1"
              style={{ 
                backgroundColor: '#F4F5F9'
              }}
            />
          </div>
          
          {/* Progress Text - Overlay on top of progress bar */}
          <div className="relative flex justify-between items-center h-full px-4" style={{ fontSize: '15px', color: 'rgba(23, 23, 23, 1)', zIndex: 1 }}>
            <span>
              {getProgressMessage(progressCompleted, progressTotal)}
            </span>
            <span>{Math.round((progressCompleted / progressTotal) * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Navigation Panel - Fixed at bottom (Unified navigation: blocks within task OR tasks) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white z-30" style={{ borderRadius: '0px', borderTopLeftRadius: '0px', borderTopRightRadius: '0px', borderBottomRightRadius: '0px', borderBottomLeftRadius: '0px', height: '69px', verticalAlign: 'bottom', marginBottom: '0px', opacity: 1, color: 'rgba(0, 0, 0, 1)' }}>
        <div className="max-w-md mx-auto pt-3 pb-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)', height: '69px', color: 'rgba(0, 0, 0, 1)', paddingLeft: '16px', paddingRight: '16px' }}>
          <div className="flex items-center justify-between gap-4">
            {/* Previous Button - Left */}
            {/* Always show previous button if available: previous task OR previous block */}
            {(() => {
              // If task is completed AND on last block - show previous task button
              if (localIsCompleted && currentBlockIndex === blocksOrder.length - 1) {
                if (canGoPrevious && onPreviousTask) {
                  return (
                    <button
                      onClick={onPreviousTask}
                      className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center"
                      aria-label={appLanguage === 'ru' ? 'Предыдущее задание' : 'Previous task'}
                    >
                      <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  );
                }
              }
              
              // If we're on first block (index 0) but can go to previous task - show previous task button
              if (currentBlockIndex === 0 && canGoPrevious && onPreviousTask) {
                return (
                  <button
                    onClick={onPreviousTask}
                    className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center"
                    aria-label={appLanguage === 'ru' ? 'Предыдущее задание' : 'Previous task'}
                  >
                    <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                );
              }
              
              // If we can go to previous block - show previous block button
              if (currentBlockIndex > 0) {
                return (
                  <button
                    onClick={handlePreviousBlock}
                    className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center"
                    aria-label={appLanguage === 'ru' ? 'Предыдущий блок' : 'Previous block'}
                  >
                    <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                );
              }
              
              // No previous options - show empty spacer
              return <div className="w-10 h-10"></div>;
            })()}

            {/* Task Title - Center */}
            <div className="flex-1 text-center">
              <p className="text-sm font-medium" style={{ color: 'rgba(0, 0, 0, 1)' }}>
                {(() => {
                  const taskId = task?.task_id || 2;
                  if (appLanguage === 'ru') {
                    const titles = {
                      1: '1/5 Слушай и повторяй',
                      2: '2/5 Говорим правильно',
                      3: '3/5 Пойми смысл',
                      4: '4/5 Выбери ситуацию',
                      5: '5/5 Попробуй сам'
                    };
                    return titles[taskId as keyof typeof titles] || `${taskId}/5 Задание`;
                  } else {
                    const titles = {
                      1: '1/5 Listen and repeat',
                      2: '2/5 Speak correctly',
                      3: '3/5 Understand the meaning',
                      4: '4/5 Choose the situation',
                      5: '5/5 Try yourself'
                    };
                    return titles[taskId as keyof typeof titles] || `${taskId}/5 Task`;
                  }
                })()}
              </p>
            </div>

            {/* Next Button - Right */}
            {/* If task is completed AND on last block: show next task button (green), else: show next block button (blue) */}
            {localIsCompleted && currentBlockIndex === blocksOrder.length - 1 ? (
              // Task completed AND on last block - show next task button (green, active)
              canGoNext && onNextTask ? (
                <button
                  onClick={onNextTask}
                  className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center"
                  aria-label={appLanguage === 'ru' ? 'Следующее задание' : 'Next task'}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <div className="w-10 h-10"></div>
              )
            ) : (
              // Task not completed OR not on last block - show next block button (blue, always active)
              currentBlockIndex < blocksOrder.length - 1 ? (
                <button
                  onClick={handleNextBlock}
                  className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center"
                  aria-label={appLanguage === 'ru' ? 'Следующий блок' : 'Next block'}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <div className="w-10 h-10"></div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
