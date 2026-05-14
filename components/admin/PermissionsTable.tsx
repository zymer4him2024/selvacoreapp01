'use client';

import { ShieldCheck } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

type Level =
  | 'full'
  | 'readOnly'
  | 'ownOnly'
  | 'limited'
  | 'readSelf'
  | 'createOnly'
  | 'none';

interface Row {
  feature: string;
  admin: Level;
  subAdmin: Level;
  technician: Level;
  customer: Level;
}

const ROWS: Row[] = [
  { feature: 'featureOrders',         admin: 'full', subAdmin: 'full',     technician: 'limited',    customer: 'ownOnly' },
  { feature: 'featureProducts',       admin: 'full', subAdmin: 'readOnly', technician: 'readOnly',   customer: 'readOnly' },
  { feature: 'featureServices',       admin: 'full', subAdmin: 'readOnly', technician: 'readOnly',   customer: 'readOnly' },
  { feature: 'featureUsers',          admin: 'full', subAdmin: 'limited',  technician: 'readSelf',   customer: 'readSelf' },
  { feature: 'featureSubContractors', admin: 'full', subAdmin: 'readOnly', technician: 'none',       customer: 'none' },
  { feature: 'featureDevices',        admin: 'full', subAdmin: 'full',     technician: 'limited',    customer: 'ownOnly' },
  { feature: 'featureMaintenance',    admin: 'full', subAdmin: 'full',     technician: 'limited',    customer: 'readOnly' },
  { feature: 'featureReviews',        admin: 'full', subAdmin: 'full',     technician: 'readSelf',   customer: 'ownOnly' },
  { feature: 'featureInventory',      admin: 'full', subAdmin: 'none',     technician: 'none',       customer: 'none' },
  { feature: 'featureNotifications',  admin: 'full', subAdmin: 'full',     technician: 'none',       customer: 'ownOnly' },
  { feature: 'featureTransactions',   admin: 'full', subAdmin: 'none',     technician: 'createOnly', customer: 'none' },
];

const cellColor = (level: Level): { color: string; fontWeight: number } => {
  switch (level) {
    case 'full':
      return { color: 'var(--brand)', fontWeight: 600 };
    case 'none':
      return { color: 'var(--soft)', fontWeight: 400 };
    default:
      return { color: 'var(--ink)', fontWeight: 400 };
  }
};

const headerStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 16px',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--soft)',
};

export default function PermissionsTable() {
  const { t } = useTranslation();
  const p = t.admin.settings.permissions;

  const featureLabel = (key: string): string =>
    (p as unknown as Record<string, string>)[key] ?? key;

  const levelLabel = (level: Level): string => {
    const map: Record<Level, string> = {
      full: p.levelFull,
      readOnly: p.levelReadOnly,
      ownOnly: p.levelOwnOnly,
      limited: p.levelLimited,
      readSelf: p.levelReadSelf,
      createOnly: p.levelCreateOnly,
      none: p.levelNone,
    };
    return map[level];
  };

  return (
    <div className="sc-card-static">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <ShieldCheck size={24} color="var(--brand)" />
        <h2 className="sc-h2" style={{ margin: 0 }}>{p.title}</h2>
      </div>
      <p className="sc-helper" style={{ marginBottom: 24 }}>{p.subtitle}</p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
              <th style={headerStyle}>{p.colFeature}</th>
              <th style={headerStyle}>{p.colAdmin}</th>
              <th style={headerStyle}>{p.colSubAdmin}</th>
              <th style={headerStyle}>{p.colTechnician}</th>
              <th style={headerStyle}>{p.colCustomer}</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, idx) => {
              const isLast = idx === ROWS.length - 1;
              return (
                <tr key={row.feature} style={{ borderBottom: isLast ? 'none' : '1px solid var(--hairline)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                    {featureLabel(row.feature)}
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', ...cellColor(row.admin) }}>
                    {levelLabel(row.admin)}
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', ...cellColor(row.subAdmin) }}>
                    {levelLabel(row.subAdmin)}
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', ...cellColor(row.technician) }}>
                    {levelLabel(row.technician)}
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', ...cellColor(row.customer) }}>
                    {levelLabel(row.customer)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--hairline)' }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginTop: 0, marginBottom: 12, color: 'var(--ink)' }}>{p.legendTitle}</h3>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--soft)' }}>
          <li>{p.legendFull}</li>
          <li>{p.legendReadOnly}</li>
          <li>{p.legendOwnOnly}</li>
          <li>{p.legendLimited}</li>
          <li>{p.legendReadSelf}</li>
          <li>{p.legendCreateOnly}</li>
          <li>{p.legendNone}</li>
        </ul>
      </div>
    </div>
  );
}
