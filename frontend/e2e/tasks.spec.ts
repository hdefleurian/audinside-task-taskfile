import { test, expect, Page } from '@playwright/test';

// These tests assume Docker Compose is running with all services.
// They connect to the full stack: Angular frontend → .NET backend → PostgreSQL.
// Keycloak login is performed for authenticated flows.

const APP_URL = 'http://localhost:4200';
const KEYCLOAK_URL = 'http://localhost:8080';
const TEST_USER = { username: 'testuser', password: 'Test1234!' };

async function login(page: Page): Promise<void> {
    await page.goto(APP_URL);

    // Wait for Keycloak redirect
    await page.waitForURL(/localhost:8080/, { timeout: 10_000 });

    await page.locator('#username').fill(TEST_USER.username);
    await page.locator('#password').fill(TEST_USER.password);
    await page.locator('#kc-login').click();

    // Wait for redirect back to the app
    await page.waitForURL(`${APP_URL}/**`, { timeout: 15_000 });
    await expect(page.locator('mat-toolbar')).toBeVisible();
}

test.describe('Authentication', () => {
    test('redirects to Keycloak login when unauthenticated', async ({ page }) => {
        await page.goto(`${APP_URL}/tasks`);
        await page.waitForURL(/localhost:8080/, { timeout: 10_000 });
        await expect(page.locator('#username')).toBeVisible();
    });

    test('user can log in and see the toolbar', async ({ page }) => {
        await login(page);
        await expect(page.locator('mat-toolbar')).toBeVisible();
    });
});

test.describe('Task Management', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
        await page.goto(`${APP_URL}/tasks`);
    });

    test('task list page loads', async ({ page }) => {
        await expect(page.locator('h2, h1')).toContainText(/tasks/i);
    });

    test('can create a new task', async ({ page }) => {
        await page.getByRole('link', { name: /new task/i }).click();
        await page.waitForURL('**/tasks/new');

        const title = `E2E Task ${Date.now()}`;
        await page.locator('[formControlName="title"]').fill(title);
        await page.locator('[formControlName="description"]').fill('Created by Playwright');

        await page.getByRole('button', { name: /save/i }).click();

        // Should navigate back to list or detail
        await page.waitForURL(/\/tasks(\/[^/]+)?$/, { timeout: 10_000 });
        await expect(page.getByText(title)).toBeVisible();
    });

    test('can view task detail', async ({ page }) => {
        // Create a task first to ensure at least one exists
        const title = `Detail Task ${Date.now()}`;
        await page.getByRole('link', { name: /new task/i }).click();
        await page.locator('[formControlName="title"]').fill(title);
        await page.getByRole('button', { name: /save/i }).click();
        await page.waitForURL(/\/tasks(\/[^/]+)?$/, { timeout: 10_000 });

        // Navigate to the detail from the list
        await page.goto(`${APP_URL}/tasks`);
        await page.getByText(title).click();
        await page.waitForURL(/\/tasks\/[^/]+$/, { timeout: 5_000 });

        await expect(page.getByText(title)).toBeVisible();
    });

    test('can edit an existing task', async ({ page }) => {
        // Create task to edit
        const originalTitle = `Edit Task ${Date.now()}`;
        await page.getByRole('link', { name: /new task/i }).click();
        await page.locator('[formControlName="title"]').fill(originalTitle);
        await page.getByRole('button', { name: /save/i }).click();
        await page.waitForURL(/\/tasks(\/[^/]+)?$/, { timeout: 10_000 });

        // Find and open the task
        await page.goto(`${APP_URL}/tasks`);
        await page.getByText(originalTitle).click();
        await page.waitForURL(/\/tasks\/[^/]+$/);

        // Click edit
        await page.getByRole('button', { name: /edit/i }).click();
        await page.waitForURL(/\/tasks\/[^/]+\/edit$/);

        // Change the title
        const updatedTitle = `Updated ${originalTitle}`;
        const titleInput = page.locator('[formControlName="title"]');
        await titleInput.clear();
        await titleInput.fill(updatedTitle);
        await page.getByRole('button', { name: /save/i }).click();

        await page.waitForURL(/\/tasks(\/[^/]+)?$/, { timeout: 10_000 });
        await expect(page.getByText(updatedTitle)).toBeVisible();
    });

    test('can delete a task', async ({ page }) => {
        // Create task to delete
        const title = `Delete Task ${Date.now()}`;
        await page.getByRole('link', { name: /new task/i }).click();
        await page.locator('[formControlName="title"]').fill(title);
        await page.getByRole('button', { name: /save/i }).click();
        await page.waitForURL(/\/tasks(\/[^/]+)?$/, { timeout: 10_000 });

        // Open the task
        await page.goto(`${APP_URL}/tasks`);
        await page.getByText(title).click();
        await page.waitForURL(/\/tasks\/[^/]+$/);

        // Set up dialog handler before clicking delete
        page.once('dialog', dialog => dialog.accept());
        await page.getByRole('button', { name: /delete/i }).click();

        // Should navigate back to task list
        await page.waitForURL(`${APP_URL}/tasks`, { timeout: 10_000 });
        await expect(page.getByText(title)).not.toBeVisible();
    });
});
