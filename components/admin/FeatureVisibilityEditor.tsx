'use client';

import { useEffect, useState } from 'react';
import { Lock, Save, RotateCcw, Sliders } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/contexts/AuthContext';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { saveRolePermissions } from '@/lib/services/rolePermissionsService';
import {
  DEFAULT_VISIBILITY,
  FeatureVisibility,
  LOCKED,
  RoleKey,
} from '@/types/rolePermissions';

const FEATURES: string[] = Object.keys(DEFAULT_VISIBILITY);
const ROLES: RoleKey[] = ['admin', 'subAdmin', 'technician', 'customer'];

const headerStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--soft)',
};

export default function FeatureVisibilityEditor() {
  const { t } = useTranslation();
  const { user, userData } = useAuth();
  const { visibility: serverVisibility, loading } = useRolePermissions();
  const [draft, setDraft] = useState<Record<string, FeatureVisibility>>(serverVisibility);
  const [saving, setSaving] = useState(false);

  const e = t.admin.settings.permissionsEditor;
  const p = t.admin.settings.permissions;

  useEffect(() => {
    if (!loading) setDraft(serverVisibility);
  }, [serverVisibility, loading]);

  if (userData?.role !== 'admin') return null;

  const isLocked = (feature: string, role: RoleKey): boolean =>
    LOCKED[feature]?.[role] === true;

  const isAdminColumn = (role: RoleKey): boolean => role === 'admin';

  const toggle = (feature: string, role: RoleKey) => {
    if (isLocked(feature, role) || isAdminColumn(role)) return;
    setDraft((prev) => ({
      ...prev,
      [feature]: {
        ...(prev[feature] ?? DEFAULT_VISIBILITY[feature]),
        [role]: !(prev[feature]?.[role] ?? DEFAULT_VISIBILITY[feature][role]),
      },
    }));
  };

  const isDirty = JSON.stringify(draft) !== JSON.stringify(serverVisibility);

  const handleSave = async () => {
    if (!user || !isDirty) return;
    try {
      setSaving(true);
      await saveRolePermissions(draft, user.uid);
      toast.success(e.saveSuccess);
    } catch {
      toast.error(e.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraft(serverVisibility);
  };

  const featureLabel = (key: string): string =>
    (p as unknown as Record<string, string>)[key] ?? key;

  const roleLabel = (role: RoleKey): string => {
    switch (role) {
      case 'admin':
        return p.colAdmin;
      case 'subAdmin':
        return p.colSubAdmin;
      case 'technician':
        return p.colTechnician;
      case 'customer':
        return p.colCustomer;
    }
  };

  return (
    <div className="sc-card-static">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Sliders size={24} color="var(--brand)" />
          <h2 className="sc-h2" style={{ margin: 0 }}>{e.title}</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleReset}
            disabled={!isDirty || saving}
            className="sc-cta-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <RotateCcw size={16} />
            {e.reset}
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="sc-cta"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Save size={16} />
            {saving ? e.saving : e.save}
          </button>
        </div>
      </div>
      <p className="sc-helper" style={{ marginBottom: 24 }}>{e.subtitle}</p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
              <th style={{ ...headerStyle, textAlign: 'left' }}>{p.colFeature}</th>
              {ROLES.map((role) => (
                <th key={role} style={{ ...headerStyle, textAlign: 'center' }}>
                  {roleLabel(role)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((feature, idx) => {
              const isLast = idx === FEATURES.length - 1;
              return (
                <tr key={feature} style={{ borderBottom: isLast ? 'none' : '1px solid var(--hairline)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                    {featureLabel(feature)}
                  </td>
                  {ROLES.map((role) => {
                    const locked = isLocked(feature, role);
                    const adminCol = isAdminColumn(role);
                    const checked = locked
                      ? false
                      : adminCol
                      ? true
                      : draft[feature]?.[role] ?? DEFAULT_VISIBILITY[feature][role];
                    return (
                      <td key={role} style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <label
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: locked || adminCol ? 'not-allowed' : 'pointer',
                          }}
                          title={
                            locked
                              ? e.lockedTooltip
                              : adminCol
                              ? e.adminLockedTooltip
                              : undefined
                          }
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={locked || adminCol || saving || loading}
                            onChange={() => toggle(feature, role)}
                            style={{
                              width: 20,
                              height: 20,
                              accentColor: 'var(--brand)',
                              opacity: locked || adminCol ? 0.5 : 1,
                            }}
                          />
                          {locked && (
                            <Lock size={14} color="var(--soft)" style={{ marginLeft: 6 }} />
                          )}
                        </label>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--hairline)', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: 'var(--soft)' }}>
        <p style={{ margin: 0 }}>{e.helpVisible}</p>
        <p style={{ margin: 0 }}>{e.helpHidden}</p>
        <p style={{ margin: 0 }}>{e.helpLocked}</p>
        <p style={{ margin: 0 }}>{e.helpRules}</p>
      </div>
    </div>
  );
}
