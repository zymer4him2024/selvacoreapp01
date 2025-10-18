'use client';

import Sidebar from '@/components/admin/Sidebar';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 lg:ml-64 p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

