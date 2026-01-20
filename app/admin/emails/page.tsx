'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type TemplateListRow = {
  key: string;
  name: string;
  category: string;
  is_active: boolean;
  subject_ru: string;
  subject_en: string;
  updated_at?: string | null;
};

export default function AdminEmailsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'templates' | 'campaigns' | 'logs'>('templates');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [templates, setTemplates] = useState<TemplateListRow[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [tpl, setTpl] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorMode, setEditorMode] = useState<'text' | 'visual'>('text');

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);

  const [logs, setLogs] = useState<any[]>([]);
  const [logEmailFilter, setLogEmailFilter] = useState('');
  const [logTemplateFilter, setLogTemplateFilter] = useState('');

  const [testTo, setTestTo] = useState('');
  const [statsUserEmail, setStatsUserEmail] = useState('');
  const [testLang, setTestLang] = useState<'ru' | 'en'>('ru');
  const [testSending, setTestSending] = useState(false);

  const isLayoutColumnsMissing = (msg: string) => {
    const m = (msg || '').toLowerCase();
    return (m.includes('layout_json_en') || m.includes('layout_json_ru')) && (m.includes('schema cache') || m.includes('does not exist') || m.includes('missing'));
  };

  const loadTemplates = async () => {
    setError('');
    const res = await fetch('/api/admin/emails/templates');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load templates');
    setTemplates(data.templates || []);
  };

  const loadTemplate = async (key: string) => {
    setError('');
    const res = await fetch(`/api/admin/emails/templates/${encodeURIComponent(key)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load template');
    setTpl(data.template);
  };

  const loadCampaigns = async () => {
    setError('');
    const res = await fetch('/api/admin/emails/campaigns');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load campaigns');
    setCampaigns(data.campaigns || []);
    setSteps(data.steps || []);
  };

  const loadLogs = async () => {
    setError('');
    const sp = new URLSearchParams();
    sp.set('limit', '200');
    if (logEmailFilter.trim()) sp.set('email', logEmailFilter.trim());
    if (logTemplateFilter.trim()) sp.set('template', logTemplateFilter.trim());
    const res = await fetch(`/api/admin/emails/logs?${sp.toString()}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load logs');
    setLogs(data.logs || []);
  };

  useEffect(() => {
    (async () => {
      try {
        await loadTemplates();
      } catch (e: any) {
        setError(e?.message || 'Failed');
      }
    })();
  }, []);

  useEffect(() => {
    if (activeTab === 'campaigns') {
      (async () => {
        try {
          await loadCampaigns();
        } catch (e: any) {
          setError(e?.message || 'Failed');
        }
      })();
    }
    if (activeTab === 'logs') {
      (async () => {
        try {
          await loadLogs();
        } catch (e: any) {
          setError(e?.message || 'Failed');
        }
      })();
    }
  }, [activeTab]);

  const groupedSteps = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const s of steps) {
      if (!m.has(s.campaign_key)) m.set(s.campaign_key, []);
      m.get(s.campaign_key)!.push(s);
    }
    for (const [k, arr] of m.entries()) {
      arr.sort((a, b) => (a.step_index || 0) - (b.step_index || 0));
      m.set(k, arr);
    }
    return m;
  }, [steps]);

  const handleSaveTemplate = async () => {
    if (!tpl?.key) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/emails/templates/${encodeURIComponent(tpl.key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tpl.name,
          category: tpl.category,
          is_active: tpl.is_active,
          subject_ru: tpl.subject_ru,
          subject_en: tpl.subject_en,
          body_ru: tpl.body_ru,
          body_en: tpl.body_en,
          layout_json_ru: tpl.layout_json_ru ?? null,
          layout_json_en: tpl.layout_json_en ?? null,
          cta_enabled: tpl.cta_enabled,
          cta_text_ru: tpl.cta_text_ru,
          cta_text_en: tpl.cta_text_en,
          cta_url_template: tpl.cta_url_template,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to save');
      setSuccess('Сохранено');
      await loadTemplates();
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const ensureVisualLayout = (lang: 'ru' | 'en') => {
    const key = lang === 'ru' ? 'layout_json_ru' : 'layout_json_en';
    const existing = tpl?.[key];
    if (existing && typeof existing === 'object' && Array.isArray(existing.blocks)) return;
    setTpl({
      ...tpl,
      [key]: {
        maxWidth: 580,
        blocks: [
          {
            id: crypto.randomUUID(),
            bg: '#FFFFFF',
            border: true,
            borderColor: '#111111',
            radius: 24,
            padding: 18,
            title: '',
            text: '',
          },
        ],
      },
    });
  };

  const updateVisual = (lang: 'ru' | 'en', updater: (layout: any) => any) => {
    const key = lang === 'ru' ? 'layout_json_ru' : 'layout_json_en';
    const layout = tpl?.[key];
    const next = updater(layout);
    setTpl({ ...tpl, [key]: next });
  };

  const addBlock = (lang: 'ru' | 'en') => {
    ensureVisualLayout(lang);
    updateVisual(lang, (layout) => ({
      ...layout,
      blocks: [
        ...(layout?.blocks || []),
        {
          id: crypto.randomUUID(),
          bg: '#FFFFFF',
          border: false,
          borderColor: '#111111',
          radius: 24,
          padding: 18,
          title: '',
          text: '',
        },
      ],
    }));
  };

  const removeBlock = (lang: 'ru' | 'en', blockId: string) => {
    updateVisual(lang, (layout) => ({ ...layout, blocks: (layout?.blocks || []).filter((b: any) => b.id !== blockId) }));
  };

  const moveBlock = (lang: 'ru' | 'en', blockId: string, dir: -1 | 1) => {
    updateVisual(lang, (layout) => {
      const blocks = [...(layout?.blocks || [])];
      const idx = blocks.findIndex((b: any) => b.id === blockId);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= blocks.length) return layout;
      const tmp = blocks[idx];
      blocks[idx] = blocks[j];
      blocks[j] = tmp;
      return { ...layout, blocks };
    });
  };

  const renderVisualEditor = (lang: 'ru' | 'en') => {
    const key = lang === 'ru' ? 'layout_json_ru' : 'layout_json_en';
    const layout = tpl?.[key];
    const blocks = Array.isArray(layout?.blocks) ? layout.blocks : [];

    const colorOptions: Array<{ label: string; value: string }> = [
      { label: 'White', value: '#FFFFFF' },
      { label: 'Yellow', value: '#FAF7BF' },
      { label: 'Green', value: '#BDF6BB' },
      { label: 'Pink', value: '#FFE3E3' },
      { label: 'Purple', value: '#B277FF' },
      { label: 'Black', value: '#111111' },
    ];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-gray-900">Visual blocks ({lang.toUpperCase()})</div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700">
              Max width
              <input
                className="ml-2 w-24 border border-gray-300 rounded-lg px-2 py-1 text-sm"
                value={layout?.maxWidth ?? 580}
                onChange={(e) =>
                  updateVisual(lang, (l) => ({ ...(l || { blocks: [] }), maxWidth: Number(e.target.value || 580) }))
                }
              />
            </label>
            <button
              onClick={() => addBlock(lang)}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              + Add block
            </button>
          </div>
        </div>

        {blocks.map((b: any, idx: number) => (
          <div key={b.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-gray-800">Block {idx + 1}</div>
              <div className="flex items-center gap-2">
                <button onClick={() => moveBlock(lang, b.id, -1)} className="px-2 py-1 text-sm bg-white border rounded">
                  ↑
                </button>
                <button onClick={() => moveBlock(lang, b.id, 1)} className="px-2 py-1 text-sm bg-white border rounded">
                  ↓
                </button>
                <button
                  onClick={() => removeBlock(lang, b.id)}
                  className="px-2 py-1 text-sm bg-white border border-red-200 text-red-700 rounded"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Background</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={b.bg || '#FFFFFF'}
                  onChange={(e) =>
                    updateVisual(lang, (l) => ({
                      ...l,
                      blocks: (l.blocks || []).map((x: any) => (x.id === b.id ? { ...x, bg: e.target.value } : x)),
                    }))
                  }
                >
                  {colorOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label} ({c.value})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!b.border}
                    onChange={(e) =>
                      updateVisual(lang, (l) => ({
                        ...l,
                        blocks: (l.blocks || []).map((x: any) => (x.id === b.id ? { ...x, border: e.target.checked } : x)),
                      }))
                    }
                  />
                  Border
                </label>
                <input
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-36"
                  value={b.borderColor || '#111111'}
                  onChange={(e) =>
                    updateVisual(lang, (l) => ({
                      ...l,
                      blocks: (l.blocks || []).map((x: any) =>
                        x.id === b.id ? { ...x, borderColor: e.target.value } : x
                      ),
                    }))
                  }
                  placeholder="#111111"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-sm text-gray-700">
                  Radius
                  <input
                    className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm mt-1"
                    value={b.radius ?? 24}
                    onChange={(e) =>
                      updateVisual(lang, (l) => ({
                        ...l,
                        blocks: (l.blocks || []).map((x: any) =>
                          x.id === b.id ? { ...x, radius: Number(e.target.value || 24) } : x
                        ),
                      }))
                    }
                  />
                </label>
                <label className="text-sm text-gray-700">
                  Padding
                  <input
                    className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm mt-1"
                    value={b.padding ?? 18}
                    onChange={(e) =>
                      updateVisual(lang, (l) => ({
                        ...l,
                        blocks: (l.blocks || []).map((x: any) =>
                          x.id === b.id ? { ...x, padding: Number(e.target.value || 18) } : x
                        ),
                      }))
                    }
                  />
                </label>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title (Orelega One)</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={b.title || ''}
                onChange={(e) =>
                  updateVisual(lang, (l) => ({
                    ...l,
                    blocks: (l.blocks || []).map((x: any) => (x.id === b.id ? { ...x, title: e.target.value } : x)),
                  }))
                }
              />
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Text</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-28"
                value={b.text || ''}
                onChange={(e) =>
                  updateVisual(lang, (l) => ({
                    ...l,
                    blocks: (l.blocks || []).map((x: any) => (x.id === b.id ? { ...x, text: e.target.value } : x)),
                  }))
                }
              />
            </div>
          </div>
        ))}

        {blocks.length === 0 && (
          <div className="text-sm text-gray-500">
            No blocks yet. Click “Add block”.
          </div>
        )}
      </div>
    );
  };

  const handleTestSend = async () => {
    if (!tpl?.key) return;
    setTestSending(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/emails/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testTo, templateKey: tpl.key, lang: testLang, statsUserEmail: statsUserEmail.trim() || null }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to send');
      setSuccess('Тестовое письмо отправлено');
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image src="/Img/Website/logo.svg" alt="FaloClaro" width={120} height={40} className="h-8 w-auto" />
              <h1 className="text-xl font-bold text-gray-900">Emails</h1>
            </div>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ← Назад
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('templates')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'templates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'campaigns'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Campaigns
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'logs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Logs
            </button>
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLayoutColumnsMissing(error) && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 px-4 py-3 rounded-lg mb-6 text-sm">
            <div className="font-semibold mb-1">Нужно добавить колонки для визуального редактора</div>
            <div className="mb-2">
              Supabase пишет, что в таблице <span className="font-mono">email_templates</span> нет колонок{' '}
              <span className="font-mono">layout_json_ru</span>/<span className="font-mono">layout_json_en</span> (schema cache).
            </div>
            <div className="mb-1">Запусти это в Supabase SQL Editor:</div>
            <pre className="bg-white border border-yellow-200 rounded p-3 overflow-x-auto text-xs">
{`ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS layout_json_ru JSONB,
  ADD COLUMN IF NOT EXISTS layout_json_en JSONB;`}
            </pre>
          </div>
        )}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">{success}</div>}

        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="font-semibold text-gray-900">Templates</div>
                <button
                  onClick={() => loadTemplates().catch((e) => setError((e as any)?.message || 'Failed'))}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Refresh
                </button>
              </div>
              <div className="p-2">
                {templates.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => {
                      setSelectedKey(t.key);
                      loadTemplate(t.key).catch((e) => setError((e as any)?.message || 'Failed'));
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                      selectedKey === t.key ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{t.key}</div>
                      <div className={`text-xs ${t.is_active ? 'text-green-600' : 'text-gray-400'}`}>{t.is_active ? 'on' : 'off'}</div>
                    </div>
                    <div className="text-xs text-gray-500">{t.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="font-semibold text-gray-900">Editor</div>
                <button
                  disabled={!tpl || saving}
                  onClick={handleSaveTemplate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
              {!tpl ? (
                <div className="p-6 text-gray-500">Select a template on the left.</div>
              ) : (
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditorMode('text')}
                      className={`px-3 py-2 rounded-lg text-sm border ${
                        editorMode === 'text' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-700'
                      }`}
                    >
                      Text mode
                    </button>
                    <button
                      onClick={() => {
                        setEditorMode('visual');
                        ensureVisualLayout('ru');
                        ensureVisualLayout('en');
                      }}
                      className={`px-3 py-2 rounded-lg text-sm border ${
                        editorMode === 'visual' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-700'
                      }`}
                    >
                      Visual blocks
                    </button>
                    <div className="text-xs text-gray-500">
                      Visual blocks are Gmail-safe, but custom fonts may fallback in some email clients.
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
                      <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={tpl.key} disabled />
                    </div>
                    <div className="flex items-end gap-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!tpl.is_active}
                          onChange={(e) => setTpl({ ...tpl, is_active: e.target.checked })}
                        />
                        Active
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!tpl.cta_enabled}
                          onChange={(e) => setTpl({ ...tpl, cta_enabled: e.target.checked })}
                        />
                        CTA
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      value={tpl.name || ''}
                      onChange={(e) => setTpl({ ...tpl, name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject (RU)</label>
                      <input
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        value={tpl.subject_ru || ''}
                        onChange={(e) => setTpl({ ...tpl, subject_ru: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject (EN)</label>
                      <input
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        value={tpl.subject_en || ''}
                        onChange={(e) => setTpl({ ...tpl, subject_en: e.target.value })}
                      />
                    </div>
                  </div>

                  {editorMode === 'text' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Body (RU)</label>
                        <textarea
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-48"
                          value={tpl.body_ru || ''}
                          onChange={(e) => setTpl({ ...tpl, body_ru: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Body (EN)</label>
                        <textarea
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-48"
                          value={tpl.body_en || ''}
                          onChange={(e) => setTpl({ ...tpl, body_en: e.target.value })}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>{renderVisualEditor('ru')}</div>
                      <div>{renderVisualEditor('en')}</div>
                    </div>
                  )}

                  {tpl.cta_enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CTA text (RU)</label>
                        <input
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          value={tpl.cta_text_ru || ''}
                          onChange={(e) => setTpl({ ...tpl, cta_text_ru: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CTA text (EN)</label>
                        <input
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          value={tpl.cta_text_en || ''}
                          onChange={(e) => setTpl({ ...tpl, cta_text_en: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CTA url template</label>
                        <input
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          value={tpl.cta_url_template || ''}
                          onChange={(e) => setTpl({ ...tpl, cta_url_template: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <div className="font-semibold text-gray-900 mb-2">Test send</div>
                    <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
                      <div className="w-full md:w-1/2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">To email</label>
                        <input
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          value={testTo}
                          onChange={(e) => setTestTo(e.target.value)}
                          placeholder="you@example.com"
                        />
                      </div>
                      <div className="w-full md:w-1/2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Use real stats from user email (optional)</label>
                        <input
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          value={statsUserEmail}
                          onChange={(e) => setStatsUserEmail(e.target.value)}
                          placeholder="user@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lang</label>
                        <select
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          value={testLang}
                          onChange={(e) => setTestLang(e.target.value as any)}
                        >
                          <option value="ru">RU</option>
                          <option value="en">EN</option>
                        </select>
                      </div>
                      <button
                        onClick={handleTestSend}
                        disabled={testSending || !testTo.trim()}
                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
                      >
                        {testSending ? 'Sending…' : 'Send test'}
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      If “Use real stats…” is set, placeholders like {'{{weekly_topics}}'} will be computed from that user.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="space-y-4">
            {campaigns.map((c) => (
              <div key={c.key} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{c.key}</div>
                    <div className="text-sm text-gray-600">{c.name}</div>
                  </div>
                  <div className={`text-sm ${c.is_active ? 'text-green-600' : 'text-gray-400'}`}>{c.is_active ? 'active' : 'off'}</div>
                </div>
                <div className="mt-3">
                  <div className="text-sm font-medium text-gray-700 mb-2">Steps</div>
                  <div className="space-y-2">
                    {(groupedSteps.get(c.key) || []).map((s) => (
                      <div key={s.step_index} className="flex items-center justify-between text-sm border border-gray-100 rounded-md px-3 py-2">
                        <div>
                          <span className="font-semibold">#{s.step_index}</span> → <span className="font-mono">{s.template_key}</span>
                        </div>
                        <div className="text-gray-600">delay: {s.delay_hours}h</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-end gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by email</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={logEmailFilter}
                  onChange={(e) => setLogEmailFilter(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by template</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={logTemplateFilter}
                  onChange={(e) => setLogTemplateFilter(e.target.value)}
                />
              </div>
              <button onClick={() => loadLogs().catch((e) => setError((e as any)?.message || 'Failed'))} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Refresh
              </button>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-2 pr-4">sent_at</th>
                    <th className="py-2 pr-4">user</th>
                    <th className="py-2 pr-4">template</th>
                    <th className="py-2 pr-4">campaign</th>
                    <th className="py-2 pr-4">status</th>
                    <th className="py-2 pr-4">error</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((r) => (
                    <tr key={r.id} className="border-t border-gray-100">
                      <td className="py-2 pr-4 text-gray-700">{r.sent_at}</td>
                      <td className="py-2 pr-4 text-gray-700">{r.subscription_users?.email || r.user_id}</td>
                      <td className="py-2 pr-4 font-mono">{r.template_key || '-'}</td>
                      <td className="py-2 pr-4 text-gray-700">
                        {r.campaign_key ? `${r.campaign_key} #${r.campaign_step_index || ''}` : '-'}
                      </td>
                      <td className="py-2 pr-4">{r.status}</td>
                      <td className="py-2 pr-4 text-red-600">{r.error || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && <div className="text-gray-500 text-sm">No logs.</div>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


