import { TestBed } from '@angular/core/testing';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { of } from 'rxjs';
import { AuthService } from './auth.service';

const mockOidc = {
    isAuthenticated$: of({ isAuthenticated: true }),
    userData$: of({ sub: 'user1' }),
    authorize: jest.fn(),
    logoff: jest.fn(() => of(void 0)),
    getAccessToken: jest.fn(() => of('token123'))
};

describe('AuthService', () => {
    let service: AuthService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                AuthService,
                { provide: OidcSecurityService, useValue: mockOidc }
            ]
        });
        service = TestBed.inject(AuthService);
    });

    afterEach(() => jest.clearAllMocks());

    it('should expose isAuthenticated$ mapping to boolean', (done) => {
        service.isAuthenticated$.subscribe((val) => {
            expect(val).toBe(true);
            done();
        });
    });

    it('should call oidc.authorize() when login() is invoked', () => {
        service.login();
        expect(mockOidc.authorize).toHaveBeenCalled();
    });

    it('should call oidc.logoff() when logout() is invoked', () => {
        service.logout();
        expect(mockOidc.logoff).toHaveBeenCalled();
    });

    it('should return access token from getAccessToken()', (done) => {
        service.getAccessToken().subscribe((token) => {
            expect(token).toBe('token123');
            done();
        });
    });
});
