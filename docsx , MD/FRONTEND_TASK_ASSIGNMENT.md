# Task Assignment Frontend

## 1. Overview

This feature adds the front-end Task Assignment flow to the Task Detail page. The assignee UI lives in the existing task detail view and reuses the current project member data and query patterns instead of introducing a second source of truth.

The behavior is implemented in the web task feature and connected to the backend assignment endpoint:

- PATCH /tasks/:taskId/assignee
- Request body: { "assigneeId": "USER_ID" }
- Unassign: { "assigneeId": null }

## 2. User Experience

- Assignee display: the task detail sidebar shows the current assignee, or “Unassigned” when no one is assigned.
- Assignment selector: authorized users open a standard Select control with project members as the available options.
- Unassign behavior: the selector includes an explicit “Unassigned” option so the task can be cleared without a page reload.
- Project member selection: only members returned by the project members API are listed, using the member user object and `user.id` as the assignment target.

## 3. Permission Handling

The UI follows the backend permission model:

- OWNER / ADMIN / PROJECT_MANAGER: can assign any project member.
- MEMBER: can only assign the task to themselves.

When a user lacks permission, the control is effectively disabled and the page shows a clear explanatory note instead of implying the user can modify the assignee.

The backend remains the security boundary. Front-end role checks are only for UX clarity and not for enforcement.

## 4. API Integration

The web client calls the existing typed API helper layer for the assignment mutation.

Example assign request:

```json
{
  "assigneeId": "67b1b8a4d93e74d3d92d4f22"
}
```

Example unassign request:

```json
{
  "assigneeId": null
}
```

The task detail cache is updated immediately from the API response to keep the UI in sync without a full reload.

## 5. UI States

The assignee UI handles:

- loading: assignment requests are prevented while pending.
- success: the displayed assignee updates from the API response.
- error: API errors are surfaced through the app’s standard toast pattern and the previous assignee remains visible.
- empty: a graceful empty state is shown when no project members exist.
- unassigned: the field clearly reads “Unassigned”.
- permission/disabled: the assignee control is disabled or display-only when the user cannot modify it.

## 6. Accessibility

The selector uses a proper labeled control, visible focus styling, keyboard support via the existing Select primitive, and disabled state handling. The assignee area communicates status both visually and via accessible labeling instead of relying only on color.

## 7. Responsive Design

The assignee section is integrated into the existing task detail sidebar layout, so it remains usable on desktop, tablet, and mobile. The form keeps the current design system and sizing instead of introducing a separate mobile-only pattern.

## 8. Files Changed

Important updates include:

- packages/shared/src/api.ts: adds `assignee: UserSummary | null` to the task API types.
- apps/api/src/tasks/tasks.controller.ts: adds the PATCH /tasks/:taskId/assignee endpoint.
- apps/api/src/tasks/tasks.service.ts: updates task serialization and assignment logic to return the assignee in task detail payloads.
- apps/web/src/features/tasks/api.ts: adds the typed assignee mutation client call.
- apps/web/src/features/tasks/hooks.ts: adds the React Query mutation for assignment updates.
- apps/web/src/features/tasks/components/task-assignee-select.tsx: implements the assignee selector UX and permission gating.
- apps/web/src/features/tasks/components/task-view.tsx: inserts the assignee section into the task detail page.
- apps/web/src/components/ui/select.tsx: adds the focused, accessible styling used by the control.

## 9. Verification

The following checks were actually run:

- `pnpm --filter @projectflow/api test -- --runInBand test/tasks.e2e.spec.ts`
  - Result: 1 test suite passed, 8 tests passed.
- `pnpm --filter @projectflow/shared build; pnpm --filter @projectflow/web typecheck`
  - Result: shared package build succeeded and the web TypeScript check passed.

# Activity History Frontend

## Activity Timeline

The Task Detail page now includes an Activity History timeline for assignee changes. Each entry shows the actor, readable previous/new assignee information, and a semantic timestamp. Raw IDs are never shown.

## API Integration

The web API layer calls `GET /tasks/:taskId/activity` using the shared `Paginated<TaskActivityEntry>` contract. Assignment mutations invalidate the task activity query so the timeline reflects the latest change.

## React Query

`useTaskActivity(taskId, page)` scopes its query key to the task and page, and uses the existing query provider and API client patterns.

## States and Pagination

The timeline has loading skeletons, an error message, and a clear `No activity yet.` empty state. When more than one page exists, accessible Previous and Next buttons are shown with the current page.

## Accessibility and Responsive Behavior

The timeline uses a labelled section, ordered list, semantic `time` elements, keyboard-accessible buttons, and text descriptions that do not rely on color. It is placed inside the existing responsive task detail layout and uses the established UI primitives.

## Files Changed

- `apps/web/src/features/tasks/api.ts`: typed activity API function.
- `apps/web/src/features/tasks/hooks.ts`: activity query and assignment invalidation.
- `apps/web/src/features/tasks/components/task-activity-timeline.tsx`: timeline states and pagination.
- `apps/web/src/features/tasks/components/task-view.tsx`: timeline placement.
- `apps/web/src/lib/query-keys.ts`: task activity query key.
- `packages/shared/src/api.ts`: activity response types.

## Verification

- `pnpm --filter @projectflow/shared build` passed.
- `pnpm --filter @projectflow/web typecheck` passed.
- `pnpm --filter @projectflow/web lint` passed.
