export const environment = {
    production: false,
    apiUrl: '/api',
    keycloak: {
        authority: 'http://localhost:8080/realms/taskapp',
        clientId: 'taskapp-frontend',
        redirectUrl: 'http://localhost:4200',
        postLogoutRedirectUri: 'http://localhost:4200',
        scope: 'openid profile email'
    }
};
