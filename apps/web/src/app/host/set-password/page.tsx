import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import SetPasswordForm from '@/components/SetPasswordForm';

export const metadata: Metadata = { title: 'Set your password — Wedding Carnival' };

export default async function HostSetPassword() {
  const user = await getSessionUser();
  if (!user) redirect('/host/login');

  const mandatory = Boolean(user.user_metadata?.must_change_password);
  return <SetPasswordForm mandatory={mandatory} />;
}
