'use client';

export function ReplayPill(props: {
  lang: 'ru' | 'en' | 'pt' | string;
  onClick: () => void;
}) {
  const src = props.lang === 'ru' ? '/Img/Website/Replay%20RU.svg' : '/Img/Website/Replay%20EN.svg';

  return (
    <div
      className="fixed left-0 right-0 z-40 flex justify-center"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px + 50px + 40px)',
        paddingLeft: '16px',
        paddingRight: '16px',
      }}
    >
      <button onClick={props.onClick} className="w-full max-w-md flex justify-center" style={{ background: 'transparent' }}>
        <img src={src} alt={props.lang === 'ru' ? 'Пройти заново' : 'Replay'} style={{ height: '50px', width: 'auto' }} />
      </button>
    </div>
  );
}
