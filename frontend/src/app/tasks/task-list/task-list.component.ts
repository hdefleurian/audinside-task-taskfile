import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { TaskService } from '../task.service';
import {
    TaskItem,
    TaskStatus,
    TaskPriority,
    TaskQueryParams,
    TASK_STATUS_LABELS,
    TASK_PRIORITY_LABELS
} from '../task.model';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
    selector: 'app-task-list',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatCardModule,
        MatDialogModule,
        MatSnackBarModule
    ],
    templateUrl: './task-list.component.html',
    styleUrls: ['./task-list.component.scss']
})
export class TaskListComponent implements OnInit {
    private readonly taskService = inject(TaskService);
    private readonly dialog = inject(MatDialog);
    private readonly snackBar = inject(MatSnackBar);

    readonly displayedColumns = ['title', 'status', 'priority', 'dueDate', 'assignee', 'actions'];
    readonly taskStatuses = Object.values(TaskStatus);
    readonly taskPriorities = Object.values(TaskPriority);
    readonly statusLabels: Record<string, string> = TASK_STATUS_LABELS;
    readonly priorityLabels: Record<string, string> = TASK_PRIORITY_LABELS;

    tasks = signal<TaskItem[]>([]);
    totalCount = signal(0);
    loading = signal(false);

    // Filter state
    searchText = signal('');
    selectedStatus = signal<TaskStatus | ''>('');
    selectedPriority = signal<TaskPriority | ''>('');
    currentPage = signal(0);
    pageSize = signal(20);
    sortBy = signal('createdAt');
    sortDirection = signal<'asc' | 'desc'>('desc');

    ngOnInit(): void {
        this.loadTasks();
    }

    loadTasks(): void {
        this.loading.set(true);
        const query: TaskQueryParams = {
            page: this.currentPage() + 1,
            pageSize: this.pageSize(),
            sortBy: this.sortBy(),
            sortDirection: this.sortDirection()
        };
        if (this.searchText()) query.search = this.searchText();
        if (this.selectedStatus()) query.status = this.selectedStatus() as TaskStatus;
        if (this.selectedPriority()) query.priority = this.selectedPriority() as TaskPriority;

        this.taskService.getTasks(query).subscribe({
            next: (result) => {
                this.tasks.set(result.items);
                this.totalCount.set(result.totalCount);
                this.loading.set(false);
            },
            error: () => {
                this.snackBar.open('Failed to load tasks', 'Dismiss', { duration: 3000 });
                this.loading.set(false);
            }
        });
    }

    onSearch(): void {
        this.currentPage.set(0);
        this.loadTasks();
    }

    onFilterChange(): void {
        this.currentPage.set(0);
        this.loadTasks();
    }

    onPageChange(event: PageEvent): void {
        this.currentPage.set(event.pageIndex);
        this.pageSize.set(event.pageSize);
        this.loadTasks();
    }

    onSort(sort: Sort): void {
        this.sortBy.set(sort.active || 'createdAt');
        this.sortDirection.set((sort.direction as 'asc' | 'desc') || 'desc');
        this.currentPage.set(0);
        this.loadTasks();
    }

    clearFilters(): void {
        this.searchText.set('');
        this.selectedStatus.set('');
        this.selectedPriority.set('');
        this.currentPage.set(0);
        this.loadTasks();
    }

    deleteTask(task: TaskItem): void {
        const ref = this.dialog.open(ConfirmDialogComponent, {
            data: { title: 'Delete task', message: `Delete "${task.title}"?` }
        });
        ref.afterClosed().subscribe((confirmed) => {
            if (!confirmed) return;
            this.taskService.deleteTask(task.id).subscribe({
                next: () => {
                    this.snackBar.open('Task deleted', 'Dismiss', { duration: 2000 });
                    this.loadTasks();
                },
                error: () => this.snackBar.open('Failed to delete task', 'Dismiss', { duration: 3000 })
            });
        });
    }

    getStatusColor(status: TaskStatus): string {
        switch (status) {
            case TaskStatus.Todo: return 'default';
            case TaskStatus.InProgress: return 'accent';
            case TaskStatus.Done: return 'primary';
        }
    }

    getPriorityColor(priority: TaskPriority): string {
        switch (priority) {
            case TaskPriority.High: return 'warn';
            case TaskPriority.Medium: return 'accent';
            case TaskPriority.Low: return 'primary';
        }
    }
}
