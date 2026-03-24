export const environment = {
    production: true,
    apiUrl: '/api',
    keycloak: {
        authority: '${KEYCLOAK_AUTHORITY}',
        clientId: 'taskapp-frontend',
        redirectUrl: '${APP_URL}',
        postLogoutRedirectUri: '${APP_URL}',
        scope: 'openid profile email'
    }
};
