'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
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

function generateMaintenanceToken(): string {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${MAINTENANCE_QR_PREFIX}-${id}`;
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

  return <canvas ref={canvasRef} className="rounded-apple bg-white" />;
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
  const { user } = useAuth();
  const { t } = useTranslation();
  const qrt = t.admin.qrCodes;
  const PURPOSE_OPTIONS = buildPurposeOptions(qrt);
  const [codes, setCodes] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateQRCodeInput>({
    label: '',
    purpose: 'custom',
    content: '',
    description: '',
  });

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
  };

  const handleCreate = async () => {
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
      resetForm();
      await load();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : qrt.createError;
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
    // iOS uses &, Android uses ?; most modern handlers accept either.
    window.location.href = `sms:?&body=${body}`;
  };

  const handleShareWhatsApp = (qr: QRCode) => {
    const body = encodeURIComponent(buildShareBody(qr));
    window.open(`https://wa.me/?text=${body}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> {qrt.backToSettings}
          </Link>
          <h1 className="text-4xl font-bold tracking-tight">{qrt.title}</h1>
          <p className="text-text-secondary mt-2">{qrt.subtitle}</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all shadow-apple"
        >
          {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {showForm ? qrt.cancelButton : qrt.newQrCode}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="apple-card space-y-6">
          <h2 className="text-2xl font-semibold">{qrt.createTitle}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">{qrt.labelField}</label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder={qrt.labelPlaceholder}
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{qrt.purposeField}</label>
              <select
                value={form.purpose}
                onChange={(e) => {
                  const purpose = e.target.value as QRCodePurpose;
                  setForm((prev) => {
                    const next = { ...prev, purpose };
                    if (purpose === 'maintenance_card') {
                      // Always regenerate so each card has a unique token
                      next.content = generateMaintenanceToken();
                    } else if (prev.purpose === 'maintenance_card' && prev.content.startsWith(MAINTENANCE_QR_PREFIX)) {
                      // Leaving maintenance_card — clear the auto-filled token
                      next.content = '';
                    }
                    return next;
                  });
                }}
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
              >
                {PURPOSE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                {qrt.contentField}
              </label>
              <input
                type="text"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder={qrt.contentPlaceholder}
                readOnly={form.purpose === 'maintenance_card'}
                className={`w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all ${
                  form.purpose === 'maintenance_card' ? 'font-mono text-sm opacity-80 cursor-not-allowed' : ''
                }`}
              />
              {form.purpose === 'maintenance_card' ? (
                <p className="text-xs text-text-tertiary mt-1">{qrt.contentHelpMaintenance}</p>
              ) : (
                <p className="text-xs text-text-tertiary mt-1">{qrt.contentHelp}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                {qrt.descriptionField}
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder={qrt.descriptionPlaceholder}
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* Live preview */}
          {form.content && (
            <div className="flex items-center gap-6 p-4 bg-surface-elevated rounded-apple">
              <QRPreview value={form.content} />
              <div className="text-sm text-text-secondary">
                <p className="font-medium text-text-primary mb-1">{qrt.previewLabel}</p>
                <p className="break-all">{form.content}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              onClick={resetForm}
              className="px-6 py-3 border border-border text-text-secondary hover:text-text-primary rounded-apple transition-all"
            >
              {qrt.cancelButton}
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold rounded-apple transition-all"
            >
              <Check className="w-5 h-5" />
              {saving ? qrt.creatingButton : qrt.createButton}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : codes.length === 0 ? (
        <div className="apple-card text-center py-12">
          <QrCode className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">{qrt.noCodesTitle}</h3>
          <p className="text-text-secondary">{qrt.noCodesDescription}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {codes.map((qr) => (
            <div key={qr.id} className="apple-card">
              <div className="flex gap-4">
                <div className="flex-shrink-0 p-3 bg-white rounded-apple border border-border">
                  <QRPreview value={qr.content} size={128} />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-lg truncate">{qr.label}</h3>
                      <p className="text-xs text-text-tertiary uppercase tracking-wide">
                        {PURPOSE_OPTIONS.find((p) => p.value === qr.purpose)?.label ||
                          qr.purpose}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleActive(qr)}
                      className={`px-2 py-1 text-xs rounded-apple font-semibold ${
                        qr.active
                          ? 'bg-success/10 text-success'
                          : 'bg-surface-elevated text-text-tertiary'
                      }`}
                    >
                      {qr.active ? qrt.activeBadge : qrt.inactiveBadge}
                    </button>
                  </div>

                  <p className="text-sm text-text-secondary break-all line-clamp-2">
                    {qr.content}
                  </p>
                  {qr.description && (
                    <p className="text-xs text-text-tertiary line-clamp-2">
                      {qr.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => handleCopy(qr)}
                      title={qrt.copyTitle}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-surface-elevated hover:bg-border rounded-apple transition-all"
                    >
                      <Copy className="w-3.5 h-3.5" /> {qrt.copyButton}
                    </button>
                    <button
                      onClick={() => handleDownload(qr)}
                      title={qrt.downloadTitle}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-surface-elevated hover:bg-border rounded-apple transition-all"
                    >
                      <Download className="w-3.5 h-3.5" /> {qrt.pngButton}
                    </button>
                    <button
                      onClick={() => handleShareEmail(qr)}
                      title={qrt.shareEmailTitle}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-apple transition-all"
                    >
                      <Mail className="w-3.5 h-3.5" /> {qrt.emailButton}
                    </button>
                    <button
                      onClick={() => handleShareSMS(qr)}
                      title={qrt.shareSmsTitle}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-apple transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> {qrt.smsButton}
                    </button>
                    <button
                      onClick={() => handleShareWhatsApp(qr)}
                      title={qrt.shareWhatsappTitle}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-success/10 hover:bg-success/20 text-success rounded-apple transition-all"
                    >
                      {qrt.whatsappButton}
                    </button>
                    <button
                      onClick={() => handleDelete(qr)}
                      title={qrt.deleteTitle}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-error/10 hover:bg-error/20 text-error rounded-apple transition-all ml-auto"
                    >
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
