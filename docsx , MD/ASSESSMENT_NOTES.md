## Code Review

### Problem

The method does not perform any authorization check. The `userId` parameter is unused, meaning a caller may be able to reassign a task without having permission to do so.

It also only checks that the assignee exists, without validating business rules such as whether the assignee belongs to the same project or is eligible to receive the task.

### Requested Change

Add an authorization check to verify that `userId` is allowed to assign the task, and validate that `assigneeId` satisfies the relevant business rules.

Use appropriate errors such as `ForbiddenException` for unauthorized actions.

### Priority

**Blocking** — this can lead to unauthorized task modifications.

---

## Scaling Question

### Scaling the Activity System

If ProjectFlow grows from around 5,000 users to 500,000 users, activity history can become one of the largest datasets. I would scale it gradually based on actual usage and database performance.

### Database Indexes

The current `{ taskId: 1, createdAt: -1 }` index supports the main activity query and newest-first ordering.

If new query patterns appear, I would add indexes based on real query performance instead of adding unnecessary indexes.

### Cursor vs Offset Pagination

Offset pagination is simple and works well at the current scale.

As the dataset grows, I would move to cursor-based pagination using `createdAt` and `_id`, especially for deep pages, because large offsets become more expensive.

### Query Patterns

Activity queries should only retrieve the required task and page of records.

User references should be loaded in batches to avoid N+1 queries.

### Data Growth and Retention

Activity data will continuously grow, so I would define a retention policy based on product requirements.

Recent activity can stay in the main collection while older data can be archived.

### Archiving

When the activity collection becomes large enough to affect normal queries, older records can be moved to an archive collection or cheaper storage.

This keeps frequently accessed data smaller.

### Asynchronous Processing

Tasks such as archiving, cleanup, or exports do not need to block the API request.

I would move these operations to asynchronous processing so the main API remains fast.

### Background Jobs and Queues

At higher scale, I would use background jobs and a queue for operations such as archiving and cleanup.

Jobs should support retries and basic monitoring.

### Real-time Updates

If users need to see activity changes immediately, I would introduce WebSockets or Server-Sent Events.

The database would remain the source of truth, while real-time events would notify connected clients.

### Caching and Observability

I would only cache frequently requested data where caching provides a real benefit.

I would also monitor API latency, database query time, error rates, queue failures, and activity volume to identify bottlenecks.

### System Design

The current flow is:

`Client → API → Activity Service → Database`

At larger scale, it could evolve into:

`Client → API → Activity Service → Database`
`                         ↓`
`                    Queue → Workers → Archive`

I would introduce these components only when measurements show that they are needed, keeping the system simple until the scale requires further changes.