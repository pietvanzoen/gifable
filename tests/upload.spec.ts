import { test, expect } from "@playwright/test";

test("can upload file via URL and set labels and alt text", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Add" }).click();

  await expect(page).toHaveTitle(/^Upload/);

  await page.getByLabel("URL").fill("https://gfbl.club/piet/shipit.jpeg");
  const filename = `shipit-${Date.now()}.jpeg`;
  await page.getByLabel("Filename").clear();
  await page.getByLabel("Filename").fill(filename);

  await page.getByRole("button", { name: /upload/i }).click();

  await expect(page).toHaveTitle(new RegExp(`Edit.*${filename}`));

  await page.fill('textarea[name="labels"]', "e2e-test, shipit");
  await page.fill(
    'textarea[name="altText"]',
    "This shouldn't break production"
  );

  await page.getByRole("button", { name: /save/i }).click();

  await expect(page).toHaveTitle(new RegExp(`^${filename}`));

  await expect(page.getByTestId("labels")).toHaveText("e2e-test, shipit");
  await expect(page.getByTestId("alt-text")).toHaveText(
    "This shouldn't break production"
  );
});
