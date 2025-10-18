'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Address } from '@/types';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

export default function CustomerRegistrationPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
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
      toast.error('Please sign in first');
      router.push('/login');
      return;
    }

    // Validation
    if (!phone.trim() || !street.trim() || !city.trim()) {
      toast.error('Please fill in all required fields');
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

      toast.success('Profile created successfully!');
      router.push('/customer');
    } catch (error: any) {
      console.error('Error creating customer profile:', error);
      toast.error(error.message || 'Failed to create profile');
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
            <h1 className="text-4xl font-bold tracking-tight">Welcome!</h1>
            <p className="text-text-secondary mt-1">
              Complete your profile to start ordering installation services
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Information */}
          <div className="apple-card">
            <h2 className="text-2xl font-semibold mb-6">Contact Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={userData?.displayName || ''}
                  disabled
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple opacity-50"
                />
                <p className="text-xs text-text-tertiary mt-1">From Google account</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={userData?.email || ''}
                  disabled
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple opacity-50"
                />
                <p className="text-xs text-text-tertiary mt-1">From Google account</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Phone Number <span className="text-error">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  WhatsApp Number (optional)
                </label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                />
                <p className="text-xs text-text-tertiary mt-1">
                  For installer to contact you directly
                </p>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="apple-card">
            <h2 className="text-2xl font-semibold mb-6">Installation Address</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Address Type</label>
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
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Street Address <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="123 Main Street, Apt 4B"
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    City <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    State/Province
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State"
                    className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="12345"
                    className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Country"
                    className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Landmark (optional)
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="Near Central Park, Next to Starbucks"
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                />
                <p className="text-xs text-text-tertiary mt-1">
                  Help installers find your location easily
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
            {loading ? 'Creating Profile...' : 'Continue to Products'}
          </button>
        </form>
      </div>
    </div>
  );
}

