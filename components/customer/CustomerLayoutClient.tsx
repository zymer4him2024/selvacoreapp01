'use client';

import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function CustomerLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={['customer']}>
      {children}
    </ProtectedRoute>
  );
}
