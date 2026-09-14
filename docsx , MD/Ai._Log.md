# AI_LOG.md

## AI Usage

I used AI assistance during the assessment for code understanding, implementation support, debugging, and documentation.

### How AI Was Used

- Reviewed the existing NestJS, Mongoose, and Next.js architecture.
- Helped identify authorization and project-membership requirements for task assignment.
- Assisted with implementing task assignment and assignee validation.
- Assisted with implementing task activity history and pagination.
- Helped investigate the task modification authorization bug.
- Assisted with identifying the concurrency issue in task number generation and designing a counter-based solution.
- Helped review and improve automated test coverage.
- Assisted with frontend implementation for the assignee selector and activity timeline.
- Used AI to review documentation and clarify technical decisions.

### Suggestions Reviewed and Modified

AI-generated suggestions were reviewed against the existing codebase and assessment requirements before being applied.

I modified generated suggestions where necessary to:
- Match the existing project architecture and coding conventions.
- Keep authorization rules enforced on the backend.
- Reuse existing API clients, query handling, UI components, and shared types.
- Avoid unnecessary changes outside the assessment scope.
- Ensure activity records are created only when the assignee actually changes.

### Generated Code

AI assistance was used as a development aid, but generated code was reviewed, adapted, and integrated manually. Final implementation decisions and verification were performed against the existing codebase and automated tests.

### Verification

The implementation was verified using:
- Backend E2E tests
- Shared package build
- Frontend TypeScript typecheck
- Frontend ESLint