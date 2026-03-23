using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TaskApi.Data;
using TaskApi.Dtos;
using TaskApi.Services;

namespace TaskApi.UnitTests.Services;

public class TaskServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly TaskService _sut;

    public TaskServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _db = new AppDbContext(options);
        _sut = new TaskService(_db);
    }

    public void Dispose() => _db.Dispose();

    // ── GetAllAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllAsync_ReturnsPagedResult_WithAllTasks()
    {
        // Arrange
        _db.Tasks.AddRange(CreateTask("Task A"), CreateTask("Task B"), CreateTask("Task C"));
        await _db.SaveChangesAsync();

        // Act
        var result = await _sut.GetAllAsync(new TaskQueryParams());

        // Assert
        result.TotalCount.Should().Be(3);
        result.Items.Should().HaveCount(3);
    }

    [Fact]
    public async Task GetAllAsync_FiltersBy_Status()
    {
        _db.Tasks.AddRange(
            CreateTask("Todo 1", status: Domain.TaskStatus.Todo),
            CreateTask("InProgress 1", status: Domain.TaskStatus.InProgress),
            CreateTask("Done 1", status: Domain.TaskStatus.Done));
        await _db.SaveChangesAsync();

        var result = await _sut.GetAllAsync(new TaskQueryParams { Status = "InProgress" });

        result.TotalCount.Should().Be(1);
        result.Items[0].Status.Should().Be("InProgress");
    }

    [Fact]
    public async Task GetAllAsync_FiltersBy_Priority()
    {
        _db.Tasks.AddRange(
            CreateTask("High Priority", priority: Domain.TaskPriority.High),
            CreateTask("Low Priority", priority: Domain.TaskPriority.Low));
        await _db.SaveChangesAsync();

        var result = await _sut.GetAllAsync(new TaskQueryParams { Priority = "High" });

        result.TotalCount.Should().Be(1);
        result.Items[0].Priority.Should().Be("High");
    }

    [Fact]
    public async Task GetAllAsync_FiltersBy_SearchText_InTitle()
    {
        _db.Tasks.AddRange(
            CreateTask("Fix the bug"),
            CreateTask("Write documentation"),
            CreateTask("Fix database query"));
        await _db.SaveChangesAsync();

        var result = await _sut.GetAllAsync(new TaskQueryParams { Search = "fix" });

        result.TotalCount.Should().Be(2);
    }

    [Fact]
    public async Task GetAllAsync_PaginatesCorrectly()
    {
        for (var i = 0; i < 25; i++)
            _db.Tasks.Add(CreateTask($"Task {i}"));
        await _db.SaveChangesAsync();

        var page1 = await _sut.GetAllAsync(new TaskQueryParams { Page = 1, PageSize = 10 });
        var page2 = await _sut.GetAllAsync(new TaskQueryParams { Page = 2, PageSize = 10 });
        var page3 = await _sut.GetAllAsync(new TaskQueryParams { Page = 3, PageSize = 10 });

        page1.Items.Should().HaveCount(10);
        page2.Items.Should().HaveCount(10);
        page3.Items.Should().HaveCount(5);
        page1.TotalCount.Should().Be(25);
    }

    // ── GetByIdAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_ReturnsTask_WhenExists()
    {
        var task = CreateTask("My Task");
        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();

        var result = await _sut.GetByIdAsync(task.Id);

        result.Should().NotBeNull();
        result!.Title.Should().Be("My Task");
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsNull_WhenNotFound()
    {
        var result = await _sut.GetByIdAsync(Guid.NewGuid());
        result.Should().BeNull();
    }

    // ── CreateAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_PersistsTask_AndReturnsDto()
    {
        var request = new CreateTaskRequest
        {
            Title = "New Task",
            Description = "A description",
            Status = "InProgress",
            Priority = "High",
            Assignee = "alice"
        };

        var result = await _sut.CreateAsync(request);

        result.Id.Should().NotBe(Guid.Empty);
        result.Title.Should().Be("New Task");
        result.Status.Should().Be("InProgress");
        result.Priority.Should().Be("High");

        _db.Tasks.Count().Should().Be(1);
    }

    [Fact]
    public async Task CreateAsync_DefaultsStatus_ToTodo_WhenInvalid()
    {
        var request = new CreateTaskRequest { Title = "Test", Status = "unknown" };

        var result = await _sut.CreateAsync(request);

        result.Status.Should().Be("Todo");
    }

    // ── UpdateAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateAsync_UpdatesTask_AndReturnsDto()
    {
        var task = CreateTask("Original");
        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();

        var result = await _sut.UpdateAsync(task.Id, new UpdateTaskRequest { Title = "Updated" });

        result.Should().NotBeNull();
        result!.Title.Should().Be("Updated");
    }

    [Fact]
    public async Task UpdateAsync_ReturnsNull_WhenNotFound()
    {
        var result = await _sut.UpdateAsync(Guid.NewGuid(), new UpdateTaskRequest { Title = "X" });
        result.Should().BeNull();
    }

    // ── DeleteAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteAsync_RemovesTask_AndReturnsTrue()
    {
        var task = CreateTask("To Delete");
        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();

        var result = await _sut.DeleteAsync(task.Id);

        result.Should().BeTrue();
        _db.Tasks.Count().Should().Be(0);
    }

    [Fact]
    public async Task DeleteAsync_ReturnsFalse_WhenNotFound()
    {
        var result = await _sut.DeleteAsync(Guid.NewGuid());
        result.Should().BeFalse();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static Domain.TaskItem CreateTask(
        string title,
        Domain.TaskStatus status = Domain.TaskStatus.Todo,
        Domain.TaskPriority priority = Domain.TaskPriority.Medium)
    {
        var now = DateTimeOffset.UtcNow;
        return new Domain.TaskItem
        {
            Id = Guid.NewGuid(),
            Title = title,
            Status = status,
            Priority = priority,
            CreatedAt = now,
            UpdatedAt = now
        };
    }
}
