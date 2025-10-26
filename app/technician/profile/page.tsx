'use client';

import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Phone, Star, Award, Briefcase, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getTechnicianStats, TechnicianStats } from '@/lib/services/technicianService';
import { formatCurrency } from '@/lib/utils/formatters';
import toast from 'react-hot-toast';

export default function TechnicianProfilePage() {
  const { user, userData } = useAuth();
  const [stats, setStats] = useState<TechnicianStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const techStats = await getTechnicianStats(user.uid);
      setStats(techStats);
    } catch (error: any) {
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">My Profile</h1>
        <p className="text-text-secondary mt-2">Manage your technician information</p>
      </div>

      {/* Profile Card */}
      <div className="apple-card">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Profile Photo */}
          <div className="flex-shrink-0">
            <div className="w-32 h-32 bg-surface-elevated rounded-apple overflow-hidden">
              {userData?.photoURL ? (
                <img
                  src={userData.photoURL}
                  alt={userData.displayName || 'Profile'}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <User className="w-16 h-16 text-primary" />
                </div>
              )}
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-2xl font-bold">{userData?.displayName || 'Technician'}</h2>
              <p className="text-text-secondary">Professional Installer</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-text-secondary">Email</p>
                  <p className="font-medium">{userData?.email || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-text-secondary">Phone</p>
                  <p className="font-medium">{userData?.phone || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Star className="w-5 h-5 text-warning" />
                <div>
                  <p className="text-sm text-text-secondary">Rating</p>
                  <p className="font-medium">{stats?.averageRating.toFixed(1) || '0.0'} / 5.0</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-success" />
                <div>
                  <p className="text-sm text-text-secondary">Completion Rate</p>
                  <p className="font-medium">{stats?.completionRate || 0}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Performance Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="apple-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-apple flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalJobs || 0}</p>
                <p className="text-sm text-text-secondary">Total Jobs</p>
              </div>
            </div>
          </div>

          <div className="apple-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-success/10 rounded-apple flex items-center justify-center">
                <Award className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.completedJobs || 0}</p>
                <p className="text-sm text-text-secondary">Completed</p>
              </div>
            </div>
          </div>

          <div className="apple-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-warning/10 rounded-apple flex items-center justify-center">
                <Star className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.averageRating.toFixed(1) || '0.0'}</p>
                <p className="text-sm text-text-secondary">Avg Rating</p>
              </div>
            </div>
          </div>

          <div className="apple-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-apple flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats?.totalEarnings || 0, 'BRL')}</p>
                <p className="text-sm text-text-secondary">Total Earnings</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Status */}
      <div className="apple-card">
        <h3 className="text-lg font-semibold mb-4">Current Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-primary/10 rounded-apple">
            <p className="text-sm text-text-secondary mb-1">Upcoming Jobs</p>
            <p className="text-2xl font-bold text-primary">{stats?.upcomingJobs || 0}</p>
          </div>

          <div className="p-4 bg-warning/10 rounded-apple">
            <p className="text-sm text-text-secondary mb-1">In Progress</p>
            <p className="text-2xl font-bold text-warning">{stats?.inProgressJobs || 0}</p>
          </div>

          <div className="p-4 bg-success/10 rounded-apple">
            <p className="text-sm text-text-secondary mb-1">Completion Rate</p>
            <p className="text-2xl font-bold text-success">{stats?.completionRate || 0}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

