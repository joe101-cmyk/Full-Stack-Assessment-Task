'use client';

import { ClockCounterClockwiseIcon } from '@phosphor-icons/react/dist/ssr';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';
import { useState } from 'react';
import { useTaskActivity } from '../hooks';

export function TaskActivityTimeline({ taskId }: { taskId: string }) {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error } = useTaskActivity(taskId, page);

  return (
    <section className="space-y-4" aria-labelledby="activity-heading">
      <h2 id="activity-heading" className="text-sm font-semibold text-foreground">Activity History</h2>
      {isPending ? (
        <div className="space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
      ) : isError ? (
        <p className="rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-[13px] text-danger">{error.message}</p>
      ) : data.items.length === 0 ? (
        <EmptyState icon={ClockCounterClockwiseIcon} title="No activity yet." />
      ) : (
        <>
          <ol className="space-y-4">
            {data.items.map((activity) => {
              const actor = activity.actor?.name ?? 'Unknown user';
              const from = activity.fromAssignee?.name;
              const to = activity.toAssignee?.name;
              const description = !from && to
                ? `${actor} assigned this task to ${to}.`
                : from && !to
                  ? `${actor} unassigned this task.`
                  : `${actor} changed the assignee from ${from ?? 'Unassigned'} to ${to ?? 'Unassigned'}.`;
              return (
                <li key={activity.id} className="flex gap-3">
                  <Avatar user={activity.actor ?? { name: 'Unknown user', avatarUrl: null }} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-5 text-foreground">{description}</p>
                    <time dateTime={activity.createdAt} className="text-[12px] text-subtle-foreground">{formatDateTime(activity.createdAt)}</time>
                  </div>
                </li>
              );
            })}
          </ol>
          {data.total > data.pageSize ? (
            <nav className="flex items-center justify-between" aria-label="Activity pages">
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
              <span className="text-[12px] text-muted-foreground">Page {data.page}</span>
              <Button variant="secondary" size="sm" disabled={page * data.pageSize >= data.total} onClick={() => setPage((current) => current + 1)}>Next</Button>
            </nav>
          ) : null}
        </>
      )}
    </section>
  );
}