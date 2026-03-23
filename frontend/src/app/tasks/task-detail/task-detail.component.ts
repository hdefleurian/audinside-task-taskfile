import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { TaskService } from '../task.service';
import {
    TaskItem,
    TaskStatus,
    TaskPriority,
    TASK_STATUS_LABELS,
    TASK_PRIORITY_LABELS
} from '../task.model';

@Component({
    selector: 'app-task-detail',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatDividerModule,
        MatProgressSpinnerModule,
        MatSnackBarModule
    ],
    templateUrl: './task-detail.component.html',
    styleUrls: ['./task-detail.component.scss']
})
export class TaskDetailComponent implements OnInit {
    private readonly taskService = inject(TaskService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly snackBar = inject(MatSnackBar);

    readonly statusLabels = TASK_STATUS_LABELS;
    readonly priorityLabels = TASK_PRIORITY_LABELS;

    task = signal<TaskItem | null>(null);
    loading = signal(true);

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id')!;
        this.taskService.getTask(id).subscribe({
            next: (t) => {
                this.task.set(t);
                this.loading.set(false);
            },
            error: () => {
                this.snackBar.open('Task not found', 'Dismiss', { duration: 3000 });
                this.router.navigate(['/tasks']);
            }
        });
    }

    deleteTask(): void {
        const t = this.task();
        if (!t) return;
        if (!confirm(`Delete "${t.title}"?`)) return;
        this.taskService.deleteTask(t.id).subscribe({
            next: () => {
                this.snackBar.open('Task deleted', 'Dismiss', { duration: 2000 });
                this.router.navigate(['/tasks']);
            },
            error: () => this.snackBar.open('Failed to delete task', 'Dismiss', { duration: 3000 })
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
