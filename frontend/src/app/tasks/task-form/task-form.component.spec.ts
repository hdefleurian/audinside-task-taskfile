import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { TaskFormComponent } from './task-form.component';
import { TaskService } from '../task.service';
import { TaskStatus, TaskPriority, TaskItem } from '../task.model';

const mockTask: TaskItem = {
    id: 'form-123',
    title: 'Existing Task',
    description: 'Existing description',
    status: TaskStatus.InProgress,
    priority: TaskPriority.High,
    dueDate: null,
    assignee: 'bob',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};

const createdTask: TaskItem = { ...mockTask, id: 'new-456', title: 'New Task' };

const mockTaskService = {
    getTask: jest.fn(() => of(mockTask)),
    createTask: jest.fn(() => of(createdTask)),
    updateTask: jest.fn(() => of(mockTask))
};

const mockSnackBar = { open: jest.fn() };

const createComponent = (params: Record<string, string | null> = {}) => {
    TestBed.configureTestingModule({
        imports: [TaskFormComponent, NoopAnimationsModule],
        providers: [
            provideRouter([]),
            {
                provide: ActivatedRoute,
                useValue: { snapshot: { paramMap: { get: (key: string) => params[key] ?? null } } }
            },
            { provide: TaskService, useValue: mockTaskService }
        ]
    })
        .overrideComponent(TaskFormComponent, {
            add: { providers: [{ provide: MatSnackBar, useValue: mockSnackBar }] }
        })
        .compileComponents();

    const fixture: ComponentFixture<TaskFormComponent> = TestBed.createComponent(TaskFormComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
};

describe('TaskFormComponent — create mode', () => {
    afterEach(() => {
        jest.clearAllMocks();
        TestBed.resetTestingModule();
    });

    it('should create', () => {
        const { component } = createComponent();
        expect(component).toBeTruthy();
    });

    it('should be in create mode when no route id', () => {
        const { component } = createComponent();
        expect(component.isEdit()).toBe(false);
    });

    it('should have form invalid when title is empty', () => {
        const { component } = createComponent();
        component.form.get('title')!.setValue('');
        expect(component.form.invalid).toBe(true);
    });

    it('should have form valid with a title', () => {
        const { component } = createComponent();
        component.form.get('title')!.setValue('My Task');
        expect(component.form.valid).toBe(true);
    });

    it('should call createTask on valid submit', () => {
        const { component } = createComponent();
        component.form.get('title')!.setValue('My Task');
        component.onSubmit();
        expect(mockTaskService.createTask).toHaveBeenCalledWith(
            expect.objectContaining({ title: 'My Task' })
        );
    });

    it('should not call createTask when form is invalid', () => {
        const { component } = createComponent();
        component.form.get('title')!.setValue('');
        component.onSubmit();
        expect(mockTaskService.createTask).not.toHaveBeenCalled();
    });

    it('should show error snackbar when createTask fails', () => {
        mockTaskService.createTask.mockReturnValue(throwError(() => new Error('fail')));
        const { component } = createComponent();
        component.form.get('title')!.setValue('My Task');
        component.onSubmit();
        expect(mockSnackBar.open).toHaveBeenCalledWith('Failed to save task', 'Dismiss', expect.any(Object));
    });

    it('should enforce maxLength(200) on title', () => {
        const { component } = createComponent();
        component.form.get('title')!.setValue('a'.repeat(201));
        expect(component.form.get('title')!.invalid).toBe(true);
    });
});

describe('TaskFormComponent — edit mode', () => {
    afterEach(() => {
        jest.clearAllMocks();
        TestBed.resetTestingModule();
    });

    it('should be in edit mode when route id is present', () => {
        const { component } = createComponent({ id: 'form-123' });
        expect(component.isEdit()).toBe(true);
    });

    it('should load and pre-fill the form with existing task data', () => {
        const { component } = createComponent({ id: 'form-123' });
        expect(component.form.get('title')!.value).toBe(mockTask.title);
        expect(component.form.get('status')!.value).toBe(mockTask.status);
    });

    it('should call updateTask on valid submit in edit mode', () => {
        const { component } = createComponent({ id: 'form-123' });
        component.form.get('title')!.setValue('Updated Title');
        component.onSubmit();
        expect(mockTaskService.updateTask).toHaveBeenCalledWith(
            'form-123',
            expect.objectContaining({ title: 'Updated Title' })
        );
    });
});
