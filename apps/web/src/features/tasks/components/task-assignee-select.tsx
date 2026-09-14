'use client';

import { toast } from 'sonner';
import { useState } from 'react';
import { ProjectRole, type TaskDetail } from '@projectflow/shared';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { useCurrentUser } from '@/features/auth/hooks';
import { useProject, useProjectMembers } from '@/features/projects/hooks';
import { useUpdateTaskAssignee } from '../hooks';

interface TaskAssigneeSelectProps {
  task: TaskDetail;
  projectId: string;
}

export function TaskAssigneeSelect({ task, projectId }: TaskAssigneeSelectProps) {
  const [search, setSearch] = useState('');
  const { data: currentUser } = useCurrentUser();
  const { data: project } = useProject(projectId);
  const { data: projectMembers = [] } = useProjectMembers(projectId);
  const updateAssignee = useUpdateTaskAssignee(task.id, projectId);

  const currentUserId = currentUser?.id;
  const currentMembership = projectMembers.find((member) => member.user.id === currentUserId) ?? null;
  const isOrgOwnerOrAdmin =
    currentUser != null &&
    project != null &&
    currentUser.organizations.some(
      (organization) =>
        organization.id === project.organization.id &&
        (organization.role === 'OWNER' || organization.role === 'ADMIN'),
    );
  const canAssignAnyMember = isOrgOwnerOrAdmin || currentMembership?.role === ProjectRole.PROJECT_MANAGER;
  const canAssignSelfOnly = currentMembership?.role === ProjectRole.MEMBER && !canAssignAnyMember;
  const canManageAssignee = Boolean(currentUserId) && (canAssignAnyMember || canAssignSelfOnly);

  const selectableMembers = canAssignAnyMember
    ? projectMembers
    : currentUserId
      ? projectMembers.filter((member) => member.user.id === currentUserId)
      : [];
  const normalizedSearch = search.trim().toLowerCase();
  const filteredMembers = normalizedSearch
    ? selectableMembers.filter((member) =>
        `${member.user.name} ${member.user.email}`.toLowerCase().includes(normalizedSearch),
      )
    : selectableMembers;

  const selectedAssignee = task.assignee;

  const handleValueChange = (value: string) => {
    const nextAssigneeId = value === '__unassigned__' ? null : value;
    updateAssignee.mutate(nextAssigneeId, {
      onError: (error) => toast.error(error.message),
    });
  };

  const disabled = updateAssignee.isPending || !canManageAssignee || selectableMembers.length === 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">
          Assignee
        </h2>
        {canAssignSelfOnly ? (
          <span className="text-[10px] font-medium uppercase tracking-wide text-subtle-foreground">
            Self only
          </span>
        ) : null}
      </div>

      {canManageAssignee ? (
        <div className="space-y-2">
          {selectableMembers.length > 8 ? (
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search members"
              aria-label="Search project members"
            />
          ) : null}
          <Select
            value={selectedAssignee?.id ?? '__unassigned__'}
            disabled={disabled}
            onValueChange={handleValueChange}
          >
            <SelectTrigger id="task-assignee" aria-label="Task assignee" className="min-h-9">
              {selectedAssignee ? (
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar user={selectedAssignee} size="sm" />
                  <span className="truncate text-left">{selectedAssignee.name}</span>
                </div>
              ) : (
                <span className="text-subtle-foreground">Unassigned</span>
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__unassigned__">Unassigned</SelectItem>
              {filteredMembers.map((member) => (
                <SelectItem key={member.id} value={member.user.id}>
                  {member.user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectableMembers.length > 0 && filteredMembers.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">No matching members.</p>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-9 items-center gap-2 rounded-md border border-border bg-surface-strong px-2.5 text-[13px] text-foreground">
          {selectedAssignee ? (
            <>
              <Avatar user={selectedAssignee} size="sm" />
              <span className="truncate">{selectedAssignee.name}</span>
            </>
          ) : (
            <span className="text-subtle-foreground">Unassigned</span>
          )}
        </div>
      )}

      {projectMembers.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">No project members available.</p>
      ) : null}

      {!canManageAssignee ? (
        <p className="text-[12px] text-muted-foreground">
          You do not have permission to change the assignee.
        </p>
      ) : null}
    </div>
  );
}
