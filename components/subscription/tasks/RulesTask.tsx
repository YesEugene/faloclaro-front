'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppLanguage } from '@/lib/language-context';
import { getBlockTitle, getBlockExplanationText, getBlockNote, getInstructionText, getHintText, getQuestionText, getSituationText, getTranslatedText } from '@/lib/lesson-translations';
import { BottomLessonNav } from '@/components/subscription/ui/BottomLessonNav';
import { ReplayPill } from '@/components/subscription/ui/ReplayPill';

interface RulesTaskProps {
  task: any;
  language: string;
  onComplete: (completionData?: any) => void;
  isCompleted: boolean;
  savedAnswers?: { [key: string]: string | null };
  savedShowResults?: { [key: string]: boolean };
  savedWrongAnswers?: { [key: string]: string[] };
  savedSpeakOutLoudCompleted?: boolean;
  onNextTask?: () => void;
  onPreviousTask?: () => void;
  onNextLesson?: () => void;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  isLastTask?: boolean;
  progressCompleted?: number;
  progressTotal?: number;
  dayNumber?: number;
}

export default function RulesTask({ task, language, onComplete, isCompleted, savedAnswers, savedShowResults, savedWrongAnswers, savedSpeakOutLoudCompleted, onNextTask, onPreviousTask, onNextLesson, canGoNext = false, canGoPrevious = false, isLastTask = false, progressCompleted = 0, progressTotal = 5, dayNumber }: RulesTaskProps) {
  const { language: appLanguage } = useAppLanguage();
  const [audioUrls, setAudioUrls] = useState<{ [key: string]: string }>({});
  const [isPlayingAudio, setIsPlayingAudio] = useState<{ [key: string]: boolean }>({});
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: string | null }>(savedAnswers || {});
  const [showTooltip, setShowTooltip] = useState(false);
  const [showResults, setShowResults] = useState<{ [key: string]: boolean }>(savedShowResults || {});
  const [wrongAnswers, setWrongAnswers] = useState<{ [key: string]: string[] }>(savedWrongAnswers || {});
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
      if (savedWrongAnswers && Object.keys(savedWrongAnswers).length > 0) {
        setWrongAnswers(savedWrongAnswers);
      }
      if (savedSpeakOutLoudCompleted) {
        setSpeakOutLoudCompleted(true);
      }
      setHasLoadedSavedData(true);
    }
  }, [savedAnswers, savedShowResults, savedWrongAnswers, savedSpeakOutLoudCompleted, hasLoadedSavedData]);

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


  const getAudioPrompt = () => {
    if (appLanguage === 'ru') return 'Прослушай аудио';
    if (appLanguage === 'en') return 'Listen to the audio';
    return 'Ouve o áudio';
  };

  const renderAudioPillRow = (opts: { displayText: string; audioKey: string }) => {
    const { displayText, audioKey } = opts;
    const canPlay = !!audioUrls[audioKey];
    return (
      <div
        className="w-full"
        style={{
          minHeight: '50px',
          backgroundColor: 'rgba(255, 255, 255, 1)',
          borderRadius: '14px',
          border: 'none',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <p
          className="text-black font-medium text-lg"
          style={{
            margin: 0,
            flex: 1,
            minWidth: 0,
            whiteSpace: 'normal',
            overflowWrap: 'anywhere',
            lineHeight: '1.25',
          }}
        >
          {displayText}
        </p>
        {canPlay && (
          <button
            onClick={() => playAudio(audioKey)}
            disabled={isPlayingAudio[audioKey]}
            className="flex-shrink-0 transition-colors"
            style={{
              width: '36px',
              height: '36px',
              padding: 0,
              borderRadius: '999px',
              backgroundColor: 'transparent',
            }}
          >
            {isPlayingAudio[audioKey] ? (
              <svg className="w-9 h-9 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-9 h-9" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'rgba(59, 130, 246, 1)' }}>
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        )}
      </div>
    );
  };

  // Handle answer selection for reinforcement tasks.
  // UX: wrong choice does NOT reveal the correct one; user can retry until correct.
  // Only after correct answer we "lock" the question (showResults=true).
  const handleAnswerSelect = (taskKey: string, answer: string, isCorrect: boolean) => {
    if (showResults[taskKey] === true) return;

    const updatedAnswers = { ...selectedAnswers, [taskKey]: answer };
    setSelectedAnswers(updatedAnswers);

    if (isCorrect) {
      setShowResults({ ...showResults, [taskKey]: true });
      return;
    }

    setWrongAnswers((prev) => {
      const existing = prev[taskKey] || [];
      if (existing.includes(answer)) return prev;
      return { ...prev, [taskKey]: [...existing, answer] };
    });
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
    
    // Check speak out loud block (last block) only if it has an action_button (mandatory completion step)
    const lastBlockKey = blocksOrder[blocksOrder.length - 1];
    const lastBlock = lastBlockKey ? blocks[lastBlockKey] : null;
    const requiresSpeak = !!(lastBlock && lastBlock.type === 'speak_out_loud' && lastBlock.action_button);
    if (requiresSpeak && !speakOutLoudCompleted) {
      return false;
    }
    
    return true;
  };

  // Auto-complete: as soon as all mandatory steps are done, mark task as completed.
  useEffect(() => {
    if (isReplaying) return;
    if (localIsCompleted) return;

    const allDone = checkAllBlocksCompleted();
    if (!allDone) return;

    setLocalIsCompleted(true);
    onComplete({
      selectedAnswers,
      showResults,
      wrongAnswers,
      speakOutLoudCompleted,
      completedAt: new Date().toISOString(),
    });
  }, [selectedAnswers, showResults, wrongAnswers, speakOutLoudCompleted, isReplaying, localIsCompleted]);


  // Handle final completion button
  // Completion in Task 2 happens automatically on the last mandatory interaction.
  // For RulesTask this is usually the speak-out-loud button (block 6), but if no speak block exists,
  // completion happens after the last reinforcement answer.
  const handleSpeakOutLoudComplete = () => {
    if (!speakOutLoudCompleted) {
      setSpeakOutLoudCompleted(true);
    }
  };

  
  // Handle replay - reset all progress
  const handleReplay = () => {
    setSpeakOutLoudCompleted(false);
    setSelectedAnswers({});
    setShowResults({});
    setWrongAnswers({});
    setIsReplaying(true);
    setLocalIsCompleted(false);
    // Clear saved data
    onComplete({
      selectedAnswers: {},
      showResults: {},
      wrongAnswers: {},
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
                  <div key={index}>
                    {renderAudioPillRow({ displayText: example.text, audioKey: example.text })}
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
                  backgroundColor: '#F4F5F8',
                  borderRadius: '20px'
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
                  <div key={index}>
                    {renderAudioPillRow({ displayText: card.text, audioKey: card.text })}
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
                  backgroundColor: '#F4F5F8',
                  borderRadius: '20px'
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
                  <div className="mb-4">
                    {renderAudioPillRow({ displayText: getAudioPrompt(), audioKey: block.task_1.audio })}
                  </div>
                )}
                
                <div className="space-y-2">
                  {block.task_1.options?.map((option: any, index: number) => {
                    const taskKey = 'task_1';
                    // Safely extract option text - handle both string and object formats
                    let optionText: string = '';
                    if (option.text) {
                      if (typeof option.text === 'string') {
                        optionText = option.text;
                      } else if (typeof option.text === 'object' && !Array.isArray(option.text)) {
                        // Handle object format: { ru: "...", en: "..." }
                        optionText = getTranslatedText(option.text, appLanguage);
                        // Fallback if getTranslatedText returns empty or non-string
                        if (!optionText || typeof optionText !== 'string') {
                          optionText = option.text.ru || option.text.en || option.text.pt || option.text.portuguese || '';
                        }
                      } else {
                        optionText = String(option.text || '');
                      }
                    }
                    // Ensure optionText is always a string
                    if (typeof optionText !== 'string') {
                      optionText = String(optionText || '');
                    }
                    
                    const isSelected = selectedAnswers[taskKey] === optionText || (option.text && typeof option.text === 'object' && selectedAnswers[taskKey] === getTranslatedText(option.text, appLanguage));
                    // Check both correct and is_correct fields
                    const isCorrect = option.correct === true || option.is_correct === true;
                    const isLocked = showResults[taskKey] === true;
                    const wasWrong = (wrongAnswers[taskKey] || []).includes(optionText);
                    const dotColor = isLocked && isCorrect ? '#34BF5D' : wasWrong ? '#FF3B30' : null;
                    
                    return (                      <button
                        key={index}
                        onClick={() => {
                          if (isLocked) return;
                          handleAnswerSelect(taskKey, optionText, isCorrect);
                        }}
                        disabled={isLocked}
                        className="w-full text-left transition-colors flex items-center"
                        style={{
                          backgroundColor: 'white',
                          border: '1.5px solid #CED2D6',
                          borderRadius: '18px',
                          height: '50px',
                          padding: '0 18px',
                          gap: '14px',
                        }}
                      >
                        <span
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '999px',
                            border: '1.5px solid #1A8CFF',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {dotColor ? (
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '999px',
                                background: dotColor,
                              }}
                            />
                          ) : null}
                        </span>
                        <span style={{ fontSize: '16px', fontWeight: 500, color: '#000' }}>{optionText}</span>
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
                      <div className="mb-4">
                        {renderAudioPillRow({ displayText: getAudioPrompt(), audioKey: block.task_2.audio })}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-lg font-semibold text-black mb-2">{getSituationText(block.task_2, appLanguage)}</p>
                )}
                
                <div className="space-y-2">
                  {block.task_2.options?.map((option: any, index: number) => {
                    const taskKey = 'task_2';
                    // Safely extract option text - handle both string and object formats
                    let optionText: string = '';
                    if (option.text) {
                      if (block.task_2.format === 'single_choice') {
                        // For single_choice, use getTranslatedText
                        optionText = getTranslatedText(option.text, appLanguage);
                        // Fallback if getTranslatedText returns empty or non-string
                        if (!optionText || typeof optionText !== 'string') {
                          if (typeof option.text === 'string') {
                            optionText = option.text;
                          } else if (typeof option.text === 'object' && !Array.isArray(option.text)) {
                            optionText = option.text.ru || option.text.en || option.text.pt || option.text.portuguese || '';
                          } else {
                            optionText = String(option.text || '');
                          }
                        }
                      } else {
                        // For other formats (situation_to_phrase)
                        if (typeof option.text === 'string') {
                          optionText = option.text;
                        } else if (typeof option.text === 'object' && !Array.isArray(option.text)) {
                          optionText = option.text.pt || option.text.portuguese || getTranslatedText(option.text, appLanguage);
                          if (!optionText || typeof optionText !== 'string') {
                            optionText = option.text.ru || option.text.en || '';
                          }
                        } else {
                          optionText = String(option.text || '');
                        }
                      }
                    }
                    // Ensure optionText is always a string
                    if (typeof optionText !== 'string') {
                      optionText = String(optionText || '');
                    }
                    
                    const isSelected = selectedAnswers[taskKey] === optionText || (option.text && typeof option.text === 'object' && selectedAnswers[taskKey] === getTranslatedText(option.text, appLanguage));
                    // Check both correct and is_correct fields
                    const isCorrect = option.correct === true || option.is_correct === true;
                    const isLocked = showResults[taskKey] === true;
                    const wasWrong = (wrongAnswers[taskKey] || []).includes(optionText);
                    const dotColor = isLocked && isCorrect ? '#34BF5D' : wasWrong ? '#FF3B30' : null;
                    
                    return (                      <button
                        key={index}
                        onClick={() => {
                          if (isLocked) return;
                          handleAnswerSelect(taskKey, optionText, isCorrect);
                        }}
                        disabled={isLocked}
                        className="w-full text-left transition-colors flex items-center"
                        style={{
                          backgroundColor: 'white',
                          border: '1.5px solid #CED2D6',
                          borderRadius: '18px',
                          height: '50px',
                          padding: '0 18px',
                          gap: '14px',
                        }}
                      >
                        <span
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '999px',
                            border: '1.5px solid #1A8CFF',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {dotColor ? (
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '999px',
                                background: dotColor,
                              }}
                            />
                          ) : null}
                        </span>
                        <span style={{ fontSize: '16px', fontWeight: 500, color: '#000' }}>{optionText}</span>
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
            
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (speakOutLoudCompleted) return; // uncheck only via Replay
                handleSpeakOutLoudComplete();
              }}
              disabled={speakOutLoudCompleted}
              className="w-full text-left transition-colors flex items-center"
              style={{
                backgroundColor: 'white',
                border: '1.5px solid #CED2D6',
                borderRadius: '18px',
                height: '50px',
                          padding: '0 18px',
                gap: '14px',
                cursor: speakOutLoudCompleted ? 'default' : 'pointer',
              }}
            >
              <span
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  border: '1.5px solid #1A8CFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: '#fff',
                }}
              >
                {speakOutLoudCompleted ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34BF5D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : null}
              </span>
              <span style={{ fontSize: '16px', fontWeight: 500, color: '#000' }}>
                {String(getTranslatedText(block.action_button?.text, appLanguage) || (appLanguage === 'ru' ? 'Я сказал(а) вслух' : 'I said it out loud')).replace(/^[✔✓]\s*/u, '')}
              </span>
            </button>
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

  return (
    <div className="space-y-6 w-full" style={{ paddingBottom: '140px' }}>
      {/* All Blocks - Displayed on one page */}
      <div className="space-y-6">
        {blocksOrder.map((blockKey: string, index: number) => {
          const block = blocks[blockKey];
          return (
            <div
            key={blockKey}
            className="border-2 border-gray-200 p-6 w-full"
            style={{ backgroundColor: '#F4F5F8', borderRadius: '20px' }}
          >
              {renderBlock(block, index)}
            </div>
          );
        })}
      </div>

      {/* Replay Button - Floating above navigation panel, show if task is completed */}
      {localIsCompleted && !isReplaying && (
        <ReplayPill lang={appLanguage} onClick={handleReplay} />
      )}

{/* Navigation Panel */}
      <BottomLessonNav
            taskId={task?.task_id || 2}
            lang={appLanguage}
            canGoPrevious={canGoPrevious && !!onPreviousTask}
            canGoNext={localIsCompleted && ((isLastTask && !!onNextLesson) || (!isLastTask && !!onNextTask))}
            onPrevious={onPreviousTask}
            onNext={onNextTask}
            isLastTask={isLastTask}
            onNextLesson={onNextLesson}
          />
    </div>
  );
}
