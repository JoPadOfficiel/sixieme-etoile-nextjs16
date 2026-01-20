import { describe, expect, it } from "vitest";
import { decodePolyline } from "./polyline";

describe("decodePolyline", () => {
	it("decodes a valid Google encoded polyline", () => {
		// Example from Google Polyline Algorithm docs
		// Points: (38.5, -120.2), (40.7, -120.95), (43.252, -126.453)
		const encoded = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";
		const expected = [
			{ lat: 38.5, lng: -120.2 },
			{ lat: 40.7, lng: -120.95 },
			{ lat: 43.252, lng: -126.453 },
		];

		const result = decodePolyline(encoded);

		expect(result).toEqual(expected);
	});

	it("returns empty array for empty string", () => {
		expect(decodePolyline("")).toEqual([]);
	});
});
