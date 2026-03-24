export enum TaskStatus {
    Todo = 'Todo',
    InProgress = 'InProgress',
    Done = 'Done'
}

export enum TaskPriority {
    Low = 'Low',
    Medium = 'Medium',
    High = 'High'
}

export interface TaskItem {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: string | null;
    assignee: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface PagedResult<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
}

export interface TaskQueryParams {
    status?: TaskStatus;
    priority?: TaskPriority;
    search?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
}

export interface CreateTaskRequest {
    title: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | null;
    assignee?: string | null;
}

export interface UpdateTaskRequest {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | null;
    assignee?: string | null;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
    [TaskStatus.Todo]: 'To Do',
    [TaskStatus.InProgress]: 'In Progress',
    [TaskStatus.Done]: 'Done'
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
    [TaskPriority.Low]: 'Low',
    [TaskPriority.Medium]: 'Medium',
    [TaskPriority.High]: 'High'
};
