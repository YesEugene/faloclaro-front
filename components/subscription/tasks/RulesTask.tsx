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
  const [audioUrls, setAudioUrls] = useState<{ [key: string]: string }>({});
  const [isPlayingAudio, setIsPlayingAudio] = useState<{ [key: string]: boolean }>({});
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: string | null }>(savedAnswers || {});
  const [showResults, setShowResults] = useState<{ [key: string]: boolean }>(savedShowResults || {});
  const [speakOutLoudCompleted, setSpeakOutLoudCompleted] = useState(savedSpeakOutLoudCompleted || false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [localIsCompleted, setLocalIsCompleted] = useState(isCompleted);
  
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  
  // Load saved answers and state from completion_data if task was already completed
  const [hasLoadedSavedData, setHasLoadedSavedData] = useState(false);
  useEffect(() => {
    if (!hasLoadedSavedData) {
      if (savedAnswers && Object.keys(savedAnswers).length > 0) {
        setSelectedAnswers(savedAnswers);
      }
      if (savedShowResults && Object.keys(savedShowResults).length > 0) {
        setShowResults(savedShowResults);
      }
      if (savedSpeakOutLoudCompleted) {
        setSpeakOutLoudCompleted(true);
      }
      setHasLoadedSavedData(true);
    }
  }, [savedAnswers, savedShowResults, savedSpeakOutLoudCompleted, hasLoadedSavedData]);

  // Update local completion state when prop changes
  useEffect(() => {
    if (!isReplaying) {
      setLocalIsCompleted(isCompleted);
    }
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
  const getBlocksStructure = () => {
    if (Array.isArray(task.blocks)) {
      const blocksObj: { [key: string]: any } = {};
      const blocksOrder: string[] = [];
      
      task.blocks.forEach((block: any, index: number) => {
        const blockId = block.block_id || block.id || `block_${index + 1}`;
        blocksObj[blockId] = {
          ...block,
          type: block.block_type || block.type || 'explanation',
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
      const structure = task.structure || {};
      const blocksOrder = structure.blocks_order || Object.keys(task.blocks);
      return {
        blocks: task.blocks,
        blocksOrder,
        structure,
      };
    }
    return {
      blocks: {},
      blocksOrder: [],
      structure: {},
    };
  };

  const { blocks, blocksOrder } = getBlocksStructure();

  // Load audio URLs for all text examples
  useEffect(() => {
    const loadAudioUrls = async () => {
      const urls: { [key: string]: string } = {};
      const textsToLoad: string[] = [];

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
          if (block.task_2?.audio) {
            textsToLoad.push(block.task_2.audio);
          }
        }
      });

      for (const text of textsToLoad) {
        if (urls[text]) continue;

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

    Object.values(audioRefs.current).forEach(audio => {
      if (audio && !audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    });

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
      };
    } catch (error) {
      setIsPlayingAudio(prev => ({ ...prev, [text]: false }));
    }
  }, [audioUrls]);

  // Handle answer selection for reinforcement tasks
  const handleAnswerSelect = (taskKey: string, answer: string, blockIndex: number) => {
    const updatedAnswers = { ...selectedAnswers, [taskKey]: answer };
    const updatedShowResults = { ...showResults, [taskKey]: true };
    
    setSelectedAnswers(updatedAnswers);
    setShowResults(updatedShowResults);
  };

  // Check if all reinforcement tasks in a block are completed
  const checkBlockReinforcementCompleted = (block: any): boolean => {
    if (block.type !== 'reinforcement') return false;
    
    const hasTask1 = !!block.task_1;
    const hasTask2 = !!block.task_2;
    
    if (hasTask1 && !showResults['task_1']) return false;
    if (hasTask2 && !showResults['task_2']) return false;
    
    return true;
  };

  // Check if all blocks are completed
  const checkAllBlocksCompleted = (): boolean => {
    // Check all reinforcement blocks
    for (let i = 0; i < blocksOrder.length; i++) {
      const blockKey = blocksOrder[i];
      const block = blocks[blockKey];
      if (block.type === 'reinforcement' && !checkBlockReinforcementCompleted(block)) {
        return false;
      }
    }
    
    // Check speak out loud block (last block)
    const lastBlockKey = blocksOrder[blocksOrder.length - 1];
    const lastBlock = lastBlockKey ? blocks[lastBlockKey] : null;
    if (lastBlock && lastBlock.type === 'speak_out_loud' && !speakOutLoudCompleted) {
      return false;
    }
    
    return true;
  };

  // Handle final completion button
  const handleFinalComplete = () => {
    if (checkAllBlocksCompleted()) {
      setLocalIsCompleted(true);
      onComplete({
        selectedAnswers,
        showResults,
        speakOutLoudCompleted,
        completedAt: new Date().toISOString(),
      });
    }
  };

  // Handle speak out loud completion
  const handleSpeakOutLoudComplete = () => {
    setSpeakOutLoudCompleted(true);
    // Don't auto-complete - let user click "All tasks completed" button explicitly
  };
  
  // Handle replay - reset all progress
  const handleReplay = () => {
    setSpeakOutLoudCompleted(false);
    setSelectedAnswers({});
    setShowResults({});
    setIsReplaying(true);
    setLocalIsCompleted(false);
    // Clear saved data
    onComplete({
      selectedAnswers: {},
      showResults: {},
      speakOutLoudCompleted: false,
      replay: true,
    });
    setTimeout(() => {
      setIsReplaying(false);
    }, 100);
  };

  // Render a single block based on type
  const renderBlock = (block: any, blockIndex: number) => {
    if (!block) return null;

    const blockType = block.block_type || block.type;
    const normalizedBlockType = typeof blockType === 'string' ? blockType : 'explanation';
    
    if (!normalizedBlockType || normalizedBlockType === 'unknown') {
      return (
        <div className="text-center text-red-600">
          {appLanguage === 'ru' ? 'Ошибка: тип блока не определен' : 'Error: block type is undefined'}
        </div>
      );
    }

    switch (normalizedBlockType) {
      case 'explanation':
        return (
          <div key={blockIndex} className="space-y-4 mb-8">
            <div className="text-sm text-gray-500 mb-2">
              {appLanguage === 'ru' 
                ? `Блок ${blockIndex + 1} / ${blocksOrder.length}`
                : `Block ${blockIndex + 1} / ${blocksOrder.length}`}
            </div>
            <h3 className="text-xl font-bold text-black mb-4">{getBlockTitle(block, appLanguage)}</h3>
            <p className="text-gray-700 whitespace-pre-line mb-4">{getBlockExplanationText(block, appLanguage)}</p>
            
            {block.examples && block.examples.length > 0 && (
              <div className="space-y-3">
                {block.examples.map((example: any, index: number) => (
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

            {block.hint && block.hint.length > 0 && (
              <div 
                className="rounded-lg p-4 mt-4"
                style={{ 
                  borderWidth: '1px',
                  borderColor: 'rgba(194, 194, 194, 1)',
                  borderStyle: 'solid',
                  backgroundColor: '#F4F5F8'
                }}
              >
                <p className="text-sm font-semibold mb-2" style={{ color: 'rgba(0, 0, 0, 1)' }}>
                  {appLanguage === 'ru' ? 'Подсказка:' : 'Hint:'}
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {block.hint.map((hint: string | { ru?: string; en?: string }, index: number) => (
                    <li key={index} className="text-sm" style={{ color: 'rgba(0, 0, 0, 1)', marginTop: '2px', marginBottom: '2px' }}>{getHintText(hint, appLanguage)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      case 'comparison':
        return (
          <div key={blockIndex} className="space-y-4 mb-8">
            <div className="text-sm text-gray-500 mb-2">
              {appLanguage === 'ru' 
                ? `Блок ${blockIndex + 1} / ${blocksOrder.length}`
                : `Block ${blockIndex + 1} / ${blocksOrder.length}`}
            </div>
            <h3 className="text-xl font-bold text-black mb-4">{getBlockTitle(block, appLanguage)}</h3>
            
            {block.comparison_card && (
              <div className="grid grid-cols-1 gap-4">
                {block.comparison_card.map((card: any, index: number) => (
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

            {block.note && (
              <div 
                className="rounded-lg p-4 mt-4"
                style={{ 
                  borderWidth: '1px',
                  borderColor: 'rgba(194, 194, 194, 1)',
                  borderStyle: 'solid',
                  backgroundColor: '#F4F5F8'
                }}
              >
                <p className="text-sm text-gray-700 whitespace-pre-line">{getBlockNote(block, appLanguage)}</p>
              </div>
            )}
          </div>
        );

      case 'reinforcement':
        return (
          <div key={blockIndex} className="space-y-6 mb-8">
            <div className="text-sm text-gray-500 mb-2">
              {appLanguage === 'ru' 
                ? `Блок ${blockIndex + 1} / ${blocksOrder.length}`
                : `Block ${blockIndex + 1} / ${blocksOrder.length}`}
            </div>
            
            <h2 className="text-xl font-bold text-black mb-4">
              {appLanguage === 'ru' 
                ? 'Проверим, понятен ли смысл'
                : 'Let\'s check if the meaning is clear'}
            </h2>
            
            {/* Task 1: Single Choice */}
            {block.task_1 && (
              <div className="space-y-4">
                <p className="text-lg font-semibold text-black mb-4">{getQuestionText(block.task_1, appLanguage)}</p>
                
                {block.task_1.audio && (
                  <div className="flex items-center justify-center mb-4">
                    <button
                      onClick={() => playAudio(block.task_1.audio)}
                      disabled={isPlayingAudio[block.task_1.audio]}
                      className="p-4 rounded-full transition-colors"
                      style={{ backgroundColor: '#F4F5F8' }}
                    >
                      {isPlayingAudio[block.task_1.audio] ? (
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
                  {block.task_1.options?.map((option: any, index: number) => {
                    const taskKey = 'task_1';
                    let optionText: string = getTranslatedText(option.text, appLanguage);
                    if (!optionText || typeof optionText !== 'string') {
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
                        onClick={() => handleAnswerSelect(taskKey, optionText, blockIndex)}
                        disabled={showResult}
                        className={`w-full text-left p-4 rounded-lg transition-colors ${
                          showResult
                            ? isCorrect
                              ? 'bg-green-100 border-2 border-green-500'
                              : isSelected && !isCorrect
                              ? 'bg-red-100 border-2 border-red-500'
                              : 'bg-white border-0'
                            : 'bg-white border-0'
                        }`}
                        style={{
                          backgroundColor: showResult
                            ? (isCorrect 
                                ? 'rgb(220 252 231)' 
                                : (isSelected && !isCorrect 
                                    ? 'rgb(254 226 226)' 
                                    : 'white'))
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
            {block.task_2 && (
              <div className="space-y-4 mt-6">
                {block.task_2.question ? (
                  <>
                    <p className="text-lg font-semibold text-black mb-4">{getQuestionText(block.task_2, appLanguage)}</p>
                    
                    {block.task_2.audio && (
                      <div className="flex items-center justify-center mb-4">
                        <button
                          onClick={() => playAudio(block.task_2.audio)}
                          disabled={isPlayingAudio[block.task_2.audio]}
                          className="p-4 rounded-full transition-colors"
                          style={{ backgroundColor: '#F4F5F8' }}
                        >
                          {isPlayingAudio[block.task_2.audio] ? (
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
                  <p className="text-lg font-semibold text-black mb-2">{getSituationText(block.task_2, appLanguage)}</p>
                )}
                
                <div className="space-y-2">
                  {block.task_2.options?.map((option: any, index: number) => {
                    const taskKey = 'task_2';
                    let optionText: string;
                    if (block.task_2.format === 'single_choice') {
                      optionText = getTranslatedText(option.text, appLanguage);
                    } else {
                      if (typeof option.text === 'string') {
                        optionText = option.text;
                      } else if (option.text && typeof option.text === 'object') {
                        optionText = option.text.pt || option.text.portuguese || getTranslatedText(option.text, appLanguage);
                      } else {
                        optionText = String(option.text || '');
                      }
                    }
                    if (!optionText || typeof optionText !== 'string') {
                      optionText = '';
                    }
                    const isSelected = selectedAnswers[taskKey] === optionText || (option.text && typeof option.text === 'object' && selectedAnswers[taskKey] === getTranslatedText(option.text, appLanguage));
                    const isCorrect = option.correct;
                    const showResult = showResults[taskKey];
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(taskKey, optionText, blockIndex)}
                        disabled={showResult}
                        className={`w-full text-left p-4 rounded-lg transition-colors ${
                          showResult
                            ? isCorrect
                              ? 'bg-green-100 border-2 border-green-500'
                              : isSelected && !isCorrect
                              ? 'bg-red-100 border-2 border-red-500'
                              : 'bg-white border-0'
                            : 'bg-white border-0'
                        }`}
                        style={{
                          backgroundColor: showResult
                            ? (isCorrect 
                                ? 'rgb(220 252 231)' 
                                : (isSelected && !isCorrect 
                                    ? 'rgb(254 226 226)' 
                                    : 'white'))
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
          </div>
        );

      case 'speak_out_loud':
        const processInstructionText = (text: string) => {
          if (!text) return text;
          let processed = text.replace(/(Olá\.\s*Eu sou\s*…)/gi, '<strong>$1</strong>');
          processed = processed.replace(/(Olá\.\s*Chamo-me\s*…)/gi, '<strong>$1</strong>');
          return processed;
        };
        
        return (
          <div key={blockIndex} className="space-y-4 mb-8">
            <div className="text-sm text-gray-500 mb-2">
              {appLanguage === 'ru' 
                ? `Блок ${blockIndex + 1} / ${blocksOrder.length}`
                : `Block ${blockIndex + 1} / ${blocksOrder.length}`}
            </div>
            <h3 className="text-xl font-bold text-black mb-4">{getBlockTitle(block, appLanguage)}</h3>
            <p 
              className="text-gray-700 whitespace-pre-line mb-6"
              dangerouslySetInnerHTML={{ __html: processInstructionText(getInstructionText(block, appLanguage)) }}
            />
            
            {!speakOutLoudCompleted ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSpeakOutLoudComplete();
                }}
                className="w-full py-4 rounded-lg font-semibold text-lg transition-colors bg-blue-600 text-white hover:bg-blue-700"
              >
                {getTranslatedText(block.action_button?.text, appLanguage) || (appLanguage === 'ru' ? '✔ Я сказал(а) вслух' : '✔ I said it out loud')}
              </button>
            ) : (
              <div 
                className="w-full py-4 rounded-lg font-semibold text-lg flex items-center justify-center"
                style={{
                  backgroundColor: '#F1F2F6',
                  border: '1px solid #E5E7EB',
                  color: '#109929'
                }}
              >
                <svg className="w-6 h-6 mr-2" fill="none" stroke="#109929" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {appLanguage === 'ru' ? 'Выполнено' : 'Completed'}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div key={blockIndex} className="text-center text-red-600">
            {appLanguage === 'ru' 
              ? `Неизвестный тип блока: ${normalizedBlockType}` 
              : `Unknown block type: ${normalizedBlockType}`}
          </div>
        );
    }
  };

  if (blocksOrder.length === 0) {
    return (
      <div className="text-center text-gray-500">
        {appLanguage === 'ru' ? 'Задание не найдено' : 'Task not found'}
      </div>
    );
  }

  const allCompleted = checkAllBlocksCompleted();

  return (
    <div className="space-y-6 w-full" style={{ paddingBottom: '140px' }}>
      {/* All Blocks - Displayed on one page */}
      <div className="space-y-6">
        {blocksOrder.map((blockKey: string, index: number) => {
          const block = blocks[blockKey];
          return (
            <div key={blockKey} className="rounded-lg border-2 border-gray-200 p-6 w-full" style={{ backgroundColor: '#F4F5F8' }}>
              {renderBlock(block, index)}
            </div>
          );
        })}
      </div>

      {/* Final Completion Button - Only show if all blocks are completed */}
      {allCompleted && !localIsCompleted && (
        <div className="mt-8">
          <button
            onClick={handleFinalComplete}
            className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors"
          >
            {appLanguage === 'ru' ? 'Все задания выполнены' : 'All tasks completed'}
          </button>
        </div>
      )}

      {/* Replay Button - Show if task is completed */}
      {localIsCompleted && (
        <div className="mt-8">
          <button
            onClick={handleReplay}
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
          >
            {appLanguage === 'ru' ? 'Пройти заново' : 'Replay'}
          </button>
        </div>
      )}

      {/* Progress Bar - Above navigation panel */}
      <div className="fixed left-0 right-0 z-30 flex justify-center" style={{ bottom: '69px', height: '33px', margin: 0, padding: 0 }}>
        <div className="w-full max-w-md relative" style={{ height: '100%', margin: 0, padding: 0 }}>
          <div className="absolute inset-0 flex">
            <div
              className="transition-all duration-300"
              style={{ 
                width: `${(progressCompleted / progressTotal) * 100}%`,
                backgroundColor: '#B2FDB0'
              }}
            />
            <div
              className="flex-1"
              style={{ 
                backgroundColor: '#F4F5F9'
              }}
            />
          </div>
          
          <div className="relative flex justify-between items-center h-full px-4" style={{ fontSize: '15px', color: 'rgba(23, 23, 23, 1)', zIndex: 1 }}>
            <span>
              {getProgressMessage(progressCompleted, progressTotal)}
            </span>
            <span>{Math.round((progressCompleted / progressTotal) * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Navigation Panel - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-black z-30" style={{ borderRadius: '0px', height: '59px', marginBottom: '0px', opacity: 1, color: 'rgba(255, 255, 255, 1)' }}>
        <div className="max-w-md mx-auto pt-3 pb-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)', height: '59px', color: 'rgba(255, 255, 255, 1)', paddingLeft: '16px', paddingRight: '16px' }}>
          <div className="flex items-center justify-between gap-4">
            {/* Previous Task Button */}
            {canGoPrevious && onPreviousTask ? (
              <button
                onClick={onPreviousTask}
                className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center"
                aria-label={appLanguage === 'ru' ? 'Предыдущее задание' : 'Previous task'}
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
              <p className="text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 1)' }}>
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

            {/* Next Task Button - Only enabled when task is completed */}
            {localIsCompleted && canGoNext && onNextTask ? (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
