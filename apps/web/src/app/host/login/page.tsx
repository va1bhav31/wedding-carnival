import type { Metadata } from 'next';
import LoginForm from '@/components/LoginForm';

export const metadata: Metadata = { title: 'Wedding Carnival Host Panel' };

export default function HostLogin() {
  return (
    <LoginForm redirectTo="/host" title="🎪 Host Portal" subtitle="Run your wedding’s Carnival" />
  );
}
