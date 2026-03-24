import { TestBed } from '@angular/core/testing';
import {
    HttpTestingController,
    provideHttpClientTesting
} from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { of } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { TaskService } from '../tasks/task.service';

const mockAuthService = {
    getAccessToken: jest.fn(() => of('mock-token'))
};

describe('authInterceptor', () => {
    let http: HttpTestingController;
    let taskService: TaskService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptors([authInterceptor])),
                provideHttpClientTesting(),
                { provide: AuthService, useValue: mockAuthService },
                TaskService
            ]
        });
        http = TestBed.inject(HttpTestingController);
        taskService = TestBed.inject(TaskService);
    });

    afterEach(() => {
        http.verify();
        jest.clearAllMocks();
    });

    it('should attach Authorization header for /api/ requests', () => {
        taskService.getTasks({}).subscribe();
        const req = http.expectOne((r) => r.url.includes('/api/tasks'));
        expect(req.request.headers.get('Authorization')).toBe('Bearer mock-token');
        req.flush({ items: [], totalCount: 0, page: 1, pageSize: 20 });
    });

    it('should call getAccessToken for /api/ requests', () => {
        taskService.getTasks({}).subscribe();
        http.expectOne((r) => r.url.includes('/api/tasks')).flush({
            items: [], totalCount: 0, page: 1, pageSize: 20
        });
        expect(mockAuthService.getAccessToken).toHaveBeenCalled();
    });
});
