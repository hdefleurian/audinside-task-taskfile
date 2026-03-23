using System.ComponentModel.DataAnnotations;

namespace TaskApi.Dtos;

public sealed record CreateTaskRequest(
    [Required, MinLength(1), MaxLength(200)] string Title,
    [MaxLength(2000)] string? Description,
    string Status,
    string Priority,
    DateTimeOffset? DueDate,
    [MaxLength(200)] string? Assignee
);

public sealed record UpdateTaskRequest(
    [MaxLength(200)] string? Title,
    [MaxLength(2000)] string? Description,
    string? Status,
    string? Priority,
    DateTimeOffset? DueDate,
    [MaxLength(200)] string? Assignee
);

public sealed record TaskQueryParams(
    string? Status = null,
    string? Priority = null,
    string? Search = null,
    string SortBy = "createdAt",
    string SortDirection = "desc",
    int Page = 1,
    int PageSize = 20
);
