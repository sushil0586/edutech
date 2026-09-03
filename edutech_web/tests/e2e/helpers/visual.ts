import { type Page } from "@playwright/test";

const DEV_ARTIFACT_SUPPRESSION_CSS = `
  nextjs-portal,
  nextjs-devtools,
  [data-next-badge-root],
  [data-next-badge],
  [data-next-mark],
  [data-nextjs-toast],
  [data-nextjs-dev-tools-button],
  [data-nextjs-dialog-overlay],
  [data-nextjs-terminal],
  .nextjs-toast-errors-parent,
  .nextjs-toast-errors,
  .nextjs-error-with-static,
  [data-nextjs-error-overlay-nav],
  .error-overlay-dialog-container,
  .error-overlay-bottom-stack-stack,
  .nextjs-container-errors-header {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
`;

export async function suppressVisualNoise(page: Page) {
  await page.addInitScript(({ cssText }) => {
    const styleId = "pw-visual-noise-suppression";

    const ensureStyle = () => {
      if (document.getElementById(styleId)) {
        return;
      }

      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = cssText;
      document.head.appendChild(style);
    };

    ensureStyle();

    const observer = new MutationObserver(() => {
      ensureStyle();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }, { cssText: DEV_ARTIFACT_SUPPRESSION_CSS });

  await page.addStyleTag({ content: DEV_ARTIFACT_SUPPRESSION_CSS }).catch(() => null);
}
