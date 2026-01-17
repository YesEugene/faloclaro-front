'use client';

import { CSSProperties } from 'react';

export function AudioPillRow(props: {
  text: string;
  onPlay?: () => void;
  isPlaying?: boolean;
  style?: CSSProperties;
}) {
  const { text, onPlay, isPlaying, style } = props;
  const canPlay = typeof onPlay === 'function';

  return (
    <div
      className="w-full"
      style={{
        minHeight: '50px',
        backgroundColor: '#FFFFFF',
        borderRadius: '18px',
        border: 'none',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        ...style,
      }}
    >
      <p
        style={{
          margin: 0,
          flex: 1,
          minWidth: 0,
          fontSize: '16px',
          fontWeight: 500,
          color: '#000',
          whiteSpace: 'normal',
          overflowWrap: 'anywhere',
          lineHeight: '1.25',
        }}
      >
        {text}
      </p>

      {canPlay && (
        <button
          onClick={onPlay}
          disabled={!!isPlaying}
          aria-label="Play"
          className="flex-shrink-0 transition-colors"
          style={{
            width: '36px',
            height: '36px',
            padding: 0,
            borderRadius: '999px',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: isPlaying ? 'default' : 'pointer',
          }}
        >
          {isPlaying ? (
            <svg className="w-9 h-9" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#1A8CFF' }}>
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="w-9 h-9" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#1A8CFF' }}>
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
}


