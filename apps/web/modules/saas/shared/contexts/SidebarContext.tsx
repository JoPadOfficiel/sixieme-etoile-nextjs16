"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useSyncExternalStore,
	type ReactNode,
} from "react";

const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";
const SIDEBAR_WIDTH_EXPANDED = 280;
const SIDEBAR_WIDTH_COLLAPSED = 64;

export interface SidebarContextType {
	isCollapsed: boolean;
	toggleSidebar: () => void;
	collapseSidebar: () => void;
	expandSidebar: () => void;
	sidebarWidth: number;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

// Custom store for sidebar state with localStorage persistence
function createSidebarStore() {
	let isCollapsed = false;
	let listeners: Array<() => void> = [];

	// Initialize from localStorage
	if (typeof window !== "undefined") {
		isCollapsed = localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
	}

	const notifyListeners = () => {
		listeners.forEach((listener) => listener());
	};

	return {
		getSnapshot: () => isCollapsed,
		getServerSnapshot: () => false,
		subscribe: (listener: () => void) => {
			listeners = [...listeners, listener];
			return () => {
				listeners = listeners.filter((l) => l !== listener);
			};
		},
		setCollapsed: (value: boolean) => {
			isCollapsed = value;
			if (typeof window !== "undefined") {
				localStorage.setItem(SIDEBAR_STORAGE_KEY, String(value));
			}
			notifyListeners();
		},
		toggle: () => {
			isCollapsed = !isCollapsed;
			if (typeof window !== "undefined") {
				localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isCollapsed));
			}
			notifyListeners();
		},
	};
}

const sidebarStore = createSidebarStore();

export function SidebarProvider({ children }: { children: ReactNode }) {
	const isCollapsed = useSyncExternalStore(
		sidebarStore.subscribe,
		sidebarStore.getSnapshot,
		sidebarStore.getServerSnapshot
	);

	// Keyboard shortcut handler (Cmd+B / Ctrl+B)
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "b") {
				e.preventDefault();
				sidebarStore.toggle();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	const toggleSidebar = useCallback(() => {
		sidebarStore.toggle();
	}, []);

	const collapseSidebar = useCallback(() => {
		sidebarStore.setCollapsed(true);
	}, []);

	const expandSidebar = useCallback(() => {
		sidebarStore.setCollapsed(false);
	}, []);

	const sidebarWidth = isCollapsed
		? SIDEBAR_WIDTH_COLLAPSED
		: SIDEBAR_WIDTH_EXPANDED;

	return (
		<SidebarContext.Provider
			value={{
				isCollapsed,
				toggleSidebar,
				collapseSidebar,
				expandSidebar,
				sidebarWidth,
			}}
		>
			{children}
		</SidebarContext.Provider>
	);
}

export function useSidebar(): SidebarContextType {
	const context = useContext(SidebarContext);
	if (!context) {
		throw new Error("useSidebar must be used within a SidebarProvider");
	}
	return context;
}

export { SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_WIDTH_EXPANDED };
