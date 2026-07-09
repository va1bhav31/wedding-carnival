import type { Metadata } from 'next';
import LoginForm from '@/components/LoginForm';

export const metadata: Metadata = { title: 'Wedding Carnival Admin Panel' };

export default function AdminLogin() {
  return <LoginForm redirectTo="/admin" title="🎪 Admin" subtitle="Wedding Carnival control panel" />;
}
