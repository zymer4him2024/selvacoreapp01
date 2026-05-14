'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createSubContractor } from '@/lib/services/subContractorService';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';

export default function NewSubContractorPage() {
  const router = useRouter();
  const { userData } = useAuth();
  const { t } = useTranslation();
  const scn = t.admin.subContractorNew;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userData && userData.role !== 'admin') {
      router.replace('/admin');
    }
  }, [userData, router]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [businessLicense, setBusinessLicense] = useState('');
  const [taxId, setTaxId] = useState('');
  const [commission, setCommission] = useState('20');
  const [active, setActive] = useState(true);

  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error(scn.validationRequired);
      return;
    }

    try {
      setLoading(true);

      await createSubContractor({
        name,
        email,
        phone,
        whatsapp,
        address: {
          street,
          city,
          state,
          postalCode,
          country,
        },
        businessLicense,
        taxId,
        commission: parseFloat(commission),
        active,
      });

      toast.success(scn.created);
      router.push('/admin/sub-contractors');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create sub-contractor';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (userData && userData.role !== 'admin') return null;

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
          <h1 className="sc-h1" style={{ margin: 0 }}>{scn.title}</h1>
          <p className="sc-helper" style={{ margin: '4px 0 0' }}>{scn.subtitle}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="sc-card-static">
          <h2 className="sc-h2" style={{ margin: 0, marginBottom: 24, fontSize: 24 }}>{scn.basicInfo}</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            <div>
              <label className="sc-label">
                {scn.businessName} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={scn.businessNamePlaceholder}
                className="sc-input"
                required
              />
            </div>

            <div>
              <label className="sc-label">
                {scn.email} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={scn.emailPlaceholder}
                className="sc-input"
                required
              />
            </div>

            <div>
              <label className="sc-label">
                {scn.phone} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={scn.phonePlaceholder}
                className="sc-input"
                required
              />
            </div>

            <div>
              <label className="sc-label">{scn.whatsapp}</label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder={scn.phonePlaceholder}
                className="sc-input"
              />
            </div>

            <div>
              <label className="sc-label">{scn.businessLicense}</label>
              <input
                type="text"
                value={businessLicense}
                onChange={(e) => setBusinessLicense(e.target.value)}
                placeholder={scn.licensePlaceholder}
                className="sc-input"
              />
            </div>

            <div>
              <label className="sc-label">{scn.taxId}</label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder={scn.taxIdPlaceholder}
                className="sc-input"
              />
            </div>

            <div>
              <label className="sc-label">
                {scn.commissionRate} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                placeholder="20"
                className="sc-input"
                required
              />
              <p className="sc-helper" style={{ margin: '4px 0 0', fontSize: 12 }}>
                {scn.commissionHelp}
              </p>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginTop: 32 }}>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  style={{ width: 20, height: 20, accentColor: 'var(--brand)' }}
                />
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{scn.active}</span>
              </label>
            </div>
          </div>
        </div>

        <div className="sc-card-static">
          <h2 className="sc-h2" style={{ margin: 0, marginBottom: 24, fontSize: 24 }}>{scn.addressInfo}</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="sc-label">{scn.streetAddress}</label>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder={scn.streetPlaceholder}
                className="sc-input"
              />
            </div>

            <div>
              <label className="sc-label">{scn.city}</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={scn.city}
                className="sc-input"
              />
            </div>

            <div>
              <label className="sc-label">{scn.state}</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder={scn.state}
                className="sc-input"
              />
            </div>

            <div>
              <label className="sc-label">{scn.postalCode}</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="12345"
                className="sc-input"
              />
            </div>

            <div>
              <label className="sc-label">{scn.country}</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder={scn.country}
                className="sc-input"
              />
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
            {loading ? scn.creatingSubContractor : scn.createSubContractor}
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
