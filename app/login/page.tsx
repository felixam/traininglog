import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import LoginClient from './LoginClient';

export default async function Page() {
  const user = await getCurrentUser();
  if (user) redirect('/');
  return <LoginClient />;
}
