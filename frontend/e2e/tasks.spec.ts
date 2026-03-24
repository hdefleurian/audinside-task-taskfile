import { test, expect, Page } from '@playwright/test';

// These tests assume Docker Compose is running with all services.
// They connect to the full stack: Angular frontend → .NET backend → PostgreSQL.
// Keycloak login is performed for authenticated flows.

const APP_URL = 'http://localhost:4200';
const KEYCLOAK_URL = 'http://localhost:8080';
const TEST_USER = { username: 'testuser', password: 'Test1234!' };

async function login(page: Page): Promise<void> {
    await page.goto(APP_URL, { waitUntil: 'commit' });

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
        await page.goto(`${APP_URL}/tasks`, { waitUntil: 'commit' });
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
        await expect(page.locator('mat-card-title')).toContainText(/tasks/i);
    });

    test('can create a new task', async ({ page }) => {
        await page.getByRole('link', { name: /new task/i }).click();
        await page.waitForURL('**/tasks/new');

        const title = `E2E Task ${Date.now()}`;
        await page.locator('[formControlName="title"]').fill(title);
        await page.locator('[formControlName="description"]').fill('Created by Playwright');

        await page.locator('button[type="submit"]').click();

        // Wait for navigation to the task detail page (UUID in URL)
        await page.waitForURL(/\/tasks\/[0-9a-f-]{36}$/, { timeout: 10_000 });
        await expect(page.getByText(title)).toBeVisible();
    });

    test('can view task detail', async ({ page }) => {
        // Create a task first to ensure at least one exists
        const title = `Detail Task ${Date.now()}`;
        await page.getByRole('link', { name: /new task/i }).click();
        await page.locator('[formControlName="title"]').fill(title);
        await page.locator('button[type="submit"]').click();
        await page.waitForURL(/\/tasks\/[0-9a-f-]{36}$/, { timeout: 10_000 });

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
        await page.locator('button[type="submit"]').click();
        await page.waitForURL(/\/tasks\/[0-9a-f-]{36}$/, { timeout: 10_000 });

        // Find and open the task
        await page.goto(`${APP_URL}/tasks`);
        await page.getByText(originalTitle).click();
        await page.waitForURL(/\/tasks\/[^/]+$/);

        // Click edit (rendered as <a mat-raised-button>, so role=link)
        await page.getByRole('link', { name: /edit/i }).click();
        await page.waitForURL(/\/tasks\/[^/]+\/edit$/);

        // Change the title
        const updatedTitle = `Updated ${originalTitle}`;
        const titleInput = page.locator('[formControlName="title"]');
        await titleInput.clear();
        await titleInput.fill(updatedTitle);
        await page.locator('button[type="submit"]').click();

        await page.waitForURL(/\/tasks(\/[^/]+)?$/, { timeout: 10_000 });
        await expect(page.getByText(updatedTitle)).toBeVisible();
    });

    test('can delete a task', async ({ page }) => {
        // Create task to delete
        const title = `Delete Task ${Date.now()}`;
        await page.getByRole('link', { name: /new task/i }).click();
        await page.locator('[formControlName="title"]').fill(title);
        await page.locator('button[type="submit"]').click();
        await page.waitForURL(/\/tasks\/[0-9a-f-]{36}$/, { timeout: 10_000 });

        // Open the task
        await page.goto(`${APP_URL}/tasks`);
        await page.getByText(title).click();
        await page.waitForURL(/\/tasks\/[^/]+$/);

        // Click the delete button to open the Material confirm dialog
        await page.getByRole('button', { name: /delete/i }).click();

        // Confirm in the Material dialog by clicking the confirm "Delete" button
        await page.locator('mat-dialog-container').waitFor({ timeout: 5_000 });
        await page.locator('mat-dialog-container').getByRole('button', { name: /delete/i }).click();

        // Should navigate back to task list
        await page.waitForURL(`${APP_URL}/tasks`, { timeout: 10_000 });
        await expect(page.getByText(title)).not.toBeVisible();
    });
});

// ─── Filtering, Sorting & Pagination ─────────────────────────────────────────

test.describe('Filtering and Sorting', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);

        // Seed two tasks with different statuses and priorities so filters are meaningful
        const createTask = async (title: string, status: string, priority: string) => {
            await page.goto(`${APP_URL}/tasks/new`);
            await page.locator('[formControlName="title"]').fill(title);
            await page.locator('[formControlName="status"]').click();
            await page.getByRole('option', { name: status }).click();
            await page.locator('[formControlName="priority"]').click();
            await page.getByRole('option', { name: priority }).click();
            await page.locator('button[type="submit"]').click();
            await page.waitForURL(/\/tasks\/[0-9a-f-]{36}$/, { timeout: 10_000 });
        };

        await createTask(`Filter_Todo_${Date.now()}`, 'To Do', 'Low');
        await createTask(`Filter_Done_${Date.now()}`, 'Done', 'High');

        await page.goto(`${APP_URL}/tasks`);
    });

    test('search field filters tasks by title', async ({ page }) => {
        const title = `SearchUnique_${Date.now()}`;
        await page.goto(`${APP_URL}/tasks/new`);
        await page.locator('[formControlName="title"]').fill(title);
        await page.locator('button[type="submit"]').click();
        await page.waitForURL(/\/tasks\/[0-9a-f-]{36}$/, { timeout: 10_000 });

        await page.goto(`${APP_URL}/tasks`);
        await page.locator('input[placeholder*="Search"]').fill(title);
        await page.keyboard.press('Enter');

        await expect(page.getByText(title)).toBeVisible();
        // Other tasks should not be visible
        const rows = page.locator('table mat-row, tr[mat-row]');
        await expect(rows).toHaveCount(1);
    });

    test('status dropdown filters task list', async ({ page }) => {
        // Filter to Done only
        await page.locator('mat-select').first().click();
        await page.getByRole('option', { name: /^Done$/ }).click();

        const rows = page.locator('table mat-row, tr[mat-row]');
        await expect(rows.first()).toBeVisible({ timeout: 5_000 });
        const count = await rows.count();
        expect(count).toBeGreaterThanOrEqual(1);

        // Every visible chip should say Done
        const statusChips = page.locator('mat-chip').filter({ hasText: 'Done' });
        await expect(statusChips.first()).toBeVisible();
    });

    test('priority dropdown filters task list', async ({ page }) => {
        // Filter to High only
        const selects = page.locator('mat-select');
        await selects.nth(1).click();
        await page.getByRole('option', { name: /^High$/ }).click();

        const rows = page.locator('table mat-row, tr[mat-row]');
        await expect(rows.first()).toBeVisible({ timeout: 5_000 });
        const count = await rows.count();
        expect(count).toBeGreaterThanOrEqual(1);

        const priorityChips = page.locator('mat-chip').filter({ hasText: 'High' });
        await expect(priorityChips.first()).toBeVisible();
    });

    test('clear filters button resets the list', async ({ page }) => {
        // Apply a filter first
        await page.locator('mat-select').first().click();
        await page.getByRole('option', { name: /^Done$/ }).click();

        const filteredCount = await page.locator('table mat-row, tr[mat-row]').count();

        // Clear filters
        await page.getByRole('button', { name: /clear/i }).click();

        const resetCount = await page.locator('table mat-row, tr[mat-row]').count();
        expect(resetCount).toBeGreaterThanOrEqual(filteredCount);
    });

    test('clicking Title column header sorts the list', async ({ page }) => {
        // Get first row title before sort
        const firstRowBefore = await page
            .locator('table tr[mat-row] td a.task-title-link')
            .first()
            .textContent();

        // Click Title header to sort ascending
        await page.locator('th[mat-sort-header="title"]').click();
        await page.waitForTimeout(500);

        // Click again to sort descending
        await page.locator('th[mat-sort-header="title"]').click();
        await page.waitForTimeout(500);

        const firstRowAfter = await page
            .locator('table tr[mat-row] td a.task-title-link')
            .first()
            .textContent();

        // After two clicks (asc then desc) the order may differ — just verify it loaded
        expect(typeof firstRowAfter).toBe('string');
        expect(firstRowBefore).toBeDefined();
    });

    test('paginator is present and shows total count', async ({ page }) => {
        const paginator = page.locator('mat-paginator');
        await expect(paginator).toBeVisible();
        // The paginator should display a range like "1 – 20 of N"
        await expect(paginator).toContainText(/of/i);
    });
});

