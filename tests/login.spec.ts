import { test, expect } from "@playwright/test";

test("can log in", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000");

  await expect(page).toHaveTitle(/^Login/);

  await page.fill('input[name="username"]', "test");
  await page.fill('input[name="password"]', "Trustno1");
  await page.click('button:has-text("Submit")');

  await expect(page).toHaveTitle(/^Search/);
});
