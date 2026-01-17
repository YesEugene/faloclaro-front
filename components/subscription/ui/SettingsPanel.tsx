'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { useAppLanguage } from '@/lib/language-context';
import { supabase } from '@/lib/supabase';

type AppLanguage = 'ru' | 'en';

type SettingsResponse = {
  email: string | null;
  language_preference: AppLanguage;
  email_notifications_enabled: boolean | null;
};

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

async function getAuthAccessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch {
    return null;
  }
}

export function SettingsPanel(props: { open: boolean; onClose: () => void; lessonToken?: string | null }) {
  const { language: appLanguage, setLanguage } = useAppLanguage();
  const isMobile = useIsMobile();

  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [selectedLang, setSelectedLang] = useState<AppLanguage>('ru');

  const labels = useMemo(() => {
    const isRu = appLanguage === 'ru';
    return {
      title: isRu ? 'Настройки' : 'Settings',
      chooseLanguage: isRu ? 'Выберите язык' : 'Choose language',
      emailSettingsTitle: isRu ? 'Настройки E-mail' : 'E-mail settings',
      emailSettingsDesc: isRu
        ? 'Мы присылаем напоминания об уроках и вашу статистику. Вы можете отключить письма или изменить почту.'
        : 'We send lesson reminders and your stats. You can disable emails or change your email address.',
      youReceiveEmails: isRu ? 'Вы получаете письма' : 'You receive emails',
      emailPlaceholder: isRu ? 'Ваш e-mail' : 'Your e-mail',
      save: isRu ? 'Сохранить' : 'Save',
      caution: isRu ? 'Этот email используется для входа. Меняйте осторожно.' : 'This email is used for login. Change carefully.',
      closeAria: isRu ? 'Закрыть' : 'Close',
      langEn: 'English',
      langRu: 'Русский',
    };
  }, [appLanguage]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (props.open) {
      setEntered(false);
      const t = window.setTimeout(() => setEntered(true), 10);
      return () => window.clearTimeout(t);
    }
    return;
  }, [props.open]);

  // ESC close
  useEffect(() => {
    if (!props.open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [props.open, props.onClose]);

  useEffect(() => {
    if (!props.open) return;
    setError(null);
    setLoading(true);
    (async () => {
      try {
        const authAccessToken = await getAuthAccessToken();
        const res = await fetch('/api/subscription/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lessonToken: props.lessonToken || null,
            authAccessToken,
          }),
        });
        const json = await res.json();
        if (!json?.success) throw new Error(json?.error || 'Failed');

        const s = json.settings as SettingsResponse;
        setEmail(s.email || '');
        setSelectedLang((s.language_preference || 'ru') as AppLanguage);
        setEmailEnabled(typeof s.email_notifications_enabled === 'boolean' ? s.email_notifications_enabled : true);
      } catch (e: any) {
        setError(e?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [props.open, props.lessonToken]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const authAccessToken = await getAuthAccessToken();
      const res = await fetch('/api/subscription/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonToken: props.lessonToken || null,
          authAccessToken,
          language_preference: selectedLang,
          email: email.trim(),
          email_notifications_enabled: emailEnabled,
        }),
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.error || 'Failed');

      // Apply language immediately to UI
      setLanguage(selectedLang);

      props.onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;
  if (!props.open) return null;

  const panel = (
    <div
      aria-modal="true"
      role="dialog"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
      }}
    >
      {/* Overlay */}
      <div
        onClick={props.onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.20)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: isMobile ? 0 : '50%',
          left: isMobile ? 0 : '50%',
          transform: isMobile ? (entered ? 'translateX(0)' : 'translateX(-105%)') : 'translate(-50%, -50%)',
          height: isMobile ? '100%' : 'auto',
          width: isMobile ? '80%' : '420px',
          maxWidth: isMobile ? '80%' : 'calc(100% - 32px)',
          background: '#ffffff',
          borderRadius: isMobile ? '0 18px 18px 0' : '18px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.18)',
          padding: '20px',
          overflow: 'auto',
          transition: 'transform 260ms ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '26px', fontWeight: 700 }}>{labels.title}</div>
          <button
            onClick={props.onClose}
            aria-label={labels.closeAria}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              border: '1px solid rgba(0,0,0,0.10)',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: '36px',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginTop: '16px', background: '#F3F5F8', borderRadius: '16px', padding: '16px' }}>
          <div style={{ fontSize: '18px', fontWeight: 700 }}>{labels.chooseLanguage}</div>

          <div style={{ marginTop: '12px', background: '#fff', borderRadius: '14px', padding: '12px' }}>
            {([
              { code: 'en' as const, name: labels.langEn },
              { code: 'ru' as const, name: labels.langRu },
            ] as const).map((lang) => {
              const checked = selectedLang === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLang(lang.code)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 10px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '999px',
                      border: '2px solid rgba(0,0,0,0.35)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {checked ? (
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '999px',
                          background: '#34BF5D',
                        }}
                      />
                    ) : null}
                  </span>
                  <span style={{ fontSize: '18px' }}>{lang.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: '16px', background: '#F3F5F8', borderRadius: '16px', padding: '16px' }}>
          <div style={{ fontSize: '18px', fontWeight: 700 }}>{labels.emailSettingsTitle}</div>
          <div style={{ marginTop: '10px', color: 'rgba(0,0,0,0.70)', fontSize: '14px', lineHeight: '1.35' }}>
            {labels.emailSettingsDesc}
          </div>

          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '14px', color: 'rgba(0,0,0,0.75)' }}>{labels.youReceiveEmails}</div>
            <button
              onClick={() => setEmailEnabled((v) => !v)}
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                cursor: 'pointer',
                height: '36px',
              }}
              aria-label={labels.youReceiveEmails}
            >
              <Image
                src={emailEnabled ? '/Img/Website/Switch2.svg' : '/Img/Website/Switch.svg'}
                alt={emailEnabled ? 'On' : 'Off'}
                width={70}
                height={41}
                style={{ height: '36px', width: 'auto' }}
              />
            </button>
          </div>

          <div style={{ marginTop: '14px' }}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={labels.emailPlaceholder}
              style={{
                width: '100%',
                height: '52px',
                borderRadius: '14px',
                border: '1px solid rgba(0,0,0,0.08)',
                padding: '0 14px',
                fontSize: '18px',
                background: '#fff',
              }}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving || loading}
            style={{
              marginTop: '12px',
              width: '100%',
              height: '56px',
              borderRadius: '14px',
              border: 'none',
              background: '#34BF5D',
              color: '#fff',
              fontSize: '18px',
              fontWeight: 700,
              cursor: saving || loading ? 'not-allowed' : 'pointer',
              opacity: saving || loading ? 0.7 : 1,
            }}
          >
            {labels.save}
          </button>

          <div style={{ marginTop: '10px', fontSize: '13px', color: 'rgba(0,0,0,0.65)' }}>
            <span style={{ marginRight: '8px' }}>⚠</span>
            {labels.caution}
          </div>

          {loading ? (
            <div style={{ marginTop: '10px', fontSize: '13px', color: 'rgba(0,0,0,0.55)' }}>Loading…</div>
          ) : null}
          {error ? (
            <div style={{ marginTop: '10px', fontSize: '13px', color: '#b42318' }}>{error}</div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}


