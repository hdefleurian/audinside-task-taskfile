using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using FluentAssertions;
using Microsoft.IdentityModel.Tokens;
using TaskApi.Dtos;
using Xunit;

namespace TaskApi.IntegrationTests.Endpoints;

public class TaskEndpointsTests : IClassFixture<TaskApiFactory>, IAsyncLifetime
{
    private readonly HttpClient _client;
    private readonly TaskApiFactory _factory;

    public TaskEndpointsTests(TaskApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", GenerateTestToken());
    }

    public async Task InitializeAsync() => await _factory.ResetDatabaseAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    // ── GET /api/tasks ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetTasks_ReturnsOk_WithEmptyList()
    {
        var response = await _client.GetAsync("/api/tasks");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<PagedResult<TaskItemDto>>();
        result.Should().NotBeNull();
        result!.Items.Should().BeEmpty();
        result.TotalCount.Should().Be(0);
    }

    // ── POST /api/tasks ──────────────────────────────────────────────────────

    [Fact]
    public async Task CreateTask_ReturnsCreated_WithTask()
    {
        var request = new CreateTaskRequest
        {
            Title = "Integration test task",
            Description = "Created during integration test",
            Status = "Todo",
            Priority = "Medium"
        };

        var response = await _client.PostAsJsonAsync("/api/tasks", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await response.Content.ReadFromJsonAsync<TaskItemDto>();
        created.Should().NotBeNull();
        created!.Title.Should().Be("Integration test task");
        created.Id.Should().NotBe(Guid.Empty);
        response.Headers.Location.Should().NotBeNull();
    }

    // ── GET /api/tasks/{id} ──────────────────────────────────────────────────

    [Fact]
    public async Task GetTask_ReturnsOk_WhenExists()
    {
        var created = await CreateTaskAsync("Task To Fetch");

        var response = await _client.GetAsync($"/api/tasks/{created.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var task = await response.Content.ReadFromJsonAsync<TaskItemDto>();
        task!.Title.Should().Be("Task To Fetch");
    }

    [Fact]
    public async Task GetTask_ReturnsNotFound_WhenMissing()
    {
        var response = await _client.GetAsync($"/api/tasks/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── PUT /api/tasks/{id} ──────────────────────────────────────────────────

    [Fact]
    public async Task UpdateTask_ReturnsOk_WithUpdatedTask()
    {
        var created = await CreateTaskAsync("Original Title");

        var response = await _client.PutAsJsonAsync(
            $"/api/tasks/{created.Id}",
            new UpdateTaskRequest { Title = "Updated Title", Status = "Done" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<TaskItemDto>();
        updated!.Title.Should().Be("Updated Title");
        updated.Status.Should().Be("Done");
    }

    [Fact]
    public async Task UpdateTask_ReturnsNotFound_WhenMissing()
    {
        var response = await _client.PutAsJsonAsync(
            $"/api/tasks/{Guid.NewGuid()}",
            new UpdateTaskRequest { Title = "X" });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── DELETE /api/tasks/{id} ───────────────────────────────────────────────

    [Fact]
    public async Task DeleteTask_ReturnsNoContent_WhenDeleted()
    {
        var created = await CreateTaskAsync("To Delete");

        var response = await _client.DeleteAsync($"/api/tasks/{created.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Verify gone
        var getResponse = await _client.GetAsync($"/api/tasks/{created.Id}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteTask_ReturnsNotFound_WhenMissing()
    {
        var response = await _client.DeleteAsync($"/api/tasks/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── Unauthenticated ──────────────────────────────────────────────────────

    [Fact]
    public async Task GetTasks_ReturnsUnauthorized_WithoutToken()
    {
        // Use the factory's in-memory server — a plain new HttpClient would connect
        // to a real socket and fail with connection refused.
        var unauthClient = _factory.CreateClient();
        var response = await unauthClient.GetAsync("/api/tasks");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private async Task<TaskItemDto> CreateTaskAsync(string title)
    {
        var response = await _client.PostAsJsonAsync("/api/tasks",
            new CreateTaskRequest { Title = title });
        return (await response.Content.ReadFromJsonAsync<TaskItemDto>())!;
    }

    private static string GenerateTestToken()
    {
        var handler = new JwtSecurityTokenHandler();
        var token = handler.CreateJwtSecurityToken(new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity([
                new Claim(ClaimTypes.NameIdentifier, "test-user"),
                new Claim("preferred_username", "testuser")
            ]),
            Expires = DateTime.UtcNow.AddHours(1),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey("test-secret-key-that-is-long-enough"u8.ToArray()),
                SecurityAlgorithms.HmacSha256)
        });
        return handler.WriteToken(token);
    }
}
