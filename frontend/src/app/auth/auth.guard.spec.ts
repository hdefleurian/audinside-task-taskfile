import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

const runGuard = () =>
    TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

describe('authGuard', () => {
    let authService: { isAuthenticated$: ReturnType<typeof of>; login: jest.Mock };

    beforeEach(() => {
        authService = {
            isAuthenticated$: of(true),
            login: jest.fn()
        };

        TestBed.configureTestingModule({
            providers: [{ provide: AuthService, useValue: authService }]
        });
    });

    afterEach(() => jest.clearAllMocks());

    it('should return true when authenticated', (done) => {
        authService.isAuthenticated$ = of(true);
        (runGuard() as ReturnType<typeof of>).subscribe((result) => {
            expect(result).toBe(true);
            expect(authService.login).not.toHaveBeenCalled();
            done();
        });
    });

    it('should return false and call login() when not authenticated', (done) => {
        authService.isAuthenticated$ = of(false);
        (runGuard() as ReturnType<typeof of>).subscribe((result) => {
            expect(result).toBe(false);
            expect(authService.login).toHaveBeenCalled();
            done();
        });
    });
});
