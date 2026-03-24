using System.ComponentModel.DataAnnotations;

namespace TaskApi.Dtos;

public sealed record CreateTaskRequest
{
    [Required, MinLength(1), MaxLength(200)]
    public required string Title { get; init; }
    [MaxLength(2000)]
    public string? Description { get; init; }
    public string Status { get; init; } = string.Empty;
    public string Priority { get; init; } = string.Empty;
    public DateTimeOffset? DueDate { get; init; }
    [MaxLength(200)]
    public string? Assignee { get; init; }
}

public sealed record UpdateTaskRequest
{
    [MaxLength(200)]
    public string? Title { get; init; }
    [MaxLength(2000)]
    public string? Description { get; init; }
    public string? Status { get; init; }
    public string? Priority { get; init; }
    public DateTimeOffset? DueDate { get; init; }
    [MaxLength(200)]
    public string? Assignee { get; init; }
}

public sealed record TaskQueryParams(
    string? Status = null,
    string? Priority = null,
    string? Search = null,
    string SortBy = "createdAt",
    string SortDirection = "desc",
    int Page = 1,
    int PageSize = 20
);
