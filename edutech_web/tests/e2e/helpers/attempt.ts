import { expect, type Page } from "@playwright/test";

async function ensureToggleChecked(selector: ReturnType<Page["locator"]>) {
  if (await selector.isChecked().catch(() => false)) {
    return;
  }

  await selector.click({ force: true }).catch(() => null);
  if (await selector.isChecked().catch(() => false)) {
    return;
  }

  const optionRow = selector.locator("xpath=ancestor::label[1]").first();
  if (await optionRow.count()) {
    await optionRow.click({ force: true });
    if (await selector.isChecked().catch(() => false)) {
      return;
    }
  }

  await selector.evaluate((element) => {
    const input = element as HTMLInputElement;
    input.checked = true;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

export async function answerCurrentAttemptQuestion(page: Page, answerSeed: number, prefix = "Playwright answer") {
  const radioOption = page
    .locator('input[name="selected_option"][type="radio"]:visible')
    .or(page.getByRole("radio"))
    .first();
  const textAnswer = page.locator('textarea[name="answer_text"]:visible').first();
  const checkboxOption = page
    .locator('input[name="selected_option_ids"][type="checkbox"]:visible')
    .or(page.getByRole("checkbox"))
    .first();

  if (await radioOption.count()) {
    await ensureToggleChecked(radioOption);
    await expect(radioOption).toBeChecked();
    return;
  }

  if (await textAnswer.count()) {
    await textAnswer.fill(`${prefix} ${answerSeed}`);
    await expect(textAnswer).toHaveValue(`${prefix} ${answerSeed}`);
    return;
  }

  if (await checkboxOption.count()) {
    await ensureToggleChecked(checkboxOption);
    await expect(checkboxOption).toBeChecked();
    return;
  }

  throw new Error("No supported answer input was found on the attempt page.");
}
