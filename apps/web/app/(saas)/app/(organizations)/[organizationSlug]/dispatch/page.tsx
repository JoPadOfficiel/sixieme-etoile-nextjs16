"use client";

import { DispatchPage } from "@saas/dispatch";

/**
 * Dispatch Page Route
 *
 * Story 8.1: Implement Dispatch Screen Layout
 *
 * Main dispatch screen for managing missions (accepted quotes with future pickup dates).
 * Provides a 3-zone layout: missions list, map, and trip transparency panel.
 *
 * @see UX Spec 8.8 Dispatch Screen
 * @see FR50-FR51 Multi-base dispatch
 */
export default function DispatchRoute() {
	return <DispatchPage />;
}
