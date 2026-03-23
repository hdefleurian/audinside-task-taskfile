import { Injectable, inject } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly oidc = inject(OidcSecurityService);

    readonly isAuthenticated$: Observable<boolean> = this.oidc.isAuthenticated$.pipe(
        map(({ isAuthenticated }) => isAuthenticated)
    );

    readonly userData$ = this.oidc.userData$;

    login(): void {
        this.oidc.authorize();
    }

    logout(): void {
        this.oidc.logoff().subscribe();
    }

    getAccessToken(): Observable<string> {
        return this.oidc.getAccessToken();
    }
}
