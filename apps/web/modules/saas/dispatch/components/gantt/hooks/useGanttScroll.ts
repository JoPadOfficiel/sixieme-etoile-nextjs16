"use client";

/**
 * useGanttScroll Hook
 *
 * Story 27.3: Gantt Core Timeline Rendering
 *
 * Hook for synchronizing horizontal scroll between header and content areas.
 */

import { useRef, useCallback, useEffect } from "react";

interface UseGanttScrollReturn {
	headerRef: React.RefObject<HTMLDivElement>;
	contentRef: React.RefObject<HTMLDivElement>;
	handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
	scrollTo: (x: number) => void;
}

export function useGanttScroll(): UseGanttScrollReturn {
	const headerRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const isScrollingRef = useRef(false);

	// Handle scroll event and sync both containers
	const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
		if (isScrollingRef.current) return;

		isScrollingRef.current = true;
		const scrollLeft = e.currentTarget.scrollLeft;

		if (headerRef.current && e.currentTarget !== headerRef.current) {
			headerRef.current.scrollLeft = scrollLeft;
		}
		if (contentRef.current && e.currentTarget !== contentRef.current) {
			contentRef.current.scrollLeft = scrollLeft;
		}

		// Reset flag after a short delay to allow for smooth scrolling
		requestAnimationFrame(() => {
			isScrollingRef.current = false;
		});
	}, []);

	// Programmatic scroll to a specific position
	const scrollTo = useCallback((x: number) => {
		if (headerRef.current) {
			headerRef.current.scrollLeft = x;
		}
		if (contentRef.current) {
			contentRef.current.scrollLeft = x;
		}
	}, []);

	// Handle horizontal scroll with shift+wheel
	useEffect(() => {
		const content = contentRef.current;
		if (!content) return;

		const handleWheel = (e: WheelEvent) => {
			// If shift is held or it's a horizontal scroll, scroll horizontally
			if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
				e.preventDefault();
				const delta = e.shiftKey ? e.deltaY : e.deltaX;
				content.scrollLeft += delta;
				if (headerRef.current) {
					headerRef.current.scrollLeft = content.scrollLeft;
				}
			}
		};

		content.addEventListener("wheel", handleWheel, { passive: false });
		return () => content.removeEventListener("wheel", handleWheel);
	}, []);

	return {
		headerRef: headerRef as React.RefObject<HTMLDivElement>,
		contentRef: contentRef as React.RefObject<HTMLDivElement>,
		handleScroll,
		scrollTo,
	};
}
