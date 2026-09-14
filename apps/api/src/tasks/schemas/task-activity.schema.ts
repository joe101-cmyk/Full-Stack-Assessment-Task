import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';
import type { TaskActivityType } from '@projectflow/shared';

export type TaskActivityDocument = HydratedDocument<TaskActivity>;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'task_activities' })
export class TaskActivity {
  @Prop({ type: Types.ObjectId, ref: 'Task', required: true })
  taskId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  projectId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  actorId: Types.ObjectId;

  @Prop({ type: String, enum: ['ASSIGNEE_CHANGED'], required: true })
  type: TaskActivityType;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  fromAssigneeId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  toAssigneeId: Types.ObjectId | null;

  createdAt: Date;
}

export const TaskActivitySchema = SchemaFactory.createForClass(TaskActivity);
TaskActivitySchema.index({ taskId: 1, createdAt: -1 });