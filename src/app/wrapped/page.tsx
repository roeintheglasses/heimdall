import { redirect } from 'next/navigation';
import { formatMonthKey } from '@/lib/months';

// Resolved on every request so the link never points at a stale month.
export const dynamic = 'force-dynamic';

export default function WrappedIndexPage() {
  const now = new Date();
  redirect(`/wrapped/${formatMonthKey(now.getUTCFullYear(), now.getUTCMonth() + 1)}`);
}
