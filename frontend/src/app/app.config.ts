import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideAuth, withAppInitializerAuthCheck } from 'angular-auth-oidc-client';

import { routes } from './app.routes';
import { authInterceptor } from './auth/auth.interceptor';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideAnimationsAsync(),
        provideAuth({
            config: {
                authority: environment.keycloak.authority,
                redirectUrl: environment.keycloak.redirectUrl,
                postLogoutRedirectUri: environment.keycloak.postLogoutRedirectUri,
                clientId: environment.keycloak.clientId,
                scope: environment.keycloak.scope,
                responseType: 'code',
                silentRenew: true,
                useRefreshToken: true,
                renewTimeBeforeTokenExpiresInSeconds: 30,
                secureRoutes: ['/api/']
            }
        }),
        withAppInitializerAuthCheck()
    ]
};
