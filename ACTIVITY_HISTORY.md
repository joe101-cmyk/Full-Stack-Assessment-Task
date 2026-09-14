# Activity History

## 1. Overview

Activity History records task assignee changes only. Title, description, status, priority, comments, and unrelated task updates do not create activity records.

## 2. Supported Transitions

The system records:

- Unassigned -> Assigned
- Assigned -> Different User
- Assigned -> Unassigned

Assigning a task to its current assignee does not create an activity.

## 3. Data Model

The `task_activities` collection stores `taskId`, `projectId`, `actorId`, `type`, `fromAssigneeId`, `toAssigneeId`, and `createdAt`. The activity type is currently `ASSIGNEE_CHANGED`; assignee fields may be null.

## 4. Indexing

A compound `{ taskId: 1, createdAt: -1 }` index supports filtering one task and returning its newest activities first while paginating in MongoDB.

## 5. Assignment Integration

`TasksService.assignTask()` captures the current assignee before authorization and mutation. After `assertCanAssign()` validates the authenticated actor and target, it saves the task and creates an activity only when the old and new assignee IDs differ. The actor is always the authenticated user from the request context; the frontend cannot provide it.

## 6. API

`GET /tasks/:taskId/activity` returns:

```json
{
  "items": [
    {
      "id": "...",
      "taskId": "...",
      "projectId": "...",
      "actor": { "id": "...", "name": "...", "email": "..." },
      "type": "ASSIGNEE_CHANGED",
      "fromAssignee": null,
      "toAssignee": { "id": "...", "name": "...", "email": "..." },
      "createdAt": "2026-09-14T12:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

The endpoint requires authentication, uses the existing page/pageSize pagination contract, and returns newest activity first.

## 7. Authorization

The task is loaded first, then access is enforced with the existing `ProjectAccessService.assertCanView()` rules. A user outside the project receives the same forbidden response used by other task reads.

## 8. Performance

The endpoint applies database-level skip/limit pagination and the taskId/createdAt index. Actor and assignee users are fetched in one `UsersService.findManyByIds()` call and indexed in a map, avoiding one query per activity.

## 9. Consistency

The task save is awaited before activity creation, and activity creation errors are not swallowed: the request fails visibly if the activity write fails. The current project does not use MongoDB transactions, so this remains a two-write operation without transaction-level atomicity. This limitation is explicit rather than introducing a new transaction architecture.

## 10. Frontend

The Task Detail page includes an accessible Activity History timeline. It shows actor, readable assignee transition text, and timestamp, with loading skeletons, an empty state, error state, and Previous/Next pagination controls. The existing responsive task layout is reused for desktop, tablet, and mobile.

## 11. Tests

Added API e2e coverage for:

- Unassigned -> assigned
- Assigned -> different user
- Assigned -> unassigned
- Same-assignee no-op
- Actor, previous assignee, and new assignee serialization
- Newest-first ordering
- Pagination and multiple activities
- Accessible project member and forbidden outsider access

Executed checks:

- `pnpm --filter @projectflow/api test -- --runInBand test/tasks.e2e.spec.ts` - 10 tests passed.
- `pnpm --filter @projectflow/shared build` - passed.
- `pnpm --filter @projectflow/web typecheck` - passed.
- `pnpm --filter @projectflow/web lint` - passed.
