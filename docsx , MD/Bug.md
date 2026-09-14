# Bug Report

## Summary

Some users were able to modify the status of tasks belonging to projects they were not members of.

## Steps to Reproduce

1. Create a project and add User A as a project member.
2. Create a task inside the project using User A.
3. Use User B, who is not a member of the project.
4. Send a request to update the task status using the task ID.
5. Observe that the task status was changed successfully.

## Expected Behavior

A user who does not have access to the task's project should not be able to modify the task.

The API should reject the request with `403 Forbidden`.

## Actual Behavior

The task status was changed successfully even though the authenticated user was not a member of the project.

## Root Cause

The `PATCH /tasks/:taskId/status` endpoint did not pass the authenticated user's ID to the service.

As a result, `TasksService.updateStatus()` did not perform any project authorization check before modifying and saving the task.

## Impact

An unauthorized user could modify the status of tasks belonging to projects they were not members of.

This is an authorization issue that could allow users to modify project data outside their permitted scope.

## Fix

The authenticated user's ID is now passed from the controller to `TasksService.updateStatus()`.

The service uses `ProjectAccessService.assertCanView()` with the task's `projectId` and the authenticated user's ID before updating the task status.

If the user does not have access to the project, the request is rejected with `403 Forbidden`.

## Regression Test

An automated E2E regression test was added to `apps/api/test/tasks.e2e.spec.ts`.

The test verifies that:

- A project member can create a task.
- A user who is not a member of the project cannot update the task's status.
- The unauthorized request returns `403 Forbidden`.
- The task status remains unchanged after the unauthorized request.

The API test suite passes successfully:

- Test Suites: 4 passed
- Tests: 21 passed
- Snapshots: 0