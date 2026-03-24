import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: 'tasks', pathMatch: 'full' },
    {
        path: 'tasks',
        canActivate: [authGuard],
        children: [
            {
                path: '',
                loadComponent: () =>
                    import('./tasks/task-list/task-list.component').then((m) => m.TaskListComponent)
            },
            {
                path: 'new',
                loadComponent: () =>
                    import('./tasks/task-form/task-form.component').then((m) => m.TaskFormComponent)
            },
            {
                path: ':id',
                loadComponent: () =>
                    import('./tasks/task-detail/task-detail.component').then((m) => m.TaskDetailComponent)
            },
            {
                path: ':id/edit',
                loadComponent: () =>
                    import('./tasks/task-form/task-form.component').then((m) => m.TaskFormComponent)
            }
        ]
    },
    { path: '**', redirectTo: 'tasks' }
];
