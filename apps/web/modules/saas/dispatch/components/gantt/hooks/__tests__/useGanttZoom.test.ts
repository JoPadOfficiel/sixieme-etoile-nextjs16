/**
 * useGanttZoom Hook Tests
 *
 * Story 27.12: Gantt Time & Zoom Controls
 *
 * Unit tests for the zoom state management hook.
 */

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	DEFAULT_PIXELS_PER_HOUR,
	MAX_PIXELS_PER_HOUR,
	MIN_PIXELS_PER_HOUR,
} from "../../constants";
import { ZOOM_PRESETS, ZOOM_STEP, useGanttZoom } from "../useGanttZoom";

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
		it("should set zoom to HOUR preset (150px)", () => {
			const { result } = renderHook(() => useGanttZoom());

			act(() => {
				result.current.setZoomPreset("HOUR");
			});

			expect(result.current.pixelsPerHour).toBe(ZOOM_PRESETS.HOUR);
		});

		it("should set zoom to DAY preset (50px)", () => {
			const { result } = renderHook(() => useGanttZoom({ initialZoom: 100 }));

			act(() => {
				result.current.setZoomPreset("DAY");
			});

			expect(result.current.pixelsPerHour).toBe(ZOOM_PRESETS.DAY);
		});

		it("should set zoom to WEEK preset (20px)", () => {
			const { result } = renderHook(() => useGanttZoom());

			act(() => {
				result.current.setZoomPreset("WEEK");
			});

			expect(result.current.pixelsPerHour).toBe(ZOOM_PRESETS.WEEK);
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
