'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface AudioPlayerProps {
  audioUrl: string;
  playbackSpeed?: number;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  className?: string;
}

export default function AudioPlayer({
  audioUrl,
  playbackSpeed = 1.0,
  onPlay,
  onPause,
  onEnded,
  className = '',
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      setIsPlaying(true);
      onPlay?.();
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPause?.();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    audio.addEventListener('playing', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('playing', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onPlay, onPause, onEnded]);

  const handlePlayPause = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        // Check if audio is ready
        if (audioRef.current && audioRef.current.readyState < 2) {
          await new Promise<void>((resolve) => {
            if (!audioRef.current) {
              resolve();
              return;
            }
            const checkReady = () => {
              if (audioRef.current && audioRef.current.readyState >= 2) {
                audioRef.current.removeEventListener('canplay', checkReady);
                resolve();
              }
            };
            audioRef.current.addEventListener('canplay', checkReady);
            audioRef.current.load();
          });
        }
        if (audioRef.current) {
          await audioRef.current.play();
        }
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }, [isPlaying]);

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <button
        onClick={handlePlayPause}
        className="bg-blue-600 text-white p-4 rounded-full hover:bg-blue-700 transition-colors flex items-center justify-center"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg className="w-6 h-6" fill="black" viewBox="0 0 20 20">
            <rect x="6" y="3" width="3.5" height="14" rx="0.75" />
            <rect x="10.5" y="3" width="3.5" height="14" rx="0.75" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="black" viewBox="0 0 20 20">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
        )}
      </button>
      <audio ref={audioRef} src={audioUrl} preload="auto" />
    </div>
  );
}

