"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

export type WorkspaceTab = {
  id: string;
  label: string;
  count?: number;
  content: ReactNode;
};

export function WorkspaceTabs({
  tabs,
  defaultTabId,
}: {
  tabs: WorkspaceTab[];
  defaultTabId: string;
}) {
  const initialTab = useMemo(() => {
    return tabs.some((tab) => tab.id === defaultTabId) ? defaultTabId : tabs[0]?.id ?? "";
  }, [defaultTabId, tabs]);

  const [activeTab, setActiveTab] = useState(initialTab);

  const activeContent = tabs.find((tab) => tab.id === activeTab)?.content ?? tabs[0]?.content;

  return (
    <div className="workspaceTabsShell">
      <div className="workspaceTabsList" role="tablist" aria-label="Workspace sections">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              className={`workspaceTabButton ${isActive ? "workspaceTabButtonActive" : ""}`}
              aria-selected={isActive}
              role="tab"
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.label}</span>
              {typeof tab.count === "number" ? <strong>{tab.count}</strong> : null}
            </button>
          );
        })}
      </div>

      <div className="workspaceTabsPanel" role="tabpanel">
        {activeContent}
      </div>
    </div>
  );
}
