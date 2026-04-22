import type { Metadata } from 'next';
import TechnicianLayoutClient from '@/components/technician/TechnicianLayoutClient';

export const metadata: Metadata = {
  title: 'Technician Portal | Selvacore',
  description: 'View available jobs, manage installations, and track earnings',
};

export default function TechnicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TechnicianLayoutClient>{children}</TechnicianLayoutClient>;
}
