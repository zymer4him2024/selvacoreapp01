'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createSubContractor } from '@/lib/services/subContractorService';
import toast from 'react-hot-toast';

export default function NewSubContractorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [businessLicense, setBusinessLicense] = useState('');
  const [taxId, setTaxId] = useState('');
  const [commission, setCommission] = useState('20');
  const [active, setActive] = useState(true);
  
  // Address
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error('Please fill in all required fields');
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

      toast.success('Sub-contractor created successfully!');
      router.push('/admin/sub-contractors');
    } catch (error: any) {
      console.error('Error creating sub-contractor:', error);
      toast.error(error.message || 'Failed to create sub-contractor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-surface-elevated rounded-apple transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Add New Sub-Contractor</h1>
          <p className="text-text-secondary mt-1">Create a new sub-contractor account</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="apple-card">
          <h2 className="text-2xl font-semibold mb-6">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Business Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter business name"
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Email <span className="text-error">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Phone <span className="text-error">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">WhatsApp</label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Business License</label>
              <input
                type="text"
                value={businessLicense}
                onChange={(e) => setBusinessLicense(e.target.value)}
                placeholder="License number"
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tax ID</label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="Tax ID number"
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Commission Rate (%) <span className="text-error">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                placeholder="20"
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                required
              />
              <p className="text-xs text-text-tertiary mt-1">
                Platform commission on each order
              </p>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer mt-8">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-5 h-5 rounded accent-primary"
                />
                <span className="text-sm font-medium">Active</span>
              </label>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="apple-card">
          <h2 className="text-2xl font-semibold mb-6">Address Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Street Address</label>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="123 Main Street"
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">State/Province</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Postal Code</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="12345"
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country"
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-8 py-4 bg-success hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-apple transition-all hover:scale-[1.02] shadow-apple"
          >
            {loading ? 'Creating Sub-Contractor...' : 'Create Sub-Contractor'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-8 py-4 bg-surface hover:bg-surface-elevated text-white font-semibold rounded-apple transition-all border border-border"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

