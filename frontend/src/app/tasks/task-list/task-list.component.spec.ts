import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { TaskListComponent } from './task-list.component';
import { TaskService } from '../task.service';
import { TaskStatus, TaskPriority, PagedResult, TaskItem } from '../task.model';

const mockTask: TaskItem = {
    id: 'abc-123',
    title: 'Test Task',
    description: null,
    status: TaskStatus.Todo,
    priority: TaskPriority.Medium,
    dueDate: null,
    assignee: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};

const emptyPaged: PagedResult<TaskItem> = { items: [], totalCount: 0, page: 1, pageSize: 20 };
const pagedWithTask: PagedResult<TaskItem> = { items: [mockTask], totalCount: 1, page: 1, pageSize: 20 };

const mockTaskService = {
    getTasks: jest.fn(() => of(emptyPaged)),
    deleteTask: jest.fn(() => of(void 0))
};

const mockSnackBar = { open: jest.fn() };
const mockDialog = { open: jest.fn(() => ({ afterClosed: () => of(false) })) };

describe('TaskListComponent', () => {
    let fixture: ComponentFixture<TaskListComponent>;
    let component: TaskListComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TaskListComponent, NoopAnimationsModule],
            providers: [
                provideRouter([]),
                { provide: TaskService, useValue: mockTaskService }
            ]
        })
            .overrideComponent(TaskListComponent, {
                add: {
                    providers: [
                        { provide: MatSnackBar, useValue: mockSnackBar },
                        { provide: MatDialog, useValue: mockDialog }
                    ]
                }
            })
            .compileComponents();

        fixture = TestBed.createComponent(TaskListComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => jest.clearAllMocks());

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should call getTasks on init', () => {
        fixture.detectChanges();
        expect(mockTaskService.getTasks).toHaveBeenCalled();
    });

    it('should render tasks when loaded', () => {
        mockTaskService.getTasks.mockReturnValue(of(pagedWithTask));
        fixture.detectChanges();
        expect(component.tasks()).toHaveLength(1);
        expect(component.totalCount()).toBe(1);
    });

    it('should show snackbar error when getTasks fails', () => {
        mockTaskService.getTasks.mockReturnValue(throwError(() => new Error('fail')));
        fixture.detectChanges();
        expect(mockSnackBar.open).toHaveBeenCalledWith('Failed to load tasks', 'Dismiss', expect.any(Object));
    });

    it('onSearch() should reset page to 0 and reload', () => {
        fixture.detectChanges();
        component.currentPage.set(3);
        jest.clearAllMocks();
        component.onSearch();
        expect(component.currentPage()).toBe(0);
        expect(mockTaskService.getTasks).toHaveBeenCalled();
    });

    it('onFilterChange() should reset page to 0 and reload', () => {
        fixture.detectChanges();
        component.currentPage.set(2);
        jest.clearAllMocks();
        component.onFilterChange();
        expect(component.currentPage()).toBe(0);
        expect(mockTaskService.getTasks).toHaveBeenCalled();
    });

    it('clearFilters() should clear all filter signals and reload', () => {
        fixture.detectChanges();
        component.searchText.set('hello');
        component.selectedStatus.set(TaskStatus.Done);
        component.selectedPriority.set(TaskPriority.High);
        jest.clearAllMocks();
        component.clearFilters();
        expect(component.searchText()).toBe('');
        expect(component.selectedStatus()).toBe('');
        expect(component.selectedPriority()).toBe('');
        expect(mockTaskService.getTasks).toHaveBeenCalled();
    });

    it('deleteTask() should open confirm dialog', () => {
        fixture.detectChanges();
        component.deleteTask(mockTask);
        expect(mockDialog.open).toHaveBeenCalled();
    });

    it('deleteTask() should call deleteTask service when confirmed', () => {
        mockDialog.open.mockReturnValueOnce({ afterClosed: () => of(true) });
        fixture.detectChanges();
        component.deleteTask(mockTask);
        expect(mockTaskService.deleteTask).toHaveBeenCalledWith(mockTask.id);
    });

    it('deleteTask() should NOT call deleteTask service when cancelled', () => {
        fixture.detectChanges();
        component.deleteTask(mockTask);
        expect(mockTaskService.deleteTask).not.toHaveBeenCalled();
    });
});
