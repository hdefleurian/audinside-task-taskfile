namespace TaskApi.Domain;

public enum TaskStatus
{
    Todo = 0,
    InProgress = 1,
    Done = 2
}

public enum TaskPriority
{
    Low = 0,
    Medium = 1,
    High = 2
}

public sealed class TaskItem
{
    public Guid Id { get; set; }

    public required string Title { get; set; }

    public string? Description { get; set; }

    public TaskStatus Status { get; set; } = TaskStatus.Todo;

    public TaskPriority Priority { get; set; } = TaskPriority.Medium;

    public DateTimeOffset? DueDate { get; set; }

    public string? Assignee { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
