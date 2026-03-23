import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
    CreateTaskRequest,
    PagedResult,
    TaskItem,
    TaskQueryParams,
    UpdateTaskRequest
} from './task.model';

@Injectable({ providedIn: 'root' })
export class TaskService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/tasks`;

    getTasks(query: TaskQueryParams = {}): Observable<PagedResult<TaskItem>> {
        let params = new HttpParams();
        if (query.status) params = params.set('status', query.status);
        if (query.priority) params = params.set('priority', query.priority);
        if (query.search) params = params.set('search', query.search);
        if (query.sortBy) params = params.set('sortBy', query.sortBy);
        if (query.sortDirection) params = params.set('sortDirection', query.sortDirection);
        if (query.page != null) params = params.set('page', String(query.page));
        if (query.pageSize != null) params = params.set('pageSize', String(query.pageSize));
        return this.http.get<PagedResult<TaskItem>>(this.baseUrl, { params });
    }

    getTask(id: string): Observable<TaskItem> {
        return this.http.get<TaskItem>(`${this.baseUrl}/${id}`);
    }

    createTask(request: CreateTaskRequest): Observable<TaskItem> {
        return this.http.post<TaskItem>(this.baseUrl, request);
    }

    updateTask(id: string, request: UpdateTaskRequest): Observable<TaskItem> {
        return this.http.put<TaskItem>(`${this.baseUrl}/${id}`, request);
    }

    deleteTask(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}
