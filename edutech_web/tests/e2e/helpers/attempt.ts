import { expect, type Page } from "@playwright/test";

export async function ensureToggleChecked(selector: ReturnType<Page["locator"]>) {
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
    .locator('input[name="selected_option"][type="radio"]')
    .or(page.getByRole("radio"))
    .first();
  const textAnswer = page.locator('textarea[name="answer_text"]:visible').first();
  const checkboxOption = page
    .locator('input[name="selected_option_ids"][type="checkbox"]')
    .or(page.getByRole("checkbox"))
    .first();
  const objectiveOptionRow = page.locator(".attemptOptionRow").first();

  await page.waitForLoadState("domcontentloaded");

  if (await radioOption.count()) {
    if (await objectiveOptionRow.count()) {
      await objectiveOptionRow.click({ force: true }).catch(() => null);
    }
    await ensureToggleChecked(radioOption);
    await expect(radioOption).toBeChecked();
    return;
  }

  if (await textAnswer.count()) {
    const expectedAnswer = `${prefix} ${answerSeed}`;
    await textAnswer.fill(expectedAnswer);
    const immediateValue = await textAnswer.inputValue().catch(() => "");
    if (immediateValue !== expectedAnswer) {
      await textAnswer.evaluate(
        (element, value) => {
          const textarea = element as HTMLTextAreaElement;
          textarea.value = value;
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
          textarea.dispatchEvent(new Event("change", { bubbles: true }));
        },
        expectedAnswer,
      );
    }
    await expect
      .poll(async () => (await textAnswer.inputValue().catch(() => "")).trim(), {
        timeout: 10000,
      })
      .toBe(expectedAnswer);
    return;
  }

  if (await checkboxOption.count()) {
    if (await objectiveOptionRow.count()) {
      await objectiveOptionRow.click({ force: true }).catch(() => null);
    }
    await ensureToggleChecked(checkboxOption);
    await expect(checkboxOption).toBeChecked();
    return;
  }

  throw new Error("No supported answer input was found on the attempt page.");
}
