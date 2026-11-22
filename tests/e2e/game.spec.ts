import { test, expect, type Page } from "@playwright/test";
async function studioTab(page: Page, name: string) {
  const tab = page.getByRole("tab", { name, exact: false });
  if (await tab.isVisible()) await tab.click();
}
test("home, map locks, story, keyboard play and pause", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "조그만 친구와, 커다란 모험." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "모험 지도", exact: true }).click();
  await expect(page.locator('[data-level="1"]')).toBeDisabled();
  await page.locator('[data-level="0"]').click();
  await page.getByRole("button", { name: "이야기 건너뛰기" }).click();
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(600);
  await page.keyboard.up("ArrowRight");
  await expect(page.locator("#game-stars")).toHaveText("1");
  await page.getByRole("button", { name: "일시정지", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "잠깐, 쉬었다 갈까요?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "계속 여행하기" }).click();
  await expect(page.locator("#dialog")).not.toBeVisible();
  expect(errors).toEqual([]);
});
test("workshop creates, colors, undoes, persists and collects a friend", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "말랑이 작업실", exact: true })
    .click();
  await expect(page.locator("canvas.workshop-canvas")).toBeVisible();
  await page.getByRole("button", { name: "🐰 토끼", exact: true }).click();
  await studioTab(page, "꾸미기");
  await page.getByRole("button", { name: "민트 색", exact: true }).click();
  await studioTab(page, "저장");
  await page.locator("#name").fill("초록토끼");
  await page.locator("#save").click();
  await expect(page.locator("#gallery")).toContainText("초록토끼");
  await page.reload();
  await page
    .getByRole("button", { name: "말랑이 작업실", exact: true })
    .click();
  await studioTab(page, "저장");
  await expect(page.locator("#name")).toHaveValue("초록토끼");
  await studioTab(page, "모양");
  await expect(page.locator('[data-i="4"].shape')).toHaveClass(/selected/);
  await page.getByRole("button", { name: "🐻 곰돌이", exact: true }).click();
  await page.getByRole("button", { name: "↶ 되돌리기" }).click();
  await expect(page.locator('[data-i="4"].shape')).toHaveClass(/selected/);
  await page.getByRole("button", { name: "친구 수첩", exact: true }).click();
  await expect(page.getByRole("heading", { name: "초록토끼" })).toBeVisible();
  expect(errors).toEqual([]);
});
test("settings and backup, responsive layout", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await page.getByLabel("효과음", { exact: true }).uncheck();
  await page.getByLabel("움직임 줄이기", { exact: true }).check();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "파일로 보관" }).click(),
  ]);
  expect(download.suggestedFilename()).toContain("말랑이-여행");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await expect(page.getByLabel("효과음", { exact: true })).not.toBeChecked();
  await expect(page.getByLabel("움직임 줄이기", { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
