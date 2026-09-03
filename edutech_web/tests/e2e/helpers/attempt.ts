import { expect, type Page } from "@playwright/test";

export async function ensureToggleChecked(selector: ReturnType<Page["locator"]>) {
  if (await selector.isChecked().catch(() => false)) {
    return;
  }

  await selector.check({ force: true }).catch(() => null);
  if (await selector.isChecked().catch(() => false)) {
    return;
  }

  await selector.click({ force: true }).catch(() => null);
  if (await selector.isChecked().catch(() => false)) {
    return;
  }

  const clickTargets = [
    selector.locator("xpath=ancestor::*[contains(@class,'attemptOptionRow')][1]").first(),
    selector.locator("xpath=ancestor::label[1]").first(),
    selector.locator("xpath=following-sibling::*[1]").first(),
  ];

  for (const target of clickTargets) {
    if (!(await target.count())) {
      continue;
    }
    await target.click({ force: true }).catch(() => null);
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
  const radioOptionRow = page.locator(".attemptOptionRow").filter({
    has: page.locator('input[name="selected_option"][type="radio"]'),
  }).first();
  const radioOption = radioOptionRow.locator('input[name="selected_option"][type="radio"]').first();
  const textAnswer = page.locator('textarea[name="answer_text"]:visible').first();
  const checkboxOptionRow = page.locator(".attemptOptionRow").filter({
    has: page.locator('input[name="selected_option_ids"][type="checkbox"]'),
  }).first();
  const checkboxOption = checkboxOptionRow.locator('input[name="selected_option_ids"][type="checkbox"]').first();

  await page.waitForLoadState("domcontentloaded");

  if (await radioOption.count()) {
    if (await radioOptionRow.count()) {
      await radioOptionRow.click({ force: true }).catch(() => null);
      if (await radioOption.isChecked().catch(() => false)) {
        return;
      }
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
    if (await checkboxOptionRow.count()) {
      await checkboxOptionRow.click({ force: true }).catch(() => null);
      if (await checkboxOption.isChecked().catch(() => false)) {
        return;
      }
    }
    await ensureToggleChecked(checkboxOption);
    await expect(checkboxOption).toBeChecked();
    return;
  }

  throw new Error("No supported answer input was found on the attempt page.");
}
