import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { map, take } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
    const authService = inject(AuthService);

    return authService.isAuthenticated$.pipe(
        take(1),
        map((isAuthenticated) => {
            if (isAuthenticated) return true;
            authService.login();
            return false;
        })
    );
};
