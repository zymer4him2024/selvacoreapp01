import type { Metadata } from 'next';
import SubAdminLayoutClient from '@/components/sub-admin/SubAdminLayoutClient';

export const metadata: Metadata = {
  title: 'Sub-Admin Portal | Selvacore',
  description: 'Manage your technicians and orders',
};

export default function SubAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SubAdminLayoutClient>{children}</SubAdminLayoutClient>;
}
