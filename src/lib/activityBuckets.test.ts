import { buildDailyBuckets, totalInBuckets } from './activityBuckets';
import type { DashboardEvent } from '@/types/categories';

const NOW = new Date(2026, 10, 3, 15, 0);
const ev = (type: string, d: Date): DashboardEvent => ({
  id: `${type}-${d.getTime()}`,
  event_type: type,
  title: 't',
  metadata: {},
  created_at: d.toISOString(),
});

describe('buildDailyBuckets', () => {
  it('makes seven daily buckets ending today', () => {
    const buckets = buildDailyBuckets([], NOW);
    expect(buckets).toHaveLength(7);
    expect(buckets[6].label).toBe('Today');
    expect(buckets[5].label).toBe('Mon 2');
    expect(buckets[0].label).toBe('Wed 28');
  });

  it('counts events per service and ignores events outside the window', () => {
    const buckets = buildDailyBuckets(
      [
        ev('github.push', new Date(2026, 10, 3, 1)),
        ev('vercel.deploy', new Date(2026, 10, 3, 14)),
        ev('railway.deploy', new Date(2026, 10, 1, 9)),
        ev('error.ci', new Date(2026, 10, 1, 10)),
        ev('github.push', new Date(2026, 9, 20)),
      ],
      NOW
    );
    expect(buckets[6]).toMatchObject({ github: 1, vercel: 1, total: 2 });
    expect(buckets[4]).toMatchObject({ railway: 1, other: 1, total: 2 });
    expect(totalInBuckets(buckets)).toBe(4);
  });

  it('reports zero when the window is empty, which hides the graph', () => {
    const old = buildDailyBuckets([ev('github.push', new Date(2026, 8, 1))], NOW);
    expect(totalInBuckets(old)).toBe(0);
  });
});
