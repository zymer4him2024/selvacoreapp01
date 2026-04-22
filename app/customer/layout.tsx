import type { Metadata } from 'next';
import CustomerLayoutClient from '@/components/customer/CustomerLayoutClient';

export const metadata: Metadata = {
  title: 'Customer Portal | Selvacore',
  description: 'Browse products, place orders, and track installations',
};

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerLayoutClient>{children}</CustomerLayoutClient>;
}
