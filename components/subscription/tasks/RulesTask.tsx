'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppLanguage } from '@/lib/language-context';

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
      if (completed === 1) return `${completed} / ${total} выполнено. Назад дороги нет.`;
      if (completed === 2) return `${completed} / ${total} выполнено. Поймали ритм.`;
      if (completed === 3) return `${completed} / ${total} выполнено. Ты просто Вау!`;
      if (completed === 4) return `${completed} / ${total} выполнено. Почти финиш.`;
      if (completed === 5) return `${completed} / ${total} выполнено. Можно собой гордиться.`;
      return `${completed} / ${total} выполнено`;
    } else if (appLanguage === 'en') {
      if (completed === 1) return `${completed} / ${total} completed. No turning back.`;
      if (completed === 2) return `${completed} / ${total} completed. Catching the rhythm.`;
      if (completed === 3) return `${completed} / ${total} completed. You're just Wow!`;
      if (completed === 4) return `${completed} / ${total} completed. Almost finish.`;
      if (completed === 5) return `${completed} / ${total} completed. You can be proud.`;
      return `${completed} / ${total} completed`;
    } else {
      if (completed === 1) return `${completed} / ${total} concluído. Não há volta.`;
      if (completed === 2) return `${completed} / ${total} concluído. Pegando o ritmo.`;
      if (completed === 3) return `${completed} / ${total} concluído. Você é simplesmente Uau!`;
      if (completed === 4) return `${completed} / ${total} concluído. Quase no fim.`;
      if (completed === 5) return `${completed} / ${total} concluído. Pode se orgulhar.`;
      return `${completed} / ${total} concluído`;
    }
  };

  // Parse task structure
  // Blocks are at root level of task, not in structure
  const structure = task.structure || {};
  const blocksOrder = structure.blocks_order || [];
  const blocks = task.blocks || {}; // Blocks are at root level

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
    setSelectedAnswers(prev => ({ ...prev, [taskKey]: answer }));
    setShowResults(prev => ({ ...prev, [taskKey]: true }));
    
    // If this is the last block and all tasks are completed, mark task as completed
    if (currentBlockIndex === blocksOrder.length - 1 && currentBlock.type === 'reinforcement') {
      const allTasksCompleted = checkAllReinforcementTasksCompleted();
      if (allTasksCompleted) {
        setLocalIsCompleted(true);
        // Save all answers and state
        onComplete({
          selectedAnswers, // Save all selected answers
          showResults, // Save all show results
          speakOutLoudCompleted, // Save speak out loud completion state
          completedAt: new Date().toISOString(),
        });
      }
    }
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

    switch (currentBlock.type) {
      case 'explanation':
    return (
          <div className="space-y-4">
            {/* Block indicator - above title */}
            <div className="text-sm text-gray-500 mb-2">
              {appLanguage === 'ru' 
                ? `Блок ${currentBlockIndex + 1} / ${blocksOrder.length}`
                : appLanguage === 'en'
                ? `Block ${currentBlockIndex + 1} / ${blocksOrder.length}`
                : `Bloco ${currentBlockIndex + 1} / ${blocksOrder.length}`}
            </div>
            <h3 className="text-xl font-bold text-black mb-4">{currentBlock.title}</h3>
            <p className="text-gray-700 whitespace-pre-line mb-4">{currentBlock.explanation_text}</p>
            
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
                  {appLanguage === 'ru' ? 'Подсказка:' : appLanguage === 'en' ? 'Hint:' : 'Dica:'}
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {currentBlock.hint.map((hint: string, index: number) => (
                    <li key={index} className="text-sm" style={{ color: 'rgba(0, 0, 0, 1)', marginTop: '2px', marginBottom: '2px' }}>{hint}</li>
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
                : appLanguage === 'en'
                ? `Block ${currentBlockIndex + 1} / ${blocksOrder.length}`
                : `Bloco ${currentBlockIndex + 1} / ${blocksOrder.length}`}
            </div>
            <h3 className="text-xl font-bold text-black mb-4">{currentBlock.title}</h3>
            
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
                <p className="text-sm text-gray-700 whitespace-pre-line">{currentBlock.note}</p>
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
                : appLanguage === 'en'
                ? `Block ${currentBlockIndex + 1} / ${blocksOrder.length}`
                : `Bloco ${currentBlockIndex + 1} / ${blocksOrder.length}`}
            </div>
            
            {/* Block title */}
            <h2 className="text-xl font-bold text-black mb-4">
              {appLanguage === 'ru' 
                ? 'Проверим, понятен ли смысл'
                : appLanguage === 'en'
                ? 'Let\'s check if the meaning is clear'
                : 'Vamos verificar se o significado está claro'}
            </h2>
            
            {/* Task 1: Single Choice */}
            {currentBlock.task_1 && (
              <div className="space-y-4">
                <p className="text-lg font-semibold text-black mb-4">{currentBlock.task_1.question}</p>
                
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
                    const isSelected = selectedAnswers[taskKey] === option.text;
                    const isCorrect = option.correct;
                    const showResult = showResults[taskKey];
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(taskKey, option.text)}
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
                        {option.text}
                      </button>
                    );
                  })}
                </div>
            </div>
          )}

            {/* Task 2: Situation to Phrase */}
            {currentBlock.task_2 && (
              <div className="space-y-4">
                <p className="text-lg font-semibold text-black mb-2">{currentBlock.task_2.situation_text}</p>
                
          <div className="space-y-2">
                  {currentBlock.task_2.options?.map((option: any, index: number) => {
                    const taskKey = 'task_2';
                    const isSelected = selectedAnswers[taskKey] === option.text;
                    const isCorrect = option.correct;
                    const showResult = showResults[taskKey];
                    
                    return (
              <button
                key={index}
                        onClick={() => handleAnswerSelect(taskKey, option.text)}
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
                {option.text}
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
                {appLanguage === 'ru' ? 'Пройти заново' : appLanguage === 'en' ? 'Replay' : 'Repetir'}
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
                : appLanguage === 'en'
                ? `Block ${currentBlockIndex + 1} / ${blocksOrder.length}`
                : `Bloco ${currentBlockIndex + 1} / ${blocksOrder.length}`}
            </div>
            <h3 className="text-xl font-bold text-black mb-4">{currentBlock.title}</h3>
            <p 
              className="text-gray-700 whitespace-pre-line mb-6"
              dangerouslySetInnerHTML={{ __html: processInstructionText(currentBlock.instruction_text) }}
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
                ? (currentBlock.action_button?.text || (appLanguage === 'ru' ? '✔ Я сказал(а) вслух' : appLanguage === 'en' ? '✔ I said it out loud' : '✔ Disse em voz alta'))
                : (appLanguage === 'ru' ? 'Пройти заново' : appLanguage === 'en' ? 'Replay' : 'Repetir')}
            </button>
        </div>
        );

      default:
        return <div>Unknown block type: {currentBlock.type}</div>;
    }
  };

  // Don't hide task when completed - show it so user can replay
  // The completion block with stars will be shown at the bottom
  
  if (!currentBlock) {
    return (
      <div className="text-center text-gray-500">
        {appLanguage === 'ru' ? 'Задание не найдено' : appLanguage === 'en' ? 'Task not found' : 'Tarefa não encontrada'}
      </div>
    );
  }

  // Don't auto-reset - let user explicitly click "Пройти заново" to reset
  // No useEffect needed - user must manually click replay button

  return (
    <div className="space-y-6 w-full">
      {/* Block Content - Full width - Always show, even if completed */}
      <div className="rounded-lg border-2 border-gray-200 p-6 w-full" style={{ backgroundColor: '#F4F5F8' }}>
        {renderBlock()}
      </div>

      {/* Navigation */}
      <div className="flex gap-4" style={{ paddingBottom: '120px' }}>
        {currentBlockIndex > 0 && (
          <button
            onClick={handlePreviousBlock}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            ← {appLanguage === 'ru' ? 'Назад' : appLanguage === 'en' ? 'Back' : 'Voltar'}
          </button>
        )}
        
        {currentBlockIndex < blocksOrder.length - 1 && (
          <button
            onClick={handleNextBlock}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {appLanguage === 'ru' ? 'Далее' : appLanguage === 'en' ? 'Next' : 'Próximo'} →
          </button>
        )}
      </div>


      {/* Progress Bar - Above navigation panel */}
      <div className="fixed bottom-[69px] left-0 right-0 bg-white z-30" style={{ marginBottom: '0px', borderRadius: '0px', borderTopLeftRadius: '0px', borderTopRightRadius: '0px', borderBottomRightRadius: '0px', borderBottomLeftRadius: '0px', opacity: 1, color: 'rgba(23, 23, 23, 1)', verticalAlign: 'bottom', height: '33px' }}>
        <div className="max-w-md mx-auto" style={{ paddingTop: '2px', paddingBottom: '0px', paddingLeft: '16px', paddingRight: '16px', background: 'unset', backgroundColor: 'unset' }}>
          <div className="space-y-2">
            {/* Progress Text */}
            <div className="flex justify-between items-center" style={{ fontSize: '10px', color: 'rgba(23, 23, 23, 1)' }}>
              <span className="text-gray-600" style={{ color: 'rgba(23, 23, 23, 1)' }}>
                {getProgressMessage(progressCompleted, progressTotal)}
              </span>
              <span className="text-gray-600" style={{ color: 'rgba(23, 23, 23, 1)' }}>{Math.round((progressCompleted / progressTotal) * 100)}%</span>
            </div>

            {/* Progress Bar - Green, 4px thick */}
            <div className="w-full bg-gray-200 rounded-full" style={{ height: '4px' }}>
              <div
                className="rounded-full transition-all duration-300"
                style={{ 
                  width: `${(progressCompleted / progressTotal) * 100}%`, 
                  height: '4px',
                  backgroundColor: '#2FCD29'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Panel - Fixed at bottom (Cross-task navigation) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30" style={{ borderRadius: '0px', borderTopLeftRadius: '0px', borderTopRightRadius: '0px', borderBottomRightRadius: '0px', borderBottomLeftRadius: '0px', height: '69px', verticalAlign: 'bottom', marginBottom: '0px', opacity: 1, color: 'rgba(0, 0, 0, 1)' }}>
        <div className="max-w-md mx-auto pt-3 pb-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)', height: '69px', color: 'rgba(0, 0, 0, 1)', paddingLeft: '16px', paddingRight: '16px' }}>
          <div className="flex items-center justify-between gap-4">
            {/* Previous Button - Left */}
            {canGoPrevious && onPreviousTask ? (
              <button
                onClick={onPreviousTask}
                className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center"
                aria-label={appLanguage === 'ru' ? 'Предыдущее задание' : appLanguage === 'en' ? 'Previous task' : 'Tarefa anterior'}
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            ) : (
              <div className="w-10 h-10"></div>
            )}

            {/* Task Title - Center */}
            <div className="flex-1 text-center">
              <p className="text-sm font-medium" style={{ color: 'rgba(0, 0, 0, 1)' }}>
                {(() => {
                  const taskId = task?.task_id || 2;
                  if (appLanguage === 'ru') {
                    const titles = {
                      1: '1. Слушай и повторяй',
                      2: '2. Говорим правильно',
                      3: '3. Пойми смысл',
                      4: '4. Выбери ситуацию',
                      5: '5. Попробуй сам'
                    };
                    return titles[taskId as keyof typeof titles] || `${taskId}. Задание`;
                  } else if (appLanguage === 'en') {
                    const titles = {
                      1: '1. Listen and repeat',
                      2: '2. Speak correctly',
                      3: '3. Understand the meaning',
                      4: '4. Choose the situation',
                      5: '5. Try yourself'
                    };
                    return titles[taskId as keyof typeof titles] || `${taskId}. Task`;
                  } else {
                    const titles = {
                      1: '1. Ouve e repete',
                      2: '2. Fala corretamente',
                      3: '3. Compreende o significado',
                      4: '4. Escolhe a situação',
                      5: '5. Tenta tu mesmo'
                    };
                    return titles[taskId as keyof typeof titles] || `${taskId}. Tarefa`;
                  }
                })()}
              </p>
            </div>

            {/* Next Button - Right */}
            {canGoNext && onNextTask ? (
              <button
                onClick={onNextTask}
                disabled={!localIsCompleted}
                className={`w-10 h-10 rounded-full transition-colors flex items-center justify-center ${
                  localIsCompleted
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-white border border-gray-300 cursor-not-allowed'
                }`}
                style={!localIsCompleted ? {
                  backgroundColor: 'rgba(255, 255, 255, 1)',
                  borderWidth: '1px',
                  borderColor: 'rgba(176, 176, 176, 1)'
                } : {}}
                aria-label={appLanguage === 'ru' ? 'Следующее задание' : appLanguage === 'en' ? 'Next task' : 'Próxima tarefa'}
              >
                <svg className={`w-6 h-6 ${localIsCompleted ? 'text-white' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <div className="w-10 h-10"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
