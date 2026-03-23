using Microsoft.AspNetCore.Mvc;
using TaskApi.Dtos;
using TaskApi.Services;

namespace TaskApi.Endpoints;

public static class TaskEndpoints
{
    public static IEndpointRouteBuilder MapTaskEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/tasks")
            .RequireAuthorization()
            .WithTags("Tasks");

        group.MapGet("/", GetAllTasks)
            .WithName("GetAllTasks")
            .WithSummary("List tasks with optional filtering, sorting and pagination");

        group.MapGet("/{id:guid}", GetTaskById)
            .WithName("GetTaskById")
            .WithSummary("Get a single task by ID");

        group.MapPost("/", CreateTask)
            .WithName("CreateTask")
            .WithSummary("Create a new task");

        group.MapPut("/{id:guid}", UpdateTask)
            .WithName("UpdateTask")
            .WithSummary("Update an existing task");

        group.MapDelete("/{id:guid}", DeleteTask)
            .WithName("DeleteTask")
            .WithSummary("Delete a task");

        return app;
    }

    private static async Task<IResult> GetAllTasks(
        [AsParameters] TaskQueryParams query,
        ITaskService service,
        CancellationToken ct)
    {
        var result = await service.GetAllAsync(query, ct);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetTaskById(
        Guid id,
        ITaskService service,
        CancellationToken ct)
    {
        var task = await service.GetByIdAsync(id, ct);
        return task is null ? Results.NotFound() : Results.Ok(task);
    }

    private static async Task<IResult> CreateTask(
        CreateTaskRequest request,
        ITaskService service,
        CancellationToken ct)
    {
        var created = await service.CreateAsync(request, ct);
        return Results.Created($"/api/tasks/{created.Id}", created);
    }

    private static async Task<IResult> UpdateTask(
        Guid id,
        UpdateTaskRequest request,
        ITaskService service,
        CancellationToken ct)
    {
        var updated = await service.UpdateAsync(id, request, ct);
        return updated is null ? Results.NotFound() : Results.Ok(updated);
    }

    private static async Task<IResult> DeleteTask(
        Guid id,
        ITaskService service,
        CancellationToken ct)
    {
        var deleted = await service.DeleteAsync(id, ct);
        return deleted ? Results.NoContent() : Results.NotFound();
    }
}
