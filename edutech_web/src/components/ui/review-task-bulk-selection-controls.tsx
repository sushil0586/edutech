"use client";

import { useEffect, useState } from "react";

type ReviewTaskBulkSelectionControlsProps = {
  checkboxName: string;
  formId: string;
  itemCount: number;
};

export function ReviewTaskBulkSelectionControls({
  checkboxName,
  formId,
  itemCount,
}: ReviewTaskBulkSelectionControlsProps) {
  const [selectedCount, setSelectedCount] = useState(0);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const syncCount = () => {
      const boxes = Array.from(
        form.querySelectorAll<HTMLInputElement>(`input[name="${checkboxName}"][type="checkbox"]`),
      );
      setSelectedCount(boxes.filter((box) => box.checked).length);
    };

    syncCount();
    form.addEventListener("change", syncCount);
    return () => form.removeEventListener("change", syncCount);
  }, [checkboxName, formId]);

  function toggleAll(checked: boolean) {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const boxes = Array.from(
      form.querySelectorAll<HTMLInputElement>(`input[name="${checkboxName}"][type="checkbox"]`),
    );
    for (const box of boxes) {
      box.checked = checked;
    }
    setSelectedCount(checked ? boxes.length : 0);
  }

  return (
    <div className="resultCardActions">
      <span className="questionBankTagChip">
        {selectedCount} of {itemCount} selected
      </span>
      <button className="button buttonGhost" onClick={() => toggleAll(true)} type="button">
        Select page
      </button>
      <button className="button buttonGhost" onClick={() => toggleAll(false)} type="button">
        Clear
      </button>
    </div>
  );
}
