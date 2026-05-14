'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { MultiLanguageText } from '@/types';
import { createService } from '@/lib/services/serviceService';
import { SUPPORTED_LANGUAGES, SERVICE_CATEGORIES } from '@/lib/utils/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import toast from 'react-hot-toast';

export default function NewServicePage() {
  const { t } = useTranslation();
  const sn = t.admin.serviceNew;
  const router = useRouter();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userData && userData.role !== 'admin') {
      router.replace('/admin/services');
    }
  }, [userData, router]);

  const [name, setName] = useState<MultiLanguageText>({ en: '', pt: '', es: '', ko: '' });
  const [description, setDescription] = useState<MultiLanguageText>({ en: '', pt: '', es: '', ko: '' });
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [duration, setDuration] = useState('');
  const [category, setCategory] = useState('');
  const [includes, setIncludes] = useState<string[]>([]);
  const [includeInput, setIncludeInput] = useState('');
  const [active, setActive] = useState(true);

  if (userData && userData.role !== 'admin') return null;

  const addInclude = () => {
    if (includeInput.trim() && !includes.includes(includeInput.trim())) {
      setIncludes([...includes, includeInput.trim()]);
      setIncludeInput('');
    }
  };

  const removeInclude = (item: string) => {
    setIncludes(includes.filter((i) => i !== item));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.en.trim()) {
      toast.error(sn.validationName);
      return;
    }

    if (!category) {
      toast.error(sn.validationCategory);
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      toast.error(sn.validationPrice);
      return;
    }

    if (!duration || parseInt(duration) <= 0) {
      toast.error(sn.validationDuration);
      return;
    }

    try {
      setLoading(true);

      await createService({
        name,
        description,
        price: parseFloat(price),
        currency,
        duration: parseInt(duration),
        includes,
        category,
        active,
      });

      toast.success(sn.serviceCreated);
      router.push('/admin/services');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create service';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sc" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={() => router.back()}
          style={{
            padding: 8,
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: 'transparent',
            color: 'var(--ink)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="sc-h1" style={{ margin: 0 }}>{sn.title}</h1>
          <p className="sc-helper" style={{ margin: '4px 0 0' }}>{sn.subtitle}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="sc-card-static">
          <h2 className="sc-h2" style={{ margin: 0, marginBottom: 24, fontSize: 24 }}>{sn.basicInfo}</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <label className="sc-label">
                {sn.serviceName} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <div key={lang.code} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: 128, fontSize: 14, color: 'var(--soft)' }}>
                      {lang.flag} {lang.name}
                    </span>
                    <input
                      type="text"
                      value={name[lang.code] || ''}
                      onChange={(e) => setName({ ...name, [lang.code]: e.target.value })}
                      placeholder={`Service name in ${lang.name}`}
                      className="sc-input"
                      style={{ flex: 1, minWidth: 200 }}
                      required={lang.code === 'en'}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="sc-label">{sn.description}</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <div key={lang.code} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: 128, fontSize: 14, color: 'var(--soft)', paddingTop: 12 }}>
                      {lang.flag} {lang.name}
                    </span>
                    <textarea
                      value={description[lang.code] || ''}
                      onChange={(e) => setDescription({ ...description, [lang.code]: e.target.value })}
                      placeholder={`Description in ${lang.name}`}
                      rows={3}
                      className="sc-textarea"
                      style={{ flex: 1, minWidth: 200, resize: 'none' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              <div>
                <label className="sc-label">
                  {sn.category} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="sc-select"
                  required
                >
                  <option value="">{sn.selectCategory}</option>
                  {SERVICE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="sc-label">
                  {sn.price} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="sc-input"
                  required
                />
              </div>

              <div>
                <label className="sc-label">{sn.currency}</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="sc-select"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="BRL">BRL (R$)</option>
                </select>
              </div>

              <div>
                <label className="sc-label">
                  {sn.duration} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="2"
                  className="sc-input"
                  required
                />
              </div>
            </div>

            <div>
              <label className="sc-label">{sn.whatsIncluded}</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  type="text"
                  value={includeInput}
                  onChange={(e) => setIncludeInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInclude())}
                  placeholder={sn.addItemPlaceholder}
                  className="sc-input"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={addInclude}
                  style={{
                    padding: '12px 16px',
                    background: 'var(--off-paper)',
                    border: '1px solid var(--hairline)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--ink)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--off-paper)'; }}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {includes.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {includes.map((item) => (
                    <span
                      key={item}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '4px 12px',
                        background: 'var(--brand-tint)',
                        color: 'var(--brand)',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 14,
                      }}
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => removeInclude(item)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          color: 'inherit',
                          display: 'inline-flex',
                          transition: 'color 0.15s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--brand)'; }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  style={{ width: 20, height: 20, accentColor: 'var(--brand)' }}
                />
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{sn.active}</span>
              </label>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={loading}
            className="sc-cta"
            style={{ flex: 1, minWidth: 200 }}
          >
            {loading ? sn.creatingService : sn.createService}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="sc-cta-ghost"
          >
            {t.common.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}
