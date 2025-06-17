"use client";

// A standard React context/provider implementation for workspace state.

import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  PropsWithChildren,
  FC,
  useEffect,
} from "react";

import { nanoid } from "nanoid";
import type { WorkspaceTab } from "@/app/types";

export interface WorkspaceState {
  // Data
  name: string;
  description: string;
  tabs: WorkspaceTab[];
  selectedTabId: string;

  // Mutators
  setName: (n: string) => void;
  setDescription: (d: string) => void;
  setTabs: (tabs: WorkspaceTab[]) => void;
  addTab: (partial?: Partial<Omit<WorkspaceTab, "id">>) => void;
  renameTab: (id: string, newName: string) => void;
  deleteTab: (id: string) => void;
  setSelectedTabId: (id: string) => void;
}

const WorkspaceContext = createContext<WorkspaceState | undefined>(undefined);

export const WorkspaceProvider: FC<PropsWithChildren> = ({ children }) => {
  // -----------------------------------------------------------------------
  // Raw state values
  // -----------------------------------------------------------------------

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tabs, setTabsInternal] = useState<WorkspaceTab[]>([]);
  const [selectedTabId, setSelectedTabIdInternal] = useState<string>("");

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('workspaceState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.name) setName(parsed.name);
        if (parsed.description) setDescription(parsed.description);
        if (Array.isArray(parsed.tabs)) setTabsInternal(parsed.tabs);
        if (parsed.selectedTabId) setSelectedTabIdInternal(parsed.selectedTabId);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Save to localStorage on any change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const state = { name, description, tabs, selectedTabId };
    localStorage.setItem('workspaceState', JSON.stringify(state));
  }, [name, description, tabs, selectedTabId]);

  // -----------------------------------------------------------------------
  // Helper setters that also maintain invariants
  // -----------------------------------------------------------------------

  const setTabs = useCallback((newTabs: WorkspaceTab[]) => {
    setTabsInternal((prev) => {
      const safeTabs = Array.isArray(newTabs) ? newTabs : [];
      setSelectedTabIdInternal((prevSelected) => {
        if (safeTabs.find((t) => t.id === prevSelected)) return prevSelected;
        return safeTabs[0]?.id ?? "";
      });
      return safeTabs;
    });
  }, []);

  const addTab = useCallback(
    (partial: Partial<Omit<WorkspaceTab, "id">> = {}) => {
      setTabsInternal((prev) => {
        const id = nanoid();
        const newTab: WorkspaceTab = {
          id,
          name: partial.name ?? `Tab ${prev.length + 1}`,
          type: partial.type ?? "markdown",
          content: partial.content ?? "",
        };
        // Select the new tab
        setSelectedTabIdInternal(id);
        return [...prev, newTab];
      });
    },
    [],
  );

  const renameTab = useCallback((id: string, newName: string) => {
    setTabsInternal((prev) => prev.map((t) => (t.id === id ? { ...t, name: newName } : t)));
  }, []);

  const deleteTab = useCallback((id: string) => {
    setTabsInternal((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      setSelectedTabIdInternal((sel) => {
        if (sel !== id) return sel;
        return updated[0]?.id ?? "";
      });
      return updated;
    });
  }, []);

  const setSelectedTabId = useCallback((id: string) => {
    setSelectedTabIdInternal(id);
  }, []);

  // -----------------------------------------------------------------------
  // Compose state object and update ref each render
  // -----------------------------------------------------------------------

  const value: WorkspaceState = {
    name,
    description,
    tabs,
    selectedTabId,
    setName,
    setDescription,
    setTabs,
    addTab,
    renameTab,
    deleteTab,
    setSelectedTabId,
  };

  // Update shared ref so `useWorkspaceContext.getState()` is always current.
  WorkspaceProviderState.current = value;

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export function useWorkspaceContext<T>(selector: (state: WorkspaceState) => T): T {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspaceContext must be used within a WorkspaceProvider");
  }
  return selector(ctx);
}

// expose getState for imperative access (Sidebar uses it)
useWorkspaceContext.getState = (): WorkspaceState => {
  if (!WorkspaceProviderState.current) {
    throw new Error("Workspace context not yet initialised");
  }
  return WorkspaceProviderState.current;
};

const WorkspaceProviderState = { current: null as unknown as WorkspaceState };


// Resolves a tab ID from a list of tabs and lookup info (id, index, or name).
function resolveTabId(
  tabs: WorkspaceTab[],
  opts: { id?: string; index?: number; name?: string }
): string | undefined {
  const { id, index, name } = opts;
  if (typeof id === 'string' && id) {
    return id;
  }
  // Prefer name over index if both are provided
  if (typeof name === 'string') {
    const tabByName = tabs.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (tabByName) return tabByName.id;
  }
  if (typeof index === 'number' && index >= 0 && index < tabs.length) {
    return tabs[index]?.id;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Helper functions (used by WorkspaceManager agent tools)
// ---------------------------------------------------------------------------

export async function setWorkspaceInfo(input: any) {
  const { name, description } = input as { name?: string; description?: string };
  const ws = useWorkspaceContext.getState();
  if (typeof name === 'string') ws.setName(name);
  if (typeof description === 'string') ws.setDescription(description);
  return { message: 'Workspace info updated.' };
}

export async function addWorkspaceTab(input: any) {
  const { name, type, content } = input as { name?: string; type?: string; content?: string };
  const ws = useWorkspaceContext.getState();
  const newTab: WorkspaceTab = {
    id: nanoid(),
    name: typeof name === 'string' && name ? name : `Tab ${ws.tabs.length + 1}`,
    type: typeof type === 'string' && (type === 'markdown' || type === 'csv') ? type : 'markdown',
    content: typeof content === 'string' && content ? content : '',
  };
  ws.setTabs([...ws.tabs, newTab]);
  ws.setSelectedTabId(newTab.id);
  return { message: `Tab '${newTab.name}' added.` };
}

export async function renameWorkspaceTab(input: any) {
  const { id, index, current_name, new_name } = input as {
    id?: string;
    index?: number;
    current_name?: string;
    new_name?: string;
  };
  const ws = useWorkspaceContext.getState();
  if (typeof new_name !== 'string' || new_name.trim() === '') {
    return { message: 'Invalid new_name for rename.' };
  }
  const targetId = resolveTabId(ws.tabs, { id, index, name: current_name });
  if (!targetId) {
    return { message: 'Unable to locate tab for rename.' };
  }
  ws.renameTab(targetId, new_name!);
  return { message: `Tab renamed to ${new_name}.` };
}

export async function deleteWorkspaceTab(input: any) {
  const { id, index, name } = input as { id?: string; index?: number; name?: string };
  const ws = useWorkspaceContext.getState();
  const targetId = resolveTabId(ws.tabs, { id, index, name });
  if (!targetId) {
    return { message: 'Unable to locate tab for deletion.' };
  }
  ws.deleteTab(targetId);
  return { message: 'Tab deleted.' };
}

export async function setTabContent(input: any) {
  const { id, index, name, content } = input as {
    id?: string;
    index?: number;
    name?: string;
    content?: string;
  };
  const ws = useWorkspaceContext.getState();
  if (typeof content !== 'string') {
    return { message: 'Content must be a string.' };
  }
  const targetId = resolveTabId(ws.tabs, { id, index, name });
  if (!targetId) {
    return { message: 'Unable to locate tab for set_tab_content.' };
  }
  ws.setTabs(ws.tabs.map((t) => (t.id === targetId ? { ...t, content } : t)));
  ws.setSelectedTabId(targetId);
  return { message: 'Tab content updated.' };
}

export async function setSelectedTabId(input: any) {
  const { id, index, name } = input as { id?: string; index?: number; name?: string };
  const ws = useWorkspaceContext.getState();
  const targetId = resolveTabId(ws.tabs, { id, index, name });
  if (!targetId) {
    return { message: 'Unable to locate tab for set_tab_content.' };
  }
  ws.setSelectedTabId(targetId);
  return { message: 'Tab selected.' };
}

export async function getWorkspaceInfo() {
  const ws = useWorkspaceContext.getState();
  return { workspace: ws };
}
