using TaskApi.Domain;

namespace TaskApi.Dtos;

public sealed record TaskItemDto(
    Guid Id,
    string Title,
    string? Description,
    string Status,
    string Priority,
    DateTimeOffset? DueDate,
    string? Assignee,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

public sealed record PagedResult<T>(
    IReadOnlyList<T> Items,
    int TotalCount,
    int Page,
    int PageSize
);

public static class TaskItemDtoExtensions
{
    public static TaskItemDto ToDto(this TaskItem task) => new(
        task.Id,
        task.Title,
        task.Description,
        task.Status.ToString(),
        task.Priority.ToString(),
        task.DueDate,
        task.Assignee,
        task.CreatedAt,
        task.UpdatedAt
    );
}
