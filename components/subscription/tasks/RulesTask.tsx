'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppLanguage } from '@/lib/language-context';

interface RulesTaskProps {
  task: any;
  language: string;
  onComplete: (completionData?: any) => void;
  isCompleted: boolean;
  onNextTask?: () => void;
  onPreviousTask?: () => void;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  progressCompleted?: number;
  progressTotal?: number;
}

export default function RulesTask({ task, language, onComplete, isCompleted, onNextTask, onPreviousTask, canGoNext = false, canGoPrevious = false, progressCompleted = 0, progressTotal = 5 }: RulesTaskProps) {
  const { language: appLanguage } = useAppLanguage();
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [audioUrls, setAudioUrls] = useState<{ [key: string]: string }>({});
  const [isPlayingAudio, setIsPlayingAudio] = useState<{ [key: string]: boolean }>({});
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: string | null }>({});
  const [showResults, setShowResults] = useState<{ [key: string]: boolean }>({});
  const [speakOutLoudCompleted, setSpeakOutLoudCompleted] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  // Parse task structure
  // Blocks are at root level of task, not in structure
  const structure = task.structure || {};
  const blocksOrder = structure.blocks_order || [];
  const blocks = task.blocks || {}; // Blocks are at root level

  // Reset to first block when task is completed and user wants to replay
  useEffect(() => {
    // If task is completed but we're not in replay mode, allow starting from beginning
    if (isCompleted && !isReplaying && currentBlockIndex === 0 && speakOutLoudCompleted) {
      // Task is completed, but allow replay by resetting state
      setSpeakOutLoudCompleted(false);
      setSelectedAnswers({});
      setShowResults({});
    }
  }, [isCompleted, isReplaying, currentBlockIndex, speakOutLoudCompleted]);

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
  };

  // Handle next block
  const handleNextBlock = () => {
    if (currentBlockIndex < blocksOrder.length - 1) {
      setCurrentBlockIndex(prev => prev + 1);
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
    setSpeakOutLoudCompleted(true);
    // Auto-complete task if this is the last block
    if (currentBlockIndex === blocksOrder.length - 1) {
    onComplete({
      completedAt: new Date().toISOString(),
    });
    }
  };

  // Render block based on type
  const renderBlock = () => {
    if (!currentBlock) return null;

    switch (currentBlock.type) {
      case 'explanation':
    return (
          <div className="space-y-4">
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
            {/* Task 1: Single Choice */}
            {currentBlock.task_1 && (
              <div className="space-y-4">
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
                
                <p className="text-lg font-semibold text-black mb-4">{currentBlock.task_1.question}</p>
                
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
                              : 'bg-gray-100 border-2 border-gray-300'
                            : 'bg-white border-0 hover:border-0'
                        }`}
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
                      : 'bg-gray-100 border-2 border-gray-300'
                    : 'bg-white border-0 hover:border-0'
                }`}
              >
                {option.text}
              </button>
                    );
                  })}
                </div>
              </div>
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
            <h3 className="text-xl font-bold text-black mb-4">{currentBlock.title}</h3>
            <p 
              className="text-gray-700 whitespace-pre-line mb-6"
              dangerouslySetInnerHTML={{ __html: processInstructionText(currentBlock.instruction_text) }}
            />
            
            {!speakOutLoudCompleted ? (
              <button
                onClick={handleSpeakOutLoudComplete}
                className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
              >
                {currentBlock.action_button?.text || (appLanguage === 'ru' ? '✔ Я сказал(а) вслух' : appLanguage === 'en' ? '✔ I said it out loud' : '✔ Disse em voz alta')}
              </button>
            ) : (
              <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 text-center">
                <p className="text-green-800 font-semibold">
                  {appLanguage === 'ru' ? 'Отлично! Продолжайте.' : appLanguage === 'en' ? 'Great! Continue.' : 'Ótimo! Continue.'}
                </p>
            </div>
          )}
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

  // If task is completed but user wants to replay, reset to first block
  // But still show the task content, not just a completion message
  useEffect(() => {
    if (isCompleted && !isReplaying && currentBlockIndex === blocksOrder.length - 1) {
      // When accessing a completed task, start from the beginning for replay
      // But only if we're on the last block and not already replaying
      // Don't auto-reset - let user click "Пройти заново" button
    }
  }, [isCompleted, isReplaying, currentBlockIndex, blocksOrder.length]);

  return (
    <div className="space-y-6 w-full">
      {/* Block Content - Full width - Always show, even if completed */}
      <div className="rounded-lg border-2 border-gray-200 p-6 w-full" style={{ backgroundColor: '#F4F5F8' }}>
        {renderBlock()}
      </div>

      {/* Navigation */}
      <div className="flex gap-4">
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

        {/* Complete task button (only on last block if speak_out_loud is completed) */}
        {/* Show button even if task is already completed - allows replay */}
        {currentBlockIndex === blocksOrder.length - 1 && 
         currentBlock.type === 'speak_out_loud' && 
         (speakOutLoudCompleted || isCompleted) && (
          <button
            onClick={() => {
              if (!isCompleted || isReplaying) {
                onComplete({
                  completedAt: new Date().toISOString(),
                });
                setIsReplaying(false);
              } else {
                // If already completed, allow replay by resetting to first block
                setCurrentBlockIndex(0);
                setSpeakOutLoudCompleted(false);
                setSelectedAnswers({});
                setShowResults({});
                setIsReplaying(true);
              }
            }}
            className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            {isCompleted && !isReplaying
              ? (appLanguage === 'ru' ? 'Пройти заново' : appLanguage === 'en' ? 'Replay' : 'Repetir')
              : (appLanguage === 'ru' ? 'Завершить' : appLanguage === 'en' ? 'Complete' : 'Concluir')}
          </button>
        )}
      </div>

      {/* Progress indicator */}
      <div className="text-center text-sm text-gray-500">
        {appLanguage === 'ru' 
          ? `Блок ${currentBlockIndex + 1} из ${blocksOrder.length}`
          : appLanguage === 'en'
          ? `Block ${currentBlockIndex + 1} of ${blocksOrder.length}`
          : `Bloco ${currentBlockIndex + 1} de ${blocksOrder.length}`}
      </div>

      {/* Progress Bar - Above navigation panel */}
      <div className="fixed bottom-[70px] left-0 right-0 bg-white z-30" style={{ marginBottom: '0px' }}>
        <div className="max-w-md mx-auto px-4" style={{ paddingTop: '0px', paddingBottom: '16px' }}>
          <div className="space-y-2">
            {/* Progress Text */}
            <div className="flex justify-between items-center" style={{ fontSize: '10px', color: 'rgba(23, 23, 23, 0)' }}>
              <span className="text-gray-600" style={{ color: 'rgba(23, 23, 23, 1)' }}>
                {progressCompleted} / {progressTotal} {appLanguage === 'ru' ? 'выполнено' : appLanguage === 'en' ? 'completed' : 'concluídos'}
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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30" style={{ borderRadius: '183px', borderTopLeftRadius: '183px', borderTopRightRadius: '183px', borderBottomRightRadius: '0px', borderBottomLeftRadius: '0px', height: '69px', verticalAlign: 'bottom', marginBottom: '0px' }}>
        <div className="max-w-md mx-auto px-4 pt-3 pb-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)', height: '69px', color: 'rgba(0, 0, 0, 1)' }}>
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
                className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center"
                aria-label={appLanguage === 'ru' ? 'Следующее задание' : appLanguage === 'en' ? 'Next task' : 'Próxima tarefa'}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
