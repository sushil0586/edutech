"use client";

import { useState } from "react";

type BuilderTabItem = {
  id: string;
  label: string;
  description: string;
  content: React.ReactNode;
};

export function BuilderTabs({
  items,
  initialTabId,
}: {
  items: BuilderTabItem[];
  initialTabId?: string;
}) {
  const fallbackTabId = items[0]?.id ?? "";
  const [activeTabId, setActiveTabId] = useState(initialTabId ?? fallbackTabId);
  const activeItem = items.find((item) => item.id === activeTabId) ?? items[0] ?? null;

  if (!activeItem) {
    return null;
  }

  return (
    <section className="builderTabs">
      <div className="builderTabsHeader">
        <div>
          <span className="builderFlowLabel">Workspace modules</span>
          <strong>Build the exam in focused stages</strong>
        </div>
      </div>

      <div className="builderTabList" role="tablist" aria-label="Builder workspace modules">
        {items.map((item) => {
          const isActive = item.id === activeItem.id;

          return (
            <button
              aria-selected={isActive}
              className={`builderTabButton ${isActive ? "builderTabButtonActive" : ""}`}
              key={item.id}
              onClick={() => setActiveTabId(item.id)}
              role="tab"
              type="button"
            >
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </button>
          );
        })}
      </div>

      <div className="builderTabPanel" role="tabpanel">
        {activeItem.content}
      </div>
    </section>
  );
}
