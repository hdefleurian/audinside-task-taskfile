import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { TaskDetailComponent } from './task-detail.component';
import { TaskService } from '../task.service';
import { TaskStatus, TaskPriority, TaskItem } from '../task.model';

const mockTask: TaskItem = {
    id: 'abc-123',
    title: 'Detail Task',
    description: 'Some description',
    status: TaskStatus.InProgress,
    priority: TaskPriority.High,
    dueDate: null,
    assignee: 'alice',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};

const mockTaskService = {
    getTask: jest.fn(() => of(mockTask)),
    deleteTask: jest.fn(() => of(void 0))
};

const mockSnackBar = { open: jest.fn() };
const mockDialog = { open: jest.fn(() => ({ afterClosed: () => of(false) })) };

describe('TaskDetailComponent', () => {
    let fixture: ComponentFixture<TaskDetailComponent>;
    let component: TaskDetailComponent;

    const createComponent = (taskId = 'abc-123') => {
        TestBed.configureTestingModule({
            imports: [TaskDetailComponent, NoopAnimationsModule],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { paramMap: { get: () => taskId } } }
                },
                { provide: TaskService, useValue: mockTaskService }
            ]
        })
            .overrideComponent(TaskDetailComponent, {
                add: {
                    providers: [
                        { provide: MatSnackBar, useValue: mockSnackBar },
                        { provide: MatDialog, useValue: mockDialog }
                    ]
                }
            })
            .compileComponents();

        fixture = TestBed.createComponent(TaskDetailComponent);
        component = fixture.componentInstance;
    };

    afterEach(() => {
        jest.clearAllMocks();
        TestBed.resetTestingModule();
    });

    it('should create', async () => {
        createComponent();
        expect(component).toBeTruthy();
    });

    it('should load and display task on init', () => {
        createComponent();
        fixture.detectChanges();
        expect(mockTaskService.getTask).toHaveBeenCalledWith('abc-123');
        expect(component.task()).toEqual(mockTask);
        expect(component.loading()).toBe(false);
    });

    it('should show snackbar and navigate to list on load error', () => {
        mockTaskService.getTask.mockReturnValueOnce(throwError(() => new Error('not found')));
        createComponent();
        fixture.detectChanges();
        expect(mockSnackBar.open).toHaveBeenCalledWith('Task not found', 'Dismiss', expect.any(Object));
    });

    it('deleteTask() should open confirm dialog', () => {
        createComponent();
        fixture.detectChanges();
        component.deleteTask();
        expect(mockDialog.open).toHaveBeenCalled();
    });

    it('deleteTask() should delete and navigate when confirmed', () => {
        mockDialog.open.mockReturnValueOnce({ afterClosed: () => of(true) });
        createComponent();
        fixture.detectChanges();
        component.deleteTask();
        expect(mockTaskService.deleteTask).toHaveBeenCalledWith(mockTask.id);
    });

    it('deleteTask() should NOT delete when cancelled', () => {
        createComponent();
        fixture.detectChanges();
        component.deleteTask();
        expect(mockTaskService.deleteTask).not.toHaveBeenCalled();
    });

    it('deleteTask() should do nothing when task is null', () => {
        createComponent();
        // Do not call fixture.detectChanges() so task stays null
        component.deleteTask();
        expect(mockDialog.open).not.toHaveBeenCalled();
    });
});
