import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TaskService } from './task.service';
import { TaskItem, TaskStatus, TaskPriority, PagedResult } from './task.model';

const baseUrl = '/api/tasks';

const mockTask: TaskItem = {
    id: '1',
    title: 'Test Task',
    description: 'Description',
    status: TaskStatus.Todo,
    priority: TaskPriority.Medium,
    dueDate: null,
    assignee: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

const mockPaged: PagedResult<TaskItem> = {
    items: [mockTask],
    totalCount: 1,
    page: 1,
    pageSize: 20,
};

describe('TaskService', () => {
    let service: TaskService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                TaskService,
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });
        service = TestBed.inject(TaskService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    describe('getTasks', () => {
        it('should GET /api/tasks and return paged result', () => {
            service.getTasks({}).subscribe(result => {
                expect(result.items).toHaveLength(1);
                expect(result.totalCount).toBe(1);
            });

            const req = http.expectOne(r => r.url === baseUrl);
            expect(req.request.method).toBe('GET');
            req.flush(mockPaged);
        });

        it('should pass query params when provided', () => {
            service.getTasks({ status: TaskStatus.Todo, page: 2, pageSize: 10 }).subscribe();

            const req = http.expectOne(r => r.url === baseUrl);
            expect(req.request.params.get('status')).toBe('Todo');
            expect(req.request.params.get('page')).toBe('2');
            expect(req.request.params.get('pageSize')).toBe('10');
            req.flush(mockPaged);
        });

        it('should not include undefined params', () => {
            service.getTasks({}).subscribe();
            const req = http.expectOne(r => r.url === baseUrl);
            expect(req.request.params.keys()).toHaveLength(0);
            req.flush(mockPaged);
        });
    });

    describe('getTask', () => {
        it('should GET /api/tasks/{id}', () => {
            service.getTask('1').subscribe(task => expect(task.title).toBe('Test Task'));

            const req = http.expectOne(`${baseUrl}/1`);
            expect(req.request.method).toBe('GET');
            req.flush(mockTask);
        });
    });

    describe('createTask', () => {
        it('should POST /api/tasks with body and return created task', () => {
            const payload = { title: 'New Task', status: TaskStatus.Todo, priority: TaskPriority.High };
            service.createTask(payload).subscribe(task => expect(task.title).toBe('Test Task'));

            const req = http.expectOne(baseUrl);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(payload);
            req.flush(mockTask);
        });
    });

    describe('updateTask', () => {
        it('should PUT /api/tasks/{id} with partial update', () => {
            const patch = { title: 'Updated' };
            service.updateTask('1', patch).subscribe(task => expect(task).toBeTruthy());

            const req = http.expectOne(`${baseUrl}/1`);
            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toEqual(patch);
            req.flush({ ...mockTask, ...patch });
        });
    });

    describe('deleteTask', () => {
        it('should DELETE /api/tasks/{id}', () => {
            service.deleteTask('1').subscribe();

            const req = http.expectOne(`${baseUrl}/1`);
            expect(req.request.method).toBe('DELETE');
            req.flush(null);
        });
    });
});
