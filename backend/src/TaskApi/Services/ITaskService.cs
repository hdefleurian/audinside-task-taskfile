using TaskApi.Dtos;

namespace TaskApi.Services;

public interface ITaskService
{
    Task<PagedResult<TaskItemDto>> GetAllAsync(TaskQueryParams query, CancellationToken ct = default);
    Task<TaskItemDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<TaskItemDto> CreateAsync(CreateTaskRequest request, CancellationToken ct = default);
    Task<TaskItemDto?> UpdateAsync(Guid id, UpdateTaskRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
}
