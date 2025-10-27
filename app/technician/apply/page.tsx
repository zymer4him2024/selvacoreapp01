'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  User, Mail, Phone, MessageCircle, MapPin, Award, FileText, 
  CheckCircle, AlertCircle, Plus, X 
} from 'lucide-react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import toast from 'react-hot-toast';

export default function TechnicianApplicationPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    displayName: userData?.displayName || '',
    phone: userData?.phone || '',
    whatsapp: userData?.phone || '',
    bio: '',
    serviceAreas: [] as string[],
    certifications: [] as string[],
  });
  
  const [newArea, setNewArea] = useState('');
  const [newCert, setNewCert] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Full name is required';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    
    if (!formData.whatsapp.trim()) {
      newErrors.whatsapp = 'WhatsApp number is required';
    }
    
    if (!formData.bio.trim() || formData.bio.length < 50) {
      newErrors.bio = 'Bio must be at least 50 characters';
    }
    
    if (formData.serviceAreas.length === 0) {
      newErrors.serviceAreas = 'At least one service area is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addServiceArea = () => {
    if (newArea.trim() && !formData.serviceAreas.includes(newArea.trim())) {
      setFormData(prev => ({
        ...prev,
        serviceAreas: [...prev.serviceAreas, newArea.trim()]
      }));
      setNewArea('');
      setErrors(prev => ({ ...prev, serviceAreas: '' }));
    }
  };

  const removeServiceArea = (index: number) => {
    setFormData(prev => ({
      ...prev,
      serviceAreas: prev.serviceAreas.filter((_, i) => i !== index)
    }));
  };

  const addCertification = () => {
    if (newCert.trim() && !formData.certifications.includes(newCert.trim())) {
      setFormData(prev => ({
        ...prev,
        certifications: [...prev.certifications, newCert.trim()]
      }));
      setNewCert('');
    }
  };

  const removeCertification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (!user) {
      toast.error('You must be logged in to apply');
      return;
    }
    
    setLoading(true);
    
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: formData.displayName,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        bio: formData.bio,
        serviceAreas: formData.serviceAreas,
        certifications: formData.certifications,
        role: 'technician',
        technicianStatus: 'pending',
        applicationDate: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      toast.success('Application submitted successfully! 🎉');
      toast('Your application is under review. We will contact you soon.', {
        icon: '⏳',
        duration: 5000,
      });
      
      // Redirect to technician dashboard
      setTimeout(() => {
        router.push('/technician');
      }, 2000);
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-20 h-20 bg-primary/10 rounded-apple flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Become a Technician</h1>
          <p className="text-text-secondary text-lg">
            Join our team of professional technicians and start earning
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="apple-card text-center">
            <div className="w-12 h-12 bg-success/10 rounded-apple flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <h3 className="font-semibold mb-1">Flexible Schedule</h3>
            <p className="text-sm text-text-secondary">Work on your own time</p>
          </div>
          
          <div className="apple-card text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-apple flex items-center justify-center mx-auto mb-2">
              <Award className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Competitive Pay</h3>
            <p className="text-sm text-text-secondary">Earn more per job</p>
          </div>
          
          <div className="apple-card text-center">
            <div className="w-12 h-12 bg-warning/10 rounded-apple flex items-center justify-center mx-auto mb-2">
              <MapPin className="w-6 h-6 text-warning" />
            </div>
            <h3 className="font-semibold mb-1">Local Jobs</h3>
            <p className="text-sm text-text-secondary">Work in your area</p>
          </div>
        </div>

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="apple-card space-y-6">
          <h2 className="text-2xl font-bold">Application Form</h2>
          
          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Full Name <span className="text-error">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="John Doe"
                className={`w-full pl-12 pr-4 py-3 bg-surface-elevated border rounded-apple focus:outline-none transition-all ${
                  errors.displayName ? 'border-error' : 'border-border focus:border-primary'
                }`}
              />
            </div>
            {errors.displayName && (
              <p className="text-error text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.displayName}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Phone Number <span className="text-error">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+55 11 99999-9999"
                className={`w-full pl-12 pr-4 py-3 bg-surface-elevated border rounded-apple focus:outline-none transition-all ${
                  errors.phone ? 'border-error' : 'border-border focus:border-primary'
                }`}
              />
            </div>
            {errors.phone && (
              <p className="text-error text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.phone}
              </p>
            )}
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              WhatsApp Number <span className="text-error">*</span>
            </label>
            <div className="relative">
              <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
              <input
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                placeholder="+55 11 99999-9999"
                className={`w-full pl-12 pr-4 py-3 bg-surface-elevated border rounded-apple focus:outline-none transition-all ${
                  errors.whatsapp ? 'border-error' : 'border-border focus:border-primary'
                }`}
              />
            </div>
            {errors.whatsapp && (
              <p className="text-error text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.whatsapp}
              </p>
            )}
            <p className="text-sm text-text-secondary mt-1">
              Customers will contact you via WhatsApp
            </p>
          </div>

          {/* Service Areas */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Service Areas <span className="text-error">*</span>
            </label>
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                <input
                  type="text"
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addServiceArea())}
                  placeholder="e.g., São Paulo, Rio de Janeiro"
                  className={`w-full pl-12 pr-4 py-3 bg-surface-elevated border rounded-apple focus:outline-none transition-all ${
                    errors.serviceAreas ? 'border-error' : 'border-border focus:border-primary'
                  }`}
                />
              </div>
              <button
                type="button"
                onClick={addServiceArea}
                className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.serviceAreas.map((area, index) => (
                <div
                  key={index}
                  className="px-3 py-2 bg-primary/10 text-primary rounded-apple flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  <span>{area}</span>
                  <button
                    type="button"
                    onClick={() => removeServiceArea(index)}
                    className="hover:text-error transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {errors.serviceAreas && (
              <p className="text-error text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.serviceAreas}
              </p>
            )}
          </div>

          {/* Certifications (Optional) */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Certifications <span className="text-text-tertiary">(Optional)</span>
            </label>
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Award className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                <input
                  type="text"
                  value={newCert}
                  onChange={(e) => setNewCert(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                  placeholder="e.g., Electrical License, Plumbing Certificate"
                  className="w-full pl-12 pr-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                />
              </div>
              <button
                type="button"
                onClick={addCertification}
                className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.certifications.map((cert, index) => (
                <div
                  key={index}
                  className="px-3 py-2 bg-warning/10 text-warning rounded-apple flex items-center gap-2"
                >
                  <Award className="w-4 h-4" />
                  <span>{cert}</span>
                  <button
                    type="button"
                    onClick={() => removeCertification(index)}
                    className="hover:text-error transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Professional Bio <span className="text-error">*</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-4 top-4 w-5 h-5 text-text-tertiary" />
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about your experience, skills, and why you'd be a great technician... (minimum 50 characters)"
                rows={5}
                className={`w-full pl-12 pr-4 py-3 bg-surface-elevated border rounded-apple focus:outline-none transition-all resize-none ${
                  errors.bio ? 'border-error' : 'border-border focus:border-primary'
                }`}
              />
            </div>
            <div className="flex justify-between items-center mt-1">
              {errors.bio ? (
                <p className="text-error text-sm flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.bio}
                </p>
              ) : (
                <p className="text-text-secondary text-sm">
                  {formData.bio.length} / 50 minimum characters
                </p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-border">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-apple transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Submitting Application...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Submit Application
                </>
              )}
            </button>
            <p className="text-center text-sm text-text-secondary mt-3">
              By submitting, you agree to our terms and conditions
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

