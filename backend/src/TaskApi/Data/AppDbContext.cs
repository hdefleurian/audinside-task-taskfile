using Microsoft.EntityFrameworkCore;
using TaskApi.Domain;

namespace TaskApi.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<TaskItem> Tasks => Set<TaskItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TaskItem>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Id).ValueGeneratedNever();

            entity.Property(t => t.Title)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(t => t.Description)
                .HasMaxLength(2000);

            entity.Property(t => t.Assignee)
                .HasMaxLength(200);

            entity.Property(t => t.Status)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.Property(t => t.Priority)
                .HasConversion<string>()
                .HasMaxLength(10);

            entity.HasIndex(t => t.Status);
            entity.HasIndex(t => t.Priority);
            entity.HasIndex(t => t.DueDate);
            entity.HasIndex(t => t.CreatedAt);
        });
    }
}
