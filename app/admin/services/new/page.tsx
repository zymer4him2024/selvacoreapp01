'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { MultiLanguageText, Service } from '@/types';
import { createService } from '@/lib/services/serviceService';
import { SUPPORTED_LANGUAGES, SERVICE_CATEGORIES } from '@/lib/utils/constants';
import toast from 'react-hot-toast';

export default function NewServicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState<MultiLanguageText>({ en: '', es: '', fr: '', pt: '', ar: '' });
  const [description, setDescription] = useState<MultiLanguageText>({ en: '', es: '', fr: '', pt: '', ar: '' });
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [duration, setDuration] = useState('');
  const [category, setCategory] = useState('');
  const [includes, setIncludes] = useState<string[]>([]);
  const [includeInput, setIncludeInput] = useState('');
  const [active, setActive] = useState(true);

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

    // Validation
    if (!name.en.trim()) {
      toast.error('Please enter service name in English');
      return;
    }

    if (!category) {
      toast.error('Please select a category');
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    if (!duration || parseInt(duration) <= 0) {
      toast.error('Please enter a valid duration');
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

      toast.success('Service created successfully!');
      router.push('/admin/services');
    } catch (error: any) {
      console.error('Error creating service:', error);
      toast.error(error.message || 'Failed to create service');
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
          <h1 className="text-4xl font-bold tracking-tight">Add New Service</h1>
          <p className="text-text-secondary mt-1">
            Create a new service with multi-language support
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="apple-card">
          <h2 className="text-2xl font-semibold mb-6">Basic Information</h2>

          <div className="space-y-6">
            {/* Service Name (Multi-language) */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Service Name <span className="text-error">*</span>
              </label>
              <div className="space-y-3">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <div key={lang.code} className="flex gap-3">
                    <span className="flex items-center gap-2 w-32 text-sm text-text-secondary">
                      {lang.flag} {lang.name}
                    </span>
                    <input
                      type="text"
                      value={name[lang.code] || ''}
                      onChange={(e) => setName({ ...name, [lang.code]: e.target.value })}
                      placeholder={`Service name in ${lang.name}`}
                      className="flex-1 px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all"
                      required={lang.code === 'en'}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Description (Multi-language) */}
            <div>
              <label className="block text-sm font-medium mb-3">Description</label>
              <div className="space-y-3">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <div key={lang.code} className="flex gap-3">
                    <span className="flex items-center gap-2 w-32 text-sm text-text-secondary">
                      {lang.flag} {lang.name}
                    </span>
                    <textarea
                      value={description[lang.code] || ''}
                      onChange={(e) => setDescription({ ...description, [lang.code]: e.target.value })}
                      placeholder={`Description in ${lang.name}`}
                      rows={3}
                      className="flex-1 px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Category, Price, Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Category <span className="text-error">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                  required
                >
                  <option value="">Select category</option>
                  {SERVICE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Price <span className="text-error">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="BRL">BRL (R$)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Duration (hours) <span className="text-error">*</span>
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="2"
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            {/* What's Included */}
            <div>
              <label className="block text-sm font-medium mb-2">What's Included</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={includeInput}
                  onChange={(e) => setIncludeInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInclude())}
                  placeholder="Add item and press Enter"
                  className="flex-1 px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={addInclude}
                  className="px-4 py-3 bg-surface-elevated hover:bg-surface-secondary rounded-apple transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {includes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {includes.map((item) => (
                    <span
                      key={item}
                      className="flex items-center gap-2 px-3 py-1 bg-secondary/20 text-secondary rounded-full text-sm"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => removeInclude(item)}
                        className="hover:text-error transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Active Toggle */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
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

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-8 py-4 bg-secondary hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-apple transition-all hover:scale-[1.02] shadow-apple"
          >
            {loading ? 'Creating Service...' : 'Create Service'}
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

