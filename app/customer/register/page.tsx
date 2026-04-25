'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, X } from 'lucide-react';
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
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-surface-elevated rounded-apple transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">{rs.welcome}</h1>
            <p className="text-text-secondary mt-1">
              {rs.subtitle}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Information */}
          <div className="apple-card">
            <h2 className="text-2xl font-semibold mb-6">{rs.contactInformation}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t.common.name}
                </label>
                <input
                  type="text"
                  value={userData?.displayName || ''}
                  disabled
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple opacity-50"
                />
                <p className="text-xs text-text-tertiary mt-1">{rs.fromGoogleAccount}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t.common.email}
                </label>
                <input
                  type="email"
                  value={userData?.email || ''}
                  disabled
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple opacity-50"
                />
                <p className="text-xs text-text-tertiary mt-1">{rs.fromGoogleAccount}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t.customer.profileScreen.phoneNumber} <span className="text-error">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t.customer.profileScreen.phoneNumberPlaceholder}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {rs.whatsappOptional}
                </label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder={t.customer.profileScreen.phoneNumberPlaceholder}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                />
                <p className="text-xs text-text-tertiary mt-1">
                  {rs.whatsappHint}
                </p>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="apple-card">
            <h2 className="text-2xl font-semibold mb-6">{rs.installationAddress}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">{rs.addressType}</label>
                <div className="flex gap-3">
                  {(['home', 'office', 'other'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAddressLabel(type)}
                      className={`flex-1 px-4 py-3 rounded-apple font-medium transition-all ${
                        addressLabel === type
                          ? 'bg-primary text-white'
                          : 'bg-surface-elevated hover:bg-surface-secondary'
                      }`}
                    >
                      {t.orders[type]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {rs.streetAddress} <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder={rs.streetAddressPlaceholder}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t.orders.city} <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={rs.cityPlaceholder}
                    className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {rs.stateProvince}
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder={rs.statePlaceholder}
                    className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {rs.postalCode}
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder={rs.postalCodePlaceholder}
                    className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t.orders.country}
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder={rs.countryPlaceholder}
                    className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {rs.landmarkOptional}
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder={rs.landmarkPlaceholder}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                />
                <p className="text-xs text-text-tertiary mt-1">
                  {rs.landmarkHint}
                </p>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-8 py-4 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-apple transition-all hover:scale-[1.02] shadow-apple"
          >
            {loading ? rs.creatingProfile : rs.continueToProducts}
          </button>
        </form>
      </div>
    </div>
  );
}

