import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

import { TaskService } from '../task.service';
import {
    TaskItem,
    TaskStatus,
    TaskPriority,
    TASK_STATUS_LABELS,
    TASK_PRIORITY_LABELS
} from '../task.model';

@Component({
    selector: 'app-task-form',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatButtonModule,
        MatCardModule,
        MatSnackBarModule,
        MatProgressSpinnerModule,
        MatIconModule
    ],
    templateUrl: './task-form.component.html',
    styleUrls: ['./task-form.component.scss']
})
export class TaskFormComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly taskService = inject(TaskService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly snackBar = inject(MatSnackBar);

    readonly taskStatuses = Object.values(TaskStatus);
    readonly taskPriorities = Object.values(TaskPriority);
    readonly statusLabels = TASK_STATUS_LABELS;
    readonly priorityLabels = TASK_PRIORITY_LABELS;

    form!: FormGroup;
    isEdit = signal(false);
    loading = signal(false);
    saving = signal(false);
    taskId = signal<string | null>(null);

    ngOnInit(): void {
        this.form = this.fb.group({
            title: ['', [Validators.required, Validators.maxLength(200)]],
            description: ['', Validators.maxLength(2000)],
            status: [TaskStatus.Todo, Validators.required],
            priority: [TaskPriority.Medium, Validators.required],
            dueDate: [null],
            assignee: ['', Validators.maxLength(200)]
        });

        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.isEdit.set(true);
            this.taskId.set(id);
            this.loadTask(id);
        }
    }

    private loadTask(id: string): void {
        this.loading.set(true);
        this.taskService.getTask(id).subscribe({
            next: (task: TaskItem) => {
                this.form.patchValue({
                    title: task.title,
                    description: task.description ?? '',
                    status: task.status,
                    priority: task.priority,
                    dueDate: task.dueDate ? new Date(task.dueDate) : null,
                    assignee: task.assignee ?? ''
                });
                this.loading.set(false);
            },
            error: () => {
                this.snackBar.open('Failed to load task', 'Dismiss', { duration: 3000 });
                this.router.navigate(['/tasks']);
            }
        });
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        this.saving.set(true);
        const value = this.form.value;
        const payload = {
            title: value.title,
            description: value.description || null,
            status: value.status,
            priority: value.priority,
            dueDate: value.dueDate ? (value.dueDate as Date).toISOString() : null,
            assignee: value.assignee || null
        };

        const request$ = this.isEdit()
            ? this.taskService.updateTask(this.taskId()!, payload)
            : this.taskService.createTask(payload);

        request$.subscribe({
            next: (task) => {
                this.snackBar.open(
                    this.isEdit() ? 'Task updated' : 'Task created',
                    'Dismiss',
                    { duration: 2000 }
                );
                this.router.navigate(['/tasks', task.id]);
            },
            error: () => {
                this.snackBar.open('Failed to save task', 'Dismiss', { duration: 3000 });
                this.saving.set(false);
            }
        });
    }

    onCancel(): void {
        if (this.isEdit()) {
            this.router.navigate(['/tasks', this.taskId()]);
        } else {
            this.router.navigate(['/tasks']);
        }
    }
}
