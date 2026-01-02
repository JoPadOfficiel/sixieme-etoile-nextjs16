import { useMemo, useCallback, useState } from "react";
import type {
	AssignmentCandidate,
	CandidateBase,
	CandidateSegments,
} from "../types/assignment";

/**
 * useRouteVisualization Hook
 *
 * Story 8.3: Multi-Base Optimisation & Visualisation
 *
 * Manages the state for route visualization on the dispatch map.
 * Handles candidate selection, hover states, and transforms
 * candidate data for map display.
 *
 * @see AC2: Route Preview on Hover
 * @see AC3: Full Route Display for Selected Candidate
 */

interface UseRouteVisualizationOptions {
	candidates?: AssignmentCandidate[];
	initialSelectedId?: string | null;
}

interface UseRouteVisualizationReturn {
	/** Currently selected candidate ID */
	selectedCandidateId: string | null;
	/** Currently hovered candidate ID */
	hoveredCandidateId: string | null;
	/** Candidate bases formatted for map display */
	candidateBases: CandidateBase[];
	/** Selected candidate data */
	selectedCandidate: AssignmentCandidate | null;
	/** Hovered candidate data */
	hoveredCandidate: AssignmentCandidate | null;
	/** Active candidate (selected or hovered, for route display) */
	activeCandidate: AssignmentCandidate | null;
	/** Whether to show approach route */
	showApproach: boolean;
	/** Whether to show return route */
	showReturn: boolean;
	/** Whether current route display is a preview (hover) */
	isPreview: boolean;
	/** Set selected candidate */
	setSelectedCandidateId: (id: string | null) => void;
	/** Set hovered candidate */
	setHoveredCandidateId: (id: string | null) => void;
	/** Handle candidate click (from map or list) */
	handleCandidateClick: (vehicleId: string) => void;
	/** Handle candidate hover start */
	handleCandidateHoverStart: (vehicleId: string) => void;
	/** Handle candidate hover end */
	handleCandidateHoverEnd: () => void;
	/** Clear all selections */
	clearSelection: () => void;
}

export function useRouteVisualization({
	candidates = [],
	initialSelectedId = null,
}: UseRouteVisualizationOptions = {}): UseRouteVisualizationReturn {
	const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
		initialSelectedId,
	);
	const [hoveredCandidateId, setHoveredCandidateId] = useState<string | null>(
		null,
	);

	// Find selected candidate
	const selectedCandidate = useMemo(() => {
		if (!selectedCandidateId) return null;
		return candidates.find((c) => c.candidateId === selectedCandidateId) ?? null;
	}, [candidates, selectedCandidateId]);

	// Find hovered candidate
	const hoveredCandidate = useMemo(() => {
		if (!hoveredCandidateId) return null;
		return candidates.find((c) => c.candidateId === hoveredCandidateId) ?? null;
	}, [candidates, hoveredCandidateId]);

	// Active candidate is hovered (for preview) or selected (for full display)
	const activeCandidate = hoveredCandidate ?? selectedCandidate;

	// Determine route display mode
	const isPreview = hoveredCandidate !== null && selectedCandidate?.candidateId !== hoveredCandidate?.candidateId;
	const showApproach = activeCandidate !== null;
	const showReturn = selectedCandidate !== null && !isPreview;

	// Transform candidates to map-friendly format
	const candidateBases = useMemo<CandidateBase[]>(() => {
		return candidates.map((candidate) => ({
			candidateId: candidate.candidateId,
			vehicleId: candidate.vehicleId,
			baseId: candidate.baseId,
			baseName: candidate.baseName,
			latitude: candidate.baseLatitude,
			longitude: candidate.baseLongitude,
			isSelected: candidate.candidateId === selectedCandidateId,
			isHovered: candidate.candidateId === hoveredCandidateId,
			estimatedCost: candidate.estimatedCost.total,
			segments: candidate.segments,
		}));
	}, [candidates, selectedCandidateId, hoveredCandidateId]);

	// Handlers
	const handleCandidateClick = useCallback((vehicleId: string) => {
		setSelectedCandidateId((prev) => (prev === vehicleId ? null : vehicleId));
	}, []);

	const handleCandidateHoverStart = useCallback((vehicleId: string) => {
		setHoveredCandidateId(vehicleId);
	}, []);

	const handleCandidateHoverEnd = useCallback(() => {
		setHoveredCandidateId(null);
	}, []);

	const clearSelection = useCallback(() => {
		setSelectedCandidateId(null);
		setHoveredCandidateId(null);
	}, []);

	return {
		selectedCandidateId,
		hoveredCandidateId,
		candidateBases,
		selectedCandidate,
		hoveredCandidate,
		activeCandidate,
		showApproach,
		showReturn,
		isPreview,
		setSelectedCandidateId,
		setHoveredCandidateId,
		handleCandidateClick,
		handleCandidateHoverStart,
		handleCandidateHoverEnd,
		clearSelection,
	};
}

/**
 * Get the best candidate (lowest cost) from a list
 * Story 19.8: Handle null costs when GPS coordinates are not available
 */
export function getBestCandidate(
	candidates: AssignmentCandidate[],
): AssignmentCandidate | null {
	if (candidates.length === 0) return null;
	// Filter candidates with valid costs first
	const candidatesWithCost = candidates.filter((c) => c.estimatedCost.total !== null);
	if (candidatesWithCost.length === 0) return null;
	return candidatesWithCost.reduce((best, current) =>
		(current.estimatedCost.total ?? Infinity) < (best.estimatedCost.total ?? Infinity) ? current : best,
	);
}

/**
 * Calculate cost difference from best option
 * Story 19.8: Handle null costs when GPS coordinates are not available
 */
export function getCostDifference(
	candidate: AssignmentCandidate,
	bestCandidate: AssignmentCandidate | null,
): number {
	if (!bestCandidate) return 0;
	// If either cost is null, return 0 (no comparison possible)
	if (candidate.estimatedCost.total === null || bestCandidate.estimatedCost.total === null) return 0;
	return candidate.estimatedCost.total - bestCandidate.estimatedCost.total;
}

/**
 * Check if a candidate is the best option
 */
export function isBestCandidate(
	candidate: AssignmentCandidate,
	bestCandidate: AssignmentCandidate | null,
): boolean {
	if (!bestCandidate) return false;
	return candidate.candidateId === bestCandidate.candidateId;
}

/**
 * Get segments for a specific candidate
 */
export function getCandidateSegments(
	candidate: AssignmentCandidate | null,
): CandidateSegments | null {
	if (!candidate) return null;
	return candidate.segments;
}

export default useRouteVisualization;
