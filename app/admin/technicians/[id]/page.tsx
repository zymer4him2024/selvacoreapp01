'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Mail, Phone, MessageCircle, MapPin, Award,
  Calendar, DollarSign, TrendingUp, CheckCircle, XCircle,
  Pause, Play, Edit, Save, X
} from 'lucide-react';
import {
  getTechnicianById,
  approveTechnician,
  declineTechnician,
  suspendTechnician,
  reactivateTechnician,
  updateTechnicianProfile,
  TechnicianWithStats
} from '@/lib/services/technicianAdminService';
import { 
  formatCurrency, 
  formatDate, 
  formatOptionalCurrency,
  formatOptionalDate,
  formatOptionalNumber,
  formatOptionalString
} from '@/lib/utils/formatters';
import toast from 'react-hot-toast';

export default function TechnicianDetailPage() {
  const router = useRouter();
  const params = useParams();
  const technicianId = params?.id as string;

  const [technician, setTechnician] = useState<TechnicianWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    serviceAreas: [] as string[],
    certifications: [] as string[],
    bio: '',
    adminNotes: '',
  });
  const [newArea, setNewArea] = useState('');
  const [newCert, setNewCert] = useState('');

  useEffect(() => {
    if (technicianId) {
      loadTechnician();
    }
  }, [technicianId]);

  const loadTechnician = async () => {
    try {
      setLoading(true);
      const data = await getTechnicianById(technicianId);
      setTechnician(data);
      
      if (data) {
        setEditedData({
          serviceAreas: data.serviceAreas || [],
          certifications: data.certifications || [],
          bio: data.bio || '',
          adminNotes: data.adminNotes || '',
        });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load technician');
      router.push('/admin/technicians');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this technician?')) return;
    
    setActionLoading(true);
    try {
      await approveTechnician(technicianId, editedData.adminNotes);
      toast.success('Technician approved successfully');
      loadTechnician();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve technician');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    const reason = prompt('Please provide a reason for declining:');
    if (!reason) return;
    
    setActionLoading(true);
    try {
      await declineTechnician(technicianId, reason);
      toast.success('Technician application declined');
      loadTechnician();
    } catch (error: any) {
      toast.error(error.message || 'Failed to decline technician');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    const reason = prompt('Please provide a reason for suspension:');
    if (!reason) return;
    
    setActionLoading(true);
    try {
      await suspendTechnician(technicianId, reason);
      toast.success('Technician suspended');
      loadTechnician();
    } catch (error: any) {
      toast.error(error.message || 'Failed to suspend technician');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!confirm('Are you sure you want to reactivate this technician?')) return;
    
    setActionLoading(true);
    try {
      await reactivateTechnician(technicianId);
      toast.success('Technician reactivated');
      loadTechnician();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reactivate technician');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    setActionLoading(true);
    try {
      await updateTechnicianProfile(technicianId, {
        serviceAreas: editedData.serviceAreas,
        certifications: editedData.certifications,
        bio: editedData.bio,
        adminNotes: editedData.adminNotes,
      });
      toast.success('Technician profile updated');
      setIsEditing(false);
      loadTechnician();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setActionLoading(false);
    }
  };

  const addServiceArea = () => {
    if (newArea.trim()) {
      setEditedData(prev => ({
        ...prev,
        serviceAreas: [...prev.serviceAreas, newArea.trim()]
      }));
      setNewArea('');
    }
  };

  const removeServiceArea = (index: number) => {
    setEditedData(prev => ({
      ...prev,
      serviceAreas: prev.serviceAreas.filter((_, i) => i !== index)
    }));
  };

  const addCertification = () => {
    if (newCert.trim()) {
      setEditedData(prev => ({
        ...prev,
        certifications: [...prev.certifications, newCert.trim()]
      }));
      setNewCert('');
    }
  };

  const removeCertification = (index: number) => {
    setEditedData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  };

  const getStatusColor = () => {
    switch (technician?.technicianStatus) {
      case 'approved': return 'bg-success/10 text-success';
      case 'pending': return 'bg-warning/10 text-warning';
      case 'declined': return 'bg-error/10 text-error';
      case 'suspended': return 'bg-text-tertiary/10 text-text-tertiary';
      default: return 'bg-surface-elevated text-text-secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">Loading technician details...</p>
        </div>
      </div>
    );
  }

  if (!technician) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Technician not found</h2>
        <button
          onClick={() => router.push('/admin/technicians')}
          className="apple-button-primary"
        >
          Back to Technicians
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/admin/technicians')}
          className="p-2 hover:bg-surface-elevated rounded-apple transition-all"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Technician Details</h1>
          <p className="text-text-secondary">View and manage technician profile</p>
        </div>
        <button
          onClick={() => {
            if (isEditing) {
              setIsEditing(false);
              setEditedData({
                serviceAreas: technician.serviceAreas || [],
                certifications: technician.certifications || [],
                bio: technician.bio || '',
                adminNotes: technician.adminNotes || '',
              });
            } else {
              setIsEditing(true);
            }
          }}
          className="apple-button-secondary flex items-center gap-2"
        >
          {isEditing ? <X className="w-5 h-5" /> : <Edit className="w-5 h-5" />}
          {isEditing ? 'Cancel' : 'Edit'}
        </button>
        {isEditing && (
          <button
            onClick={handleSaveEdit}
            disabled={actionLoading}
            className="apple-button-primary flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            Save Changes
          </button>
        )}
      </div>

      {/* Profile Card */}
      <div className="apple-card">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Profile Photo */}
          <div className="w-32 h-32 bg-surface-elevated rounded-apple overflow-hidden flex-shrink-0">
            {technician.photoURL ? (
              <img
                src={technician.photoURL}
                alt={technician.displayName}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10">
                <Mail className="w-16 h-16 text-primary" />
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="flex-1 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">{formatOptionalString(technician.displayName)}</h2>
                <p className="text-text-secondary">{formatOptionalString(technician.email)}</p>
              </div>
              <div className={`px-4 py-2 rounded-apple text-sm font-semibold ${getStatusColor()}`}>
                {technician.technicianStatus?.toUpperCase() || 'N/A'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-text-tertiary" />
                <span>{formatOptionalString(technician.phone)}</span>
              </div>
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-text-tertiary" />
                <span>{formatOptionalString(technician.whatsapp || technician.phone)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-text-tertiary" />
                <span>Applied: {formatOptionalDate(technician.applicationDate, 'short')}</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-success" />
                <span>Approved: {formatOptionalDate(technician.approvedDate, 'short')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="apple-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-apple flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatOptionalNumber(technician.totalJobs)}</p>
              <p className="text-sm text-text-secondary">Total Jobs</p>
            </div>
          </div>
        </div>

        <div className="apple-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-success/10 rounded-apple flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatOptionalNumber(technician.completedJobs)}</p>
              <p className="text-sm text-text-secondary">Completed</p>
            </div>
          </div>
        </div>

        <div className="apple-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-warning/10 rounded-apple flex items-center justify-center">
              <Award className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{technician.averageRating ? `${technician.averageRating.toFixed(1)}★` : 'N/A'}</p>
              <p className="text-sm text-text-secondary">Avg Rating</p>
            </div>
          </div>
        </div>

        <div className="apple-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-success/10 rounded-apple flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatOptionalCurrency(technician.totalEarnings, 'BRL')}</p>
              <p className="text-sm text-text-secondary">Total Earnings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Service Areas */}
      <div className="apple-card">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Service Areas
        </h3>
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add service area..."
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addServiceArea()}
                className="flex-1 px-4 py-2 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none"
              />
              <button
                onClick={addServiceArea}
                className="apple-button-primary"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {editedData.serviceAreas.map((area, index) => (
                <div
                  key={index}
                  className="px-3 py-1 bg-primary/10 text-primary rounded-apple flex items-center gap-2"
                >
                  <span>{area}</span>
                  <button
                    onClick={() => removeServiceArea(index)}
                    className="hover:text-error"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {technician.serviceAreas && technician.serviceAreas.length > 0 ? (
              technician.serviceAreas.map((area, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-primary/10 text-primary rounded-apple"
                >
                  {area}
                </span>
              ))
            ) : (
              <p className="text-text-secondary">No service areas specified</p>
            )}
          </div>
        )}
      </div>

      {/* Certifications */}
      <div className="apple-card">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-warning" />
          Certifications
        </h3>
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add certification..."
                value={newCert}
                onChange={(e) => setNewCert(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCertification()}
                className="flex-1 px-4 py-2 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none"
              />
              <button
                onClick={addCertification}
                className="apple-button-primary"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {editedData.certifications.map((cert, index) => (
                <div
                  key={index}
                  className="px-3 py-1 bg-warning/10 text-warning rounded-apple flex items-center gap-2"
                >
                  <span>{cert}</span>
                  <button
                    onClick={() => removeCertification(index)}
                    className="hover:text-error"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {technician.certifications && technician.certifications.length > 0 ? (
              technician.certifications.map((cert, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-warning/10 text-warning rounded-apple"
                >
                  {cert}
                </span>
              ))
            ) : (
              <p className="text-text-secondary">No certifications specified</p>
            )}
          </div>
        )}
      </div>

      {/* Bio */}
      <div className="apple-card">
        <h3 className="text-xl font-semibold mb-4">Professional Bio</h3>
        {isEditing ? (
          <textarea
            value={editedData.bio}
            onChange={(e) => setEditedData(prev => ({ ...prev, bio: e.target.value }))}
            placeholder="Enter bio..."
            rows={4}
            className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none"
          />
        ) : (
          <p className="text-text-secondary">
            {technician.bio || 'No bio provided'}
          </p>
        )}
      </div>

      {/* Admin Notes */}
      <div className="apple-card">
        <h3 className="text-xl font-semibold mb-4">Admin Notes</h3>
        {isEditing ? (
          <textarea
            value={editedData.adminNotes}
            onChange={(e) => setEditedData(prev => ({ ...prev, adminNotes: e.target.value }))}
            placeholder="Enter admin notes..."
            rows={3}
            className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none"
          />
        ) : (
          <p className="text-text-secondary">
            {technician.adminNotes || 'No notes'}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="apple-card">
        <h3 className="text-xl font-semibold mb-4">Actions</h3>
        <div className="flex flex-wrap gap-3">
          {technician.technicianStatus === 'pending' && (
            <>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex items-center gap-2 px-6 py-3 bg-success hover:bg-success/90 text-white font-semibold rounded-apple transition-all disabled:opacity-50"
              >
                <CheckCircle className="w-5 h-5" />
                Approve Technician
              </button>
              <button
                onClick={handleDecline}
                disabled={actionLoading}
                className="flex items-center gap-2 px-6 py-3 bg-error hover:bg-error/90 text-white font-semibold rounded-apple transition-all disabled:opacity-50"
              >
                <XCircle className="w-5 h-5" />
                Decline Application
              </button>
            </>
          )}

          {technician.technicianStatus === 'approved' && (
            <button
              onClick={handleSuspend}
              disabled={actionLoading}
              className="flex items-center gap-2 px-6 py-3 bg-warning hover:bg-warning/90 text-white font-semibold rounded-apple transition-all disabled:opacity-50"
            >
              <Pause className="w-5 h-5" />
              Suspend Technician
            </button>
          )}

          {(technician.technicianStatus === 'suspended' || technician.technicianStatus === 'declined') && (
            <button
              onClick={handleReactivate}
              disabled={actionLoading}
              className="flex items-center gap-2 px-6 py-3 bg-success hover:bg-success/90 text-white font-semibold rounded-apple transition-all disabled:opacity-50"
            >
              <Play className="w-5 h-5" />
              Reactivate Technician
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

