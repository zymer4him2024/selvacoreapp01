'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Address } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

export default function CustomerRegistrationPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { t } = useTranslation();
  const rs = t.customer.registerScreen;
  const [loading, setLoading] = useState(false);

  // Customer info
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  // Default address
  const [addressLabel, setAddressLabel] = useState<'home' | 'office' | 'other'>('home');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [landmark, setLandmark] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error(rs.signInFirst);
      router.push('/login');
      return;
    }

    // Validation
    if (!phone.trim() || !street.trim() || !city.trim()) {
      toast.error(rs.fillRequiredFields);
      return;
    }

    try {
      setLoading(true);

      const address: Address = {
        id: uuidv4(),
        label: addressLabel,
        street,
        city,
        state,
        postalCode,
        country,
        landmark,
        isDefault: true,
      };

      // Create customer profile
      await setDoc(doc(db, 'customers', user.uid), {
        userId: user.uid,
        addresses: [address],
        orders: 0,
        totalSpent: 0,
        createdAt: Timestamp.now(),
      });

      // Update user data with phone
      await setDoc(
        doc(db, 'users', user.uid),
        {
          phone,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );

      toast.success(rs.profileCreated);
      router.push('/customer');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : rs.createProfileError;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sc">
      <main className="sc-main" style={{ maxWidth: 720 }}>
        <div className="sc-row" style={{ marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => router.back()}
            className="sc-cta-ghost"
            style={{ padding: 8, width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="sc-eyebrow">{t.customer.welcome}</div>
            <h1 className="sc-h1">{rs.welcome}</h1>
            <p className="sc-lede">{rs.subtitle}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="sc-stack-lg">
          <div className="sc-card-static">
            <h2 className="sc-h2" style={{ marginBottom: 16 }}>{rs.contactInformation}</h2>

            <div className="sc-stack">
              <div>
                <label className="sc-label">{t.common.name}</label>
                <input
                  type="text"
                  value={userData?.displayName || ''}
                  disabled
                  className="sc-input"
                  style={{ opacity: 0.5 }}
                />
                <p className="sc-helper">{rs.fromGoogleAccount}</p>
              </div>

              <div>
                <label className="sc-label">{t.common.email}</label>
                <input
                  type="email"
                  value={userData?.email || ''}
                  disabled
                  className="sc-input"
                  style={{ opacity: 0.5 }}
                />
                <p className="sc-helper">{rs.fromGoogleAccount}</p>
              </div>

              <div>
                <label className="sc-label">
                  {t.customer.profileScreen.phoneNumber} <span style={{ color: 'var(--warn)' }}>*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t.customer.profileScreen.phoneNumberPlaceholder}
                  className="sc-input"
                  required
                />
              </div>

              <div>
                <label className="sc-label">{rs.whatsappOptional}</label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder={t.customer.profileScreen.phoneNumberPlaceholder}
                  className="sc-input"
                />
                <p className="sc-helper">{rs.whatsappHint}</p>
              </div>
            </div>
          </div>

          <div className="sc-card-static">
            <h2 className="sc-h2" style={{ marginBottom: 16 }}>{rs.installationAddress}</h2>

            <div className="sc-stack">
              <div>
                <label className="sc-label">{rs.addressType}</label>
                <div className="sc-row" style={{ gap: 8 }}>
                  {(['home', 'office', 'other'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAddressLabel(type)}
                      className={addressLabel === type ? 'sc-cta' : 'sc-cta-ghost'}
                      style={{ flex: 1 }}
                    >
                      {t.orders[type]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="sc-label">
                  {rs.streetAddress} <span style={{ color: 'var(--warn)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder={rs.streetAddressPlaceholder}
                  className="sc-input"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="sc-label">
                    {t.orders.city} <span style={{ color: 'var(--warn)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={rs.cityPlaceholder}
                    className="sc-input"
                    required
                  />
                </div>

                <div>
                  <label className="sc-label">{rs.stateProvince}</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder={rs.statePlaceholder}
                    className="sc-input"
                  />
                </div>

                <div>
                  <label className="sc-label">{rs.postalCode}</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder={rs.postalCodePlaceholder}
                    className="sc-input"
                  />
                </div>

                <div>
                  <label className="sc-label">{t.orders.country}</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder={rs.countryPlaceholder}
                    className="sc-input"
                  />
                </div>
              </div>

              <div>
                <label className="sc-label">{rs.landmarkOptional}</label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder={rs.landmarkPlaceholder}
                  className="sc-input"
                />
                <p className="sc-helper">{rs.landmarkHint}</p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="sc-cta"
            style={{ width: '100%', padding: '14px 24px', fontSize: 15 }}
          >
            {loading ? rs.creatingProfile : rs.continueToProducts}
          </button>
        </form>
      </main>
    </div>
  );
}

