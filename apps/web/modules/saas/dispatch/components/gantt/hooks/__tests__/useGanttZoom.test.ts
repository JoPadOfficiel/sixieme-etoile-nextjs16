/**
 * useGanttZoom Hook Tests
 *
 * Story 27.12: Gantt Time & Zoom Controls
 * Story 29.6: Updated presets to day/3days/week
 *
 * Unit tests for the zoom state management hook.
 */

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	DEFAULT_PIXELS_PER_HOUR,
	MAX_PIXELS_PER_HOUR,
	MIN_PIXELS_PER_HOUR,
	ZOOM_PRESETS,
} from "../../constants";
import { ZOOM_STEP, useGanttZoom } from "../useGanttZoom";

describe("useGanttZoom", () => {
	describe("Initial State", () => {
		it("should initialize with DEFAULT_PIXELS_PER_HOUR when no options provided", () => {
			const { result } = renderHook(() => useGanttZoom());
			expect(result.current.pixelsPerHour).toBe(DEFAULT_PIXELS_PER_HOUR);
		});

		it("should initialize with custom initial zoom level", () => {
			const { result } = renderHook(() => useGanttZoom({ initialZoom: 100 }));
			expect(result.current.pixelsPerHour).toBe(100);
		});

		it("should clamp initial zoom to MIN_PIXELS_PER_HOUR if too low", () => {
			const { result } = renderHook(() => useGanttZoom({ initialZoom: 5 }));
			expect(result.current.pixelsPerHour).toBe(MIN_PIXELS_PER_HOUR);
		});

		it("should clamp initial zoom to MAX_PIXELS_PER_HOUR if too high", () => {
			const { result } = renderHook(() => useGanttZoom({ initialZoom: 500 }));
			expect(result.current.pixelsPerHour).toBe(MAX_PIXELS_PER_HOUR);
		});
	});

	describe("zoomIn", () => {
		it("should increase pixelsPerHour by ZOOM_STEP", () => {
			const { result } = renderHook(() => useGanttZoom());
			const initial = result.current.pixelsPerHour;

			act(() => {
				result.current.zoomIn();
			});

			expect(result.current.pixelsPerHour).toBe(initial + ZOOM_STEP);
		});

		it("should not exceed MAX_PIXELS_PER_HOUR", () => {
			const { result } = renderHook(() =>
				useGanttZoom({ initialZoom: MAX_PIXELS_PER_HOUR - 10 }),
			);

			act(() => {
				result.current.zoomIn();
			});

			expect(result.current.pixelsPerHour).toBe(MAX_PIXELS_PER_HOUR);
		});

		it("should do nothing when already at MAX_PIXELS_PER_HOUR", () => {
			const { result } = renderHook(() =>
				useGanttZoom({ initialZoom: MAX_PIXELS_PER_HOUR }),
			);

			act(() => {
				result.current.zoomIn();
			});

			expect(result.current.pixelsPerHour).toBe(MAX_PIXELS_PER_HOUR);
		});
	});

	describe("zoomOut", () => {
		it("should decrease pixelsPerHour by ZOOM_STEP", () => {
			const { result } = renderHook(() => useGanttZoom());
			const initial = result.current.pixelsPerHour;

			act(() => {
				result.current.zoomOut();
			});

			expect(result.current.pixelsPerHour).toBe(initial - ZOOM_STEP);
		});

		it("should not go below MIN_PIXELS_PER_HOUR", () => {
			const { result } = renderHook(() =>
				useGanttZoom({ initialZoom: MIN_PIXELS_PER_HOUR + 10 }),
			);

			act(() => {
				result.current.zoomOut();
			});

			expect(result.current.pixelsPerHour).toBe(MIN_PIXELS_PER_HOUR);
		});

		it("should do nothing when already at MIN_PIXELS_PER_HOUR", () => {
			const { result } = renderHook(() =>
				useGanttZoom({ initialZoom: MIN_PIXELS_PER_HOUR }),
			);

			act(() => {
				result.current.zoomOut();
			});

			expect(result.current.pixelsPerHour).toBe(MIN_PIXELS_PER_HOUR);
		});
	});

	describe("canZoomIn / canZoomOut", () => {
		it("should return canZoomIn=true when below MAX_PIXELS_PER_HOUR", () => {
			const { result } = renderHook(() => useGanttZoom());
			expect(result.current.canZoomIn).toBe(true);
		});

		it("should return canZoomIn=false when at MAX_PIXELS_PER_HOUR", () => {
			const { result } = renderHook(() =>
				useGanttZoom({ initialZoom: MAX_PIXELS_PER_HOUR }),
			);
			expect(result.current.canZoomIn).toBe(false);
		});

		it("should return canZoomOut=true when above MIN_PIXELS_PER_HOUR", () => {
			const { result } = renderHook(() => useGanttZoom());
			expect(result.current.canZoomOut).toBe(true);
		});

		it("should return canZoomOut=false when at MIN_PIXELS_PER_HOUR", () => {
			const { result } = renderHook(() =>
				useGanttZoom({ initialZoom: MIN_PIXELS_PER_HOUR }),
			);
			expect(result.current.canZoomOut).toBe(false);
		});
	});

	describe("setZoomLevel", () => {
		it("should set zoom to exact value within bounds", () => {
			const { result } = renderHook(() => useGanttZoom());

			act(() => {
				result.current.setZoomLevel(100);
			});

			expect(result.current.pixelsPerHour).toBe(100);
		});

		it("should clamp to MAX_PIXELS_PER_HOUR when value too high", () => {
			const { result } = renderHook(() => useGanttZoom());

			act(() => {
				result.current.setZoomLevel(500);
			});

			expect(result.current.pixelsPerHour).toBe(MAX_PIXELS_PER_HOUR);
		});

		it("should clamp to MIN_PIXELS_PER_HOUR when value too low", () => {
			const { result } = renderHook(() => useGanttZoom());

			act(() => {
				result.current.setZoomLevel(5);
			});

			expect(result.current.pixelsPerHour).toBe(MIN_PIXELS_PER_HOUR);
		});
	});

	describe("setZoomPreset", () => {
		it("should set zoom to day preset (120px)", () => {
			const { result } = renderHook(() => useGanttZoom());

			act(() => {
				result.current.setZoomPreset("day");
			});

			expect(result.current.pixelsPerHour).toBe(ZOOM_PRESETS.day.pixelsPerHour);
		});

		it("should set zoom to 3days preset (45px)", () => {
			const { result } = renderHook(() => useGanttZoom({ initialZoom: 100 }));

			act(() => {
				result.current.setZoomPreset("3days");
			});

			expect(result.current.pixelsPerHour).toBe(ZOOM_PRESETS["3days"].pixelsPerHour);
		});

		it("should set zoom to week preset (18px)", () => {
			const { result } = renderHook(() => useGanttZoom());

			act(() => {
				result.current.setZoomPreset("week");
			});

			expect(result.current.pixelsPerHour).toBe(ZOOM_PRESETS.week.pixelsPerHour);
		});
	});

	describe("zoomPercent", () => {
		it("should return 0% at MIN_PIXELS_PER_HOUR", () => {
			const { result } = renderHook(() =>
				useGanttZoom({ initialZoom: MIN_PIXELS_PER_HOUR }),
			);
			expect(result.current.zoomPercent).toBe(0);
		});

		it("should return 100% at MAX_PIXELS_PER_HOUR", () => {
			const { result } = renderHook(() =>
				useGanttZoom({ initialZoom: MAX_PIXELS_PER_HOUR }),
			);
			expect(result.current.zoomPercent).toBe(100);
		});

		it("should return approximate midpoint percentage", () => {
			const midpoint = (MIN_PIXELS_PER_HOUR + MAX_PIXELS_PER_HOUR) / 2;
			const { result } = renderHook(() =>
				useGanttZoom({ initialZoom: midpoint }),
			);
			expect(result.current.zoomPercent).toBe(50);
		});
	});

	describe("zoomLabel", () => {
		it("should return 'hour' for high zoom levels (>=120px)", () => {
			const { result } = renderHook(() => useGanttZoom({ initialZoom: 150 }));
			expect(result.current.zoomLabel).toBe("hour");
		});

		it("should return 'day' for medium zoom levels (40-120px)", () => {
			const { result } = renderHook(() => useGanttZoom({ initialZoom: 50 }));
			expect(result.current.zoomLabel).toBe("day");
		});

		it("should return 'week' for low zoom levels (<40px)", () => {
			const { result } = renderHook(() => useGanttZoom({ initialZoom: 20 }));
			expect(result.current.zoomLabel).toBe("week");
		});
	});

	describe("Custom step", () => {
		it("should use custom step for zoomIn", () => {
			const customStep = 10;
			const { result } = renderHook(() => useGanttZoom({ step: customStep }));
			const initial = result.current.pixelsPerHour;

			act(() => {
				result.current.zoomIn();
			});

			expect(result.current.pixelsPerHour).toBe(initial + customStep);
		});

		it("should use custom step for zoomOut", () => {
			const customStep = 10;
			const { result } = renderHook(() => useGanttZoom({ step: customStep }));
			const initial = result.current.pixelsPerHour;

			act(() => {
				result.current.zoomOut();
			});

			expect(result.current.pixelsPerHour).toBe(initial - customStep);
		});
	});
});
