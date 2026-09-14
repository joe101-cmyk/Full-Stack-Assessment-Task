import type { INestApplication } from '@nestjs/common';
import type { Connection } from 'mongoose';
import request from 'supertest';
import { OrganizationRole, ProjectRole, TaskPriority, TaskStatus } from '@projectflow/shared';
import { createTestApp, resetDatabase } from './utils/test-app';
import {
  addOrganizationMember,
  addProjectMember,
  authHeader,
  createOrganization,
  createProject,
  registerUser,
  type TestUser,
} from './utils/fixtures';

describe('Tasks', () => {
  let app: INestApplication;
  let connection: Connection;

  let owner: TestUser;
  let member: TestUser;
  let outsider: TestUser;
  let projectId: string;

  beforeAll(async () => {
    ({ app, connection } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(connection);

    owner = await registerUser(app, 'Ammar Yaser', 'ammar@example.com');
    member = await registerUser(app, 'Magd Ali', 'magd@example.com');
    outsider = await registerUser(app, 'Outside User', 'outside@example.com');

    const organizationId = await createOrganization(
      connection,
      'Acme Software',
      'acme-software',
      owner.id,
    );
    await addOrganizationMember(connection, organizationId, owner.id, OrganizationRole.OWNER);
    await addOrganizationMember(connection, organizationId, member.id, OrganizationRole.MEMBER);

    projectId = await createProject(
      connection,
      organizationId,
      'Internal Platform',
      'ENG',
      owner.id,
    );
    await addProjectMember(connection, projectId, owner.id, ProjectRole.PROJECT_MANAGER);
    await addProjectMember(connection, projectId, member.id, ProjectRole.MEMBER);
  });

  it('lets a project member create a task', async () => {
    const response = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', authHeader(member))
      .send({
        title: 'Improve API error handling',
        description: 'Normalise validation and permission errors.',
        priority: TaskPriority.HIGH,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      key: 'ENG-1',
      number: 1,
      title: 'Improve API error handling',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
    });
    expect(response.body.createdBy).toMatchObject({ email: 'magd@example.com' });
  });

  it('numbers tasks sequentially within a project', async () => {
    for (const title of ['First task', 'Second task', 'Third task']) {
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .set('Authorization', authHeader(member))
        .send({ title })
        .expect(201);
    }

    const response = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks`)
      .set('Authorization', authHeader(member))
      .expect(200);

    expect(response.body.total).toBe(3);
    expect(response.body.items.map((task: { key: string }) => task.key)).toEqual([
      'ENG-1',
      'ENG-2',
      'ENG-3',
    ]);
  });

  it('refuses to update task status for someone outside the project', async () => {
  const createResponse = await request(app.getHttpServer())
    .post(`/projects/${projectId}/tasks`)
    .set('Authorization', authHeader(member))
    .send({
      title: 'Protected task',
      status: TaskStatus.TODO,
    })
    .expect(201);

  const taskId = createResponse.body.id;

  await request(app.getHttpServer())
    .patch(`/tasks/${taskId}/status`)
    .set('Authorization', authHeader(outsider))
    .send({
      status: TaskStatus.DONE,
    })
    .expect(403);

  const response = await request(app.getHttpServer())
    .get(`/tasks/${taskId}`)
    .set('Authorization', authHeader(member))
    .expect(200);

  expect(response.body.status).toBe(TaskStatus.TODO);
});

  it('refuses to create a task for someone outside the project', async () => {
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', authHeader(outsider))
      .send({ title: 'Should not be created' })
      .expect(403);
  });

  it('refuses to list tasks for someone outside the project', async () => {
    await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks`)
      .set('Authorization', authHeader(outsider))
      .expect(403);
  });

  it('rejects a task without a usable title', async () => {
    const response = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', authHeader(member))
      .send({ title: 'ab' })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
  });

  it('filters the task list by status', async () => {
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', authHeader(member))
      .send({ title: 'Work in flight', status: TaskStatus.IN_PROGRESS })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', authHeader(member))
      .send({ title: 'Not started yet' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks`)
      .query({ status: TaskStatus.IN_PROGRESS })
      .set('Authorization', authHeader(member))
      .expect(200);

    expect(response.body.total).toBe(1);
    expect(response.body.items[0]).toMatchObject({ title: 'Work in flight' });
  });

  it('allows a project manager to assign a task to another project member', async () => {
    const projectManager = await registerUser(app, 'Project Manager', 'pm@example.com');
    await addProjectMember(connection, projectId, projectManager.id, ProjectRole.PROJECT_MANAGER);

    const createResponse = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', authHeader(member))
      .send({ title: 'Assign this task' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/tasks/${createResponse.body.id}/assignee`)
      .set('Authorization', authHeader(projectManager))
      .send({ assigneeId: member.id })
      .expect(200);

    expect(response.body.assignee).toMatchObject({
      id: member.id,
      email: 'magd@example.com',
    });
  });

  it('records assignee transitions with actor and both assignees', async () => {
    const createResponse = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', authHeader(member))
      .send({ title: 'Track assignment history' })
      .expect(201);

    const taskId = createResponse.body.id as string;
    const first = await request(app.getHttpServer())
      .patch(`/tasks/${taskId}/assignee`)
      .set('Authorization', authHeader(owner))
      .send({ assigneeId: member.id })
      .expect(200);
    expect(first.body.assignee.id).toBe(member.id);

    const same = await request(app.getHttpServer())
      .patch(`/tasks/${taskId}/assignee`)
      .set('Authorization', authHeader(owner))
      .send({ assigneeId: member.id })
      .expect(200);
    expect(same.body.assignee.id).toBe(member.id);

    await request(app.getHttpServer())
      .patch(`/tasks/${taskId}/assignee`)
      .set('Authorization', authHeader(owner))
      .send({ assigneeId: owner.id })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/tasks/${taskId}/assignee`)
      .set('Authorization', authHeader(owner))
      .send({ assigneeId: null })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get(`/tasks/${taskId}/activity`)
      .set('Authorization', authHeader(member))
      .expect(200);

    expect(response.body.total).toBe(3);
    expect(response.body.items).toHaveLength(3);
    expect(response.body.items[0]).toMatchObject({
      actor: { id: owner.id },
      fromAssignee: { id: owner.id },
      toAssignee: null,
      type: 'ASSIGNEE_CHANGED',
    });
    expect(response.body.items[1]).toMatchObject({
      actor: { id: owner.id },
      fromAssignee: { id: member.id },
      toAssignee: { id: owner.id },
    });
    expect(response.body.items[2]).toMatchObject({
      actor: { id: owner.id },
      fromAssignee: null,
      toAssignee: { id: member.id },
    });
    expect(new Date(response.body.items[0].createdAt).getTime()).toBeGreaterThanOrEqual(
      new Date(response.body.items[1].createdAt).getTime(),
    );
  });

  it('paginates activity and rejects users outside the project', async () => {
    const createResponse = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', authHeader(member))
      .send({ title: 'Paginated activity' })
      .expect(201);
    const taskId = createResponse.body.id as string;

    await request(app.getHttpServer())
      .patch(`/tasks/${taskId}/assignee`)
      .set('Authorization', authHeader(owner))
      .send({ assigneeId: member.id })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/tasks/${taskId}/assignee`)
      .set('Authorization', authHeader(owner))
      .send({ assigneeId: null })
      .expect(200);

    const page = await request(app.getHttpServer())
      .get(`/tasks/${taskId}/activity`)
      .query({ page: 2, pageSize: 1 })
      .set('Authorization', authHeader(member))
      .expect(200);
    expect(page.body).toMatchObject({ total: 2, page: 2, pageSize: 1 });
    expect(page.body.items).toHaveLength(1);

    await request(app.getHttpServer())
      .get(`/tasks/${taskId}/activity`)
      .set('Authorization', authHeader(outsider))
      .expect(403);
  });
});
