'use client';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type QuotaSlot = { used: number; limit: number };

type Stats = {
  config: { hunterOk: boolean; snovOk: boolean };
  quota: { hunter: QuotaSlot; snov: QuotaSlot; remaining: number };
  leads: { total: number; newThisWeek: number; byStatus: Record<string, number> };
  recentRuns: {
    leadGenerator: Array<{
      started_at: string;
      status: string;
      results?: { saved?: number };
      error_message?: string | null;
    }>;
    emailOutreach: Array<{
      started_at: string;
      status: string;
      results?: { sent?: number };
    }>;
  };
  generatedAt: string;
};

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}
    >
      {label}
    </span>
  );
}

function QuotaBar({ used, limit, name }: QuotaSlot & { name: string }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const exhausted = used >= limit;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium text-slate-700">{name}</span>
        <span className={exhausted ? 'text-red-600 font-medium' : 'text-slate-500'}>
          {used} / {limit}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200">
        <div
          className={`h-2 rounded-full ${exhausted ? 'bg-red-500' : 'bg-orange-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function AdminLeadsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  const loadStats = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/leads-stats');
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load stats');
        setStats(null);
        return;
      }
      setStats(data.stats);
    } catch {
      setError('Failed to load stats');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login?redirect=/admin/leads');
      return;
    }
    if (user) loadStats();
  }, [user, loading, router, loadStats]);

  if (loading || (fetching && !stats && !error)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading lead gen dashboard…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Lead Gen Ops</h1>
            <p className="text-sm text-slate-500">Pipeline health &amp; quota usage</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={loadStats}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Refresh
            </button>
            <Link href="/" className="text-sm text-orange-600 hover:underline">
              ← Home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            {error}
          </div>
        )}

        {stats && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Total leads</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{stats.leads.total}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">New (7 days)</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{stats.leads.newThisWeek}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Lookups remaining</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{stats.quota.remaining}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-slate-900">Email finder config</h2>
              <div className="flex flex-wrap gap-2">
                <StatusBadge ok={stats.config.hunterOk} label="Hunter API" />
                <StatusBadge ok={stats.config.snovOk} label="Snov API" />
              </div>
              {!stats.config.snovOk && (
                <p className="mt-3 text-sm text-amber-700">
                  Snov is not configured — you are capped at ~25 new leads/month via Hunter only.
                  Add <code className="rounded bg-amber-50 px-1">SNOV_CLIENT_ID</code> and{' '}
                  <code className="rounded bg-amber-50 px-1">SNOV_CLIENT_SECRET</code> to GitHub
                  secrets and Vercel.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-slate-900">Monthly quota <span className="text-sm font-normal text-slate-400">(225 total available)</span></h2>
              <div className="space-y-4">
                <QuotaBar name="Skrapp (150/mo)" {...stats.quota.skrapp} />
                <QuotaBar name="Snov (50/mo)" {...stats.quota.snov} />
                <QuotaBar name="Hunter (25/mo)" {...stats.quota.hunter} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-slate-900">Leads by status</h2>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Object.entries(stats.leads.byStatus).map(([status, count]) => (
                  <div key={status} className="rounded-lg bg-slate-50 px-3 py-2">
                    <dt className="text-xs uppercase tracking-wide text-slate-500">{status}</dt>
                    <dd className="text-lg font-semibold text-slate-900">{count}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-slate-900">Recent lead-generator runs</h2>
              {stats.recentRuns.leadGenerator.length === 0 ? (
                <p className="text-sm text-slate-500">No runs logged yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="pb-2 pr-4 font-medium">Started</th>
                        <th className="pb-2 pr-4 font-medium">Status</th>
                        <th className="pb-2 pr-4 font-medium">Saved</th>
                        <th className="pb-2 font-medium">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentRuns.leadGenerator.map((run) => (
                        <tr key={run.started_at} className="border-b border-slate-100">
                          <td className="py-2 pr-4 text-slate-700">
                            {new Date(run.started_at).toLocaleString()}
                          </td>
                          <td className="py-2 pr-4">{run.status}</td>
                          <td className="py-2 pr-4 font-medium">
                            {run.results?.saved ?? '—'}
                          </td>
                          <td className="py-2 text-red-600">{run.error_message || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400">
              Last updated: {new Date(stats.generatedAt).toLocaleString()}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
