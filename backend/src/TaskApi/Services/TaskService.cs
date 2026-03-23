using Microsoft.EntityFrameworkCore;
using TaskApi.Data;
using TaskApi.Domain;
using TaskApi.Dtos;

namespace TaskApi.Services;

public sealed class TaskService(AppDbContext db) : ITaskService
{
    public async Task<PagedResult<TaskItemDto>> GetAllAsync(TaskQueryParams query, CancellationToken ct = default)
    {
        var q = db.Tasks.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Status) &&
            Enum.TryParse<Domain.TaskStatus>(query.Status, ignoreCase: true, out var statusEnum))
        {
            q = q.Where(t => t.Status == statusEnum);
        }

        if (!string.IsNullOrWhiteSpace(query.Priority) &&
            Enum.TryParse<TaskPriority>(query.Priority, ignoreCase: true, out var priorityEnum))
        {
            q = q.Where(t => t.Priority == priorityEnum);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.ToLower();
            q = q.Where(t => t.Title.ToLower().Contains(search) ||
                              (t.Description != null && t.Description.ToLower().Contains(search)) ||
                              (t.Assignee != null && t.Assignee.ToLower().Contains(search)));
        }

        q = (query.SortBy?.ToLower(), query.SortDirection?.ToLower()) switch
        {
            ("duedate", "asc")     => q.OrderBy(t => t.DueDate),
            ("duedate", _)         => q.OrderByDescending(t => t.DueDate),
            ("priority", "asc")    => q.OrderBy(t => t.Priority),
            ("priority", _)        => q.OrderByDescending(t => t.Priority),
            ("title", "asc")       => q.OrderBy(t => t.Title),
            ("title", _)           => q.OrderByDescending(t => t.Title),
            ("updatedat", "asc")   => q.OrderBy(t => t.UpdatedAt),
            ("updatedat", _)       => q.OrderByDescending(t => t.UpdatedAt),
            ("createdat", "asc")   => q.OrderBy(t => t.CreatedAt),
            _                      => q.OrderByDescending(t => t.CreatedAt)
        };

        var totalCount = await q.CountAsync(ct);

        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var page = Math.Max(query.Page, 1);
        var items = await q
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => t.ToDto())
            .ToListAsync(ct);

        return new PagedResult<TaskItemDto>(items, totalCount, page, pageSize);
    }

    public async Task<TaskItemDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var task = await db.Tasks.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id, ct);
        return task?.ToDto();
    }

    public async Task<TaskItemDto> CreateAsync(CreateTaskRequest request, CancellationToken ct = default)
    {
        var status = Enum.TryParse<Domain.TaskStatus>(request.Status, ignoreCase: true, out var s)
            ? s
            : Domain.TaskStatus.Todo;

        var priority = Enum.TryParse<TaskPriority>(request.Priority, ignoreCase: true, out var p)
            ? p
            : TaskPriority.Medium;

        var now = DateTimeOffset.UtcNow;
        var task = new TaskItem
        {
            Id = Guid.NewGuid(),
            Title = request.Title,
            Description = request.Description,
            Status = status,
            Priority = priority,
            DueDate = request.DueDate,
            Assignee = request.Assignee,
            CreatedAt = now,
            UpdatedAt = now
        };

        db.Tasks.Add(task);
        await db.SaveChangesAsync(ct);

        return task.ToDto();
    }

    public async Task<TaskItemDto?> UpdateAsync(Guid id, UpdateTaskRequest request, CancellationToken ct = default)
    {
        var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (task is null) return null;

        if (request.Title is not null)
            task.Title = request.Title;

        if (request.Description is not null)
            task.Description = request.Description;

        if (request.Status is not null &&
            Enum.TryParse<Domain.TaskStatus>(request.Status, ignoreCase: true, out var status))
            task.Status = status;

        if (request.Priority is not null &&
            Enum.TryParse<TaskPriority>(request.Priority, ignoreCase: true, out var priority))
            task.Priority = priority;

        if (request.DueDate.HasValue)
            task.DueDate = request.DueDate;

        if (request.Assignee is not null)
            task.Assignee = request.Assignee;

        task.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return task.ToDto();
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var task = await db.Tasks.FindAsync([id], ct);
        if (task is null) return false;

        db.Tasks.Remove(task);
        await db.SaveChangesAsync(ct);
        return true;
    }
}
