import { test as setup, expect } from "@playwright/test";
import env from "../utils/env";

const authFile = "playwright/.auth/user.json";

setup("authenticate", async ({ page }) => {
  // Perform authentication steps. Replace these actions with your own.
  await page.goto(env.require("APP_URL"));

  await page.fill('input[name="username"]', "test");
  await page.fill('input[name="password"]', "Trustno1");
  await page.click('button:has-text("Submit")');

  await expect(page).toHaveTitle(/^Search/);

  await page.context().storageState({ path: authFile });
});
