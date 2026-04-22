'use client';

import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function CustomerLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={['customer']}>
      <div className="customer-theme">
        {children}
      </div>
    </ProtectedRoute>
  );
}
