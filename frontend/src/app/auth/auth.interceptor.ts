import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { switchMap, take } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);

    // Only attach token for API calls
    if (!req.url.includes('/api/')) {
        return next(req);
    }

    return authService.getAccessToken().pipe(
        take(1),
        switchMap((token) => {
            if (!token) return next(req);
            const authReq = req.clone({
                setHeaders: { Authorization: `Bearer ${token}` }
            });
            return next(authReq);
        })
    );
};
