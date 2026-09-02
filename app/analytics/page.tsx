import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import AnalyticsClient from './AnalyticsClient';

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return <AnalyticsClient />;
}
