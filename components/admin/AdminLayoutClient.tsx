'use client';

import Sidebar from '@/components/admin/Sidebar';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={['admin', 'sub-admin']}>
      <div className="sc" style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <main className="lg:ml-64" style={{ flex: 1, padding: 32 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
