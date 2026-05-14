'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  QrCode,
  Plus,
  Trash2,
  Mail,
  MessageSquare,
  Download,
  Copy,
  ArrowLeft,
  X,
  Check,
  Pencil,
} from 'lucide-react';
import QRCodeLib from 'qrcode';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import type { TranslationKeys } from '@/lib/translations';
import {
  listQRCodes,
  createQRCode,
  deleteQRCode,
  updateQRCode,
} from '@/lib/services/qrCodeService';
import { QRCode, QRCodePurpose, CreateQRCodeInput } from '@/types/qrCode';

function buildPurposeOptions(qr: TranslationKeys['admin']['qrCodes']): { value: QRCodePurpose; label: string }[] {
  return [
    { value: 'custom', label: qr.purposeCustom },
    { value: 'customer_signup', label: qr.purposeCustomerSignup },
    { value: 'technician_signup', label: qr.purposeTechnicianSignup },
    { value: 'product_page', label: qr.purposeProductPage },
    { value: 'order_tracking', label: qr.purposeOrderTracking },
    { value: 'device_registration', label: qr.purposeDeviceRegistration },
    { value: 'maintenance_card', label: qr.purposeMaintenanceCard },
  ];
}

const MAINTENANCE_QR_PREFIX = 'SELVAVORE-MAINTENANCE';

function getSuggestedURL(purpose: QRCodePurpose, origin: string): string | null {
  switch (purpose) {
    case 'customer_signup':
      return `${origin}/login?role=customer`;
    case 'technician_signup':
      return `${origin}/login?role=technician`;
    case 'product_page':
      return `${origin}/customer/products/{productId}`;
    case 'order_tracking':
      return `${origin}/customer/orders/{orderId}`;
    case 'device_registration':
      return `${origin}/technician/jobs/{orderId}?register=true`;
    case 'maintenance_card':
      return `${origin}/technician/scan?card={cardId}`;
    default:
      return null;
  }
}

function generateCardId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function generateMaintenanceUrl(origin: string): string {
  return `${origin}/technician/scan?card=${generateCardId()}`;
}

function isMaintenanceContent(content: string): boolean {
  return content.startsWith(MAINTENANCE_QR_PREFIX) || content.includes('/technician/scan?card=');
}

function QRPreview({ value, size = 160 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCodeLib.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      color: { dark: '#1D1D1F', light: '#FFFFFF' },
    }).catch(() => {
      // Value can't be encoded (e.g. empty) — silently skip
    });
  }, [value, size]);

  return <canvas ref={canvasRef} style={{ borderRadius: 'var(--radius-md)', background: '#fff' }} />;
}

async function generatePNG(value: string): Promise<string> {
  return QRCodeLib.toDataURL(value, {
    width: 512,
    margin: 2,
    color: { dark: '#1D1D1F', light: '#FFFFFF' },
  });
}

function downloadDataURL(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function buildShareBody(qr: QRCode): string {
  const lines = [qr.label];
  if (qr.description) lines.push(qr.description);
  lines.push('', qr.content);
  return lines.join('\n');
}

export default function QRCodeManagementPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const qrt = t.admin.qrCodes;
  const PURPOSE_OPTIONS = buildPurposeOptions(qrt);
  const [codes, setCodes] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateQRCodeInput>({
    label: '',
    purpose: 'custom',
    content: '',
    description: '',
  });
  const [origin, setOrigin] = useState('');
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const suggestedURL = getSuggestedURL(form.purpose, origin);

  useEffect(() => {
    if (userData && userData.role !== 'admin') {
      router.replace('/admin');
    }
  }, [userData, router]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await listQRCodes();
      setCodes(data);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : qrt.loadError;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setForm({ label: '', purpose: 'custom', content: '', description: '' });
    setShowForm(false);
    setEditingId(null);
  };

  const handleStartEdit = (qr: QRCode) => {
    setEditingId(qr.id);
    setForm({
      label: qr.label,
      purpose: qr.purpose,
      content: qr.content,
      description: qr.description || '',
    });
    setShowForm(true);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error(qrt.mustBeSignedInToast);
      return;
    }
    if (!form.label.trim() || !form.content.trim()) {
      toast.error(qrt.labelAndContentRequiredToast);
      return;
    }
    try {
      setSaving(true);
      if (editingId) {
        await updateQRCode(editingId, {
          label: form.label.trim(),
          purpose: form.purpose,
          content: form.content.trim(),
          description: form.description?.trim() || '',
        });
        toast.success(qrt.updatedToast);
      } else {
        await createQRCode(
          {
            label: form.label.trim(),
            purpose: form.purpose,
            content: form.content.trim(),
            description: form.description?.trim() || '',
          },
          user.uid
        );
        toast.success(qrt.createdToast);
      }
      resetForm();
      await load();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : editingId ? qrt.updateError : qrt.createError;
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (qr: QRCode) => {
    if (!confirm(qrt.confirmDeleteFormat.replace('{label}', qr.label))) return;
    try {
      await deleteQRCode(qr.id);
      toast.success(qrt.deletedToast);
      await load();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : qrt.deleteError;
      toast.error(message);
    }
  };

  const handleToggleActive = async (qr: QRCode) => {
    try {
      await updateQRCode(qr.id, { active: !qr.active });
      await load();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : qrt.updateError;
      toast.error(message);
    }
  };

  const handleCopy = async (qr: QRCode) => {
    try {
      await navigator.clipboard.writeText(qr.content);
      toast.success(qrt.contentCopiedToast);
    } catch {
      toast.error(qrt.clipboardUnavailableToast);
    }
  };

  const handleDownload = async (qr: QRCode) => {
    try {
      const dataUrl = await generatePNG(qr.content);
      const safe = qr.label.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 40);
      downloadDataURL(dataUrl, `qr-${safe || qr.id}.png`);
    } catch {
      toast.error(qrt.pngFailedToast);
    }
  };

  const handleShareEmail = (qr: QRCode) => {
    const subject = encodeURIComponent(qrt.shareSubjectFormat.replace('{label}', qr.label));
    const body = encodeURIComponent(buildShareBody(qr));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleShareSMS = (qr: QRCode) => {
    const body = encodeURIComponent(buildShareBody(qr));
    window.location.href = `sms:?&body=${body}`;
  };

  const handleShareWhatsApp = (qr: QRCode) => {
    const body = encodeURIComponent(buildShareBody(qr));
    window.open(`https://wa.me/?text=${body}`, '_blank', 'noopener,noreferrer');
  };

  if (userData && userData.role !== 'admin') return null;

  const actionBtn = (variant: 'neutral' | 'brand' | 'danger' = 'neutral'): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '6px 12px',
      fontSize: 12,
      borderRadius: 'var(--radius-md)',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    };
    if (variant === 'brand') return { ...base, background: 'var(--brand-tint)', color: 'var(--brand)' };
    if (variant === 'danger') return { ...base, background: 'rgba(239,68,68,0.1)', color: '#ef4444' };
    return { ...base, background: 'var(--off-paper)', color: 'var(--ink)' };
  };

  return (
    <div className="sc" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Link
            href="/admin/settings"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              color: 'var(--soft)',
              textDecoration: 'none',
              marginBottom: 8,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--brand)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--soft)'; }}
          >
            <ArrowLeft className="w-4 h-4" /> {qrt.backToSettings}
          </Link>
          <h1 className="sc-h1" style={{ margin: 0 }}>{qrt.title}</h1>
          <p className="sc-helper" style={{ margin: '8px 0 0' }}>{qrt.subtitle}</p>
        </div>
        <button
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setEditingId(null);
              setForm({ label: '', purpose: 'custom', content: '', description: '' });
              setShowForm(true);
            }
          }}
          className="sc-cta"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {showForm ? qrt.cancelButton : qrt.newQrCode}
        </button>
      </div>

      <div className="sc-card-static" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h2 className="sc-h2" style={{ margin: 0, fontSize: 20 }}>{qrt.referenceTitle}</h2>
          <p className="sc-helper" style={{ margin: '4px 0 0' }}>{qrt.referenceSubtitle}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PURPOSE_OPTIONS.filter((opt) => opt.value !== 'custom').map((opt) => {
            const url = getSuggestedURL(opt.value, origin);
            if (!url) return null;
            return (
              <div
                key={opt.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  background: 'var(--off-paper)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{opt.label}</div>
                  <code style={{ fontSize: 12, color: 'var(--soft)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{url}</code>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(url);
                      toast.success(qrt.copiedToast);
                    } catch {
                      toast.error(qrt.clipboardUnavailableToast);
                    }
                  }}
                  title={qrt.copyTooltip}
                  style={{ ...actionBtn('brand'), flexShrink: 0 }}
                >
                  <Copy className="w-3.5 h-3.5" /> {qrt.copyButton}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {showForm && (
        <div className="sc-card-static" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <h2 className="sc-h2" style={{ margin: 0, fontSize: 24 }}>
            {editingId ? qrt.editTitle : qrt.createTitle}
          </h2>

          <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <div>
              <label className="sc-label">{qrt.labelField}</label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder={qrt.labelPlaceholder}
                className="sc-input"
              />
            </div>

            <div>
              <label className="sc-label">{qrt.purposeField}</label>
              <select
                value={form.purpose}
                onChange={(e) => {
                  const purpose = e.target.value as QRCodePurpose;
                  setForm((prev) => {
                    const next = { ...prev, purpose };
                    if (purpose === 'maintenance_card' && origin) {
                      next.content = generateMaintenanceUrl(origin);
                    } else if (prev.purpose === 'maintenance_card' && isMaintenanceContent(prev.content)) {
                      next.content = '';
                    }
                    return next;
                  });
                }}
                className="sc-select"
              >
                {PURPOSE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label className="sc-label">{qrt.contentField}</label>
              <input
                type="text"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder={suggestedURL || qrt.contentPlaceholder}
                readOnly={form.purpose === 'maintenance_card'}
                className="sc-input"
                style={
                  form.purpose === 'maintenance_card'
                    ? { fontFamily: 'monospace', fontSize: 13, opacity: 0.8, cursor: 'not-allowed' }
                    : undefined
                }
              />
              {suggestedURL && form.content !== suggestedURL && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--soft)' }}>
                    {qrt.suggestedUrlLabel}: <code style={{ fontFamily: 'monospace' }}>{suggestedURL}</code>
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, content: suggestedURL })}
                    style={{
                      fontSize: 12,
                      padding: '4px 8px',
                      background: 'var(--brand-tint)',
                      color: 'var(--brand)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {qrt.useSuggestedUrl}
                  </button>
                </div>
              )}
              <p className="sc-helper" style={{ margin: '4px 0 0', fontSize: 12 }}>
                {form.purpose === 'maintenance_card' ? qrt.contentHelpMaintenance : qrt.contentHelp}
              </p>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label className="sc-label">{qrt.descriptionField}</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder={qrt.descriptionPlaceholder}
                className="sc-textarea"
                style={{ resize: 'none' }}
              />
            </div>
          </div>

          {form.content && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: 16, background: 'var(--off-paper)', borderRadius: 'var(--radius-md)' }}>
              <QRPreview value={form.content} />
              <div style={{ fontSize: 14, color: 'var(--soft)', minWidth: 0 }}>
                <p style={{ fontWeight: 500, color: 'var(--ink)', margin: 0, marginBottom: 4 }}>{qrt.previewLabel}</p>
                <p style={{ margin: 0, wordBreak: 'break-all' }}>{form.content}</p>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              onClick={resetForm}
              className="sc-cta-ghost"
            >
              {qrt.cancelButton}
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="sc-cta"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Check className="w-5 h-5" />
              {saving
                ? editingId ? qrt.savingButton : qrt.creatingButton
                : editingId ? qrt.saveButton : qrt.createButton}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
          <div className="sc-spinner" />
        </div>
      ) : codes.length === 0 ? (
        <div className="sc-card-static" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <QrCode className="w-16 h-16" style={{ margin: '0 auto 16px', color: 'var(--soft)' }} />
          <h3 className="sc-h2" style={{ margin: 0, marginBottom: 8, fontSize: 20 }}>{qrt.noCodesTitle}</h3>
          <p className="sc-helper" style={{ margin: 0 }}>{qrt.noCodesDescription}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))' }}>
          {codes.map((qr) => (
            <div key={qr.id} className="sc-card-static">
              <div style={{ display: 'flex', gap: 16 }}>
                <div
                  style={{
                    flexShrink: 0,
                    padding: 12,
                    background: '#fff',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--hairline)',
                  }}
                >
                  <QRPreview value={qr.content} size={128} />
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontWeight: 600, fontSize: 18, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{qr.label}</h3>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {PURPOSE_OPTIONS.find((p) => p.value === qr.purpose)?.label ||
                          qr.purpose}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleActive(qr)}
                      style={{
                        padding: '4px 8px',
                        fontSize: 12,
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        background: qr.active ? 'var(--brand-tint)' : 'var(--off-paper)',
                        color: qr.active ? 'var(--brand)' : 'var(--soft)',
                      }}
                    >
                      {qr.active ? qrt.activeBadge : qrt.inactiveBadge}
                    </button>
                  </div>

                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--soft)',
                      wordBreak: 'break-all',
                      margin: 0,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {qr.content}
                  </p>
                  {qr.description && (
                    <p
                      style={{
                        fontSize: 12,
                        color: 'var(--soft)',
                        margin: 0,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {qr.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 8 }}>
                    <button onClick={() => handleCopy(qr)} title={qrt.copyTitle} style={actionBtn('neutral')}>
                      <Copy className="w-3.5 h-3.5" /> {qrt.copyButton}
                    </button>
                    <button onClick={() => handleDownload(qr)} title={qrt.downloadTitle} style={actionBtn('neutral')}>
                      <Download className="w-3.5 h-3.5" /> {qrt.pngButton}
                    </button>
                    <button onClick={() => handleShareEmail(qr)} title={qrt.shareEmailTitle} style={actionBtn('brand')}>
                      <Mail className="w-3.5 h-3.5" /> {qrt.emailButton}
                    </button>
                    <button onClick={() => handleShareSMS(qr)} title={qrt.shareSmsTitle} style={actionBtn('brand')}>
                      <MessageSquare className="w-3.5 h-3.5" /> {qrt.smsButton}
                    </button>
                    <button onClick={() => handleShareWhatsApp(qr)} title={qrt.shareWhatsappTitle} style={actionBtn('brand')}>
                      {qrt.whatsappButton}
                    </button>
                    <button
                      onClick={() => handleStartEdit(qr)}
                      title={qrt.editTooltip}
                      style={{ ...actionBtn('neutral'), marginLeft: 'auto' }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(qr)} title={qrt.deleteTitle} style={actionBtn('danger')}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
