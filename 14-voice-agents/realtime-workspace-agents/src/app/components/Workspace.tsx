"use client";

import React from "react";
import Sidebar from "@/app/components/workspace/Sidebar";
import TabContent from "@/app/components/workspace/TabContent";
import { useWorkspaceContext, WorkspaceState } from "@/app/contexts/WorkspaceContext";

// Container panel rendered when the workspaceBuilder scenario is active.
// Combines the Sidebar (tab list) and TabContent(renderer) components.

function Workspace() {
  // Extract data + mutators from the Zustand store.
  // Stable selectors avoid triggering the subscription effect on every render
  // (because arrow functions create a new function each time).
  const selectTabs = React.useCallback((s: WorkspaceState) => s.tabs, []);
  const selectSelectedTabId = React.useCallback((s: WorkspaceState) => s.selectedTabId, []);
  const selectAddTab = React.useCallback((s: WorkspaceState) => s.addTab, []);
  const selectRenameTab = React.useCallback((s: WorkspaceState) => s.renameTab, []);
  const selectDeleteTab = React.useCallback((s: WorkspaceState) => s.deleteTab, []);
  const selectSetSelectedTabId = React.useCallback((s: WorkspaceState) => s.setSelectedTabId, []);

  const tabs = useWorkspaceContext(selectTabs);
  const selectedTabId = useWorkspaceContext(selectSelectedTabId);

  const addTab = useWorkspaceContext(selectAddTab);
  const renameTab = useWorkspaceContext(selectRenameTab);
  const deleteTab = useWorkspaceContext(selectDeleteTab);
  const setSelectedTabId = useWorkspaceContext(selectSetSelectedTabId);

  // Ensure a default tab exists and a valid tab is always selected. Performing
  // this in a `useEffect` keeps state changes out of the render phase and
  // prevents React warnings about cascading updates between parent/child
  // components.
  React.useEffect(() => {
    if (tabs.length === 0) {
      addTab();
      return;
    }

    if (!tabs.find((t) => t.id === selectedTabId)) {
      setSelectedTabId(tabs[0]?.id ?? "");
    }
  }, [tabs, selectedTabId, addTab, setSelectedTabId]);

  const selectedTab = React.useMemo(
    () => tabs.find((t) => t.id === selectedTabId),
    [tabs, selectedTabId],
  );

  return (
    <div className="w-full flex flex-col bg-white rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 sticky top-0 z-10 text-base border-b bg-white rounded-t-xl">
        <span className="font-semibold">Workspace</span>
      </div>

      {/* Content area split between sidebar + tab content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar (tab list) */}
        <div className="w-48 border-r border-gray-200 dark:border-neutral-800 overflow-y-auto">
          <Sidebar
            tabs={tabs}
            selectedTabId={selectedTabId}
            onSelect={setSelectedTabId}
            onRename={renameTab}
            onDelete={deleteTab}
            onAdd={addTab}
          />
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-auto p-4">
          <TabContent tab={selectedTab} />
        </div>
      </div>
    </div>
  );
}

export default Workspace;
