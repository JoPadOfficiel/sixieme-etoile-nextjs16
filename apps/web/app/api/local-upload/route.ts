import { saveLocalFile, isLocalStorageEnabled } from "@repo/storage";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Local upload handler - receives files and saves them to local storage
 * This is used as an alternative to S3 signed URLs for local development
 */
export async function PUT(request: NextRequest) {
	// Check if local storage is enabled
	if (!isLocalStorageEnabled()) {
		return NextResponse.json(
			{ error: "Local storage is not enabled" },
			{ status: 400 }
		);
	}

	const { searchParams } = new URL(request.url);
	const bucket = searchParams.get("bucket");
	const path = searchParams.get("path");

	if (!bucket || !path) {
		return NextResponse.json(
			{ error: "Missing bucket or path parameter" },
			{ status: 400 }
		);
	}

	try {
		// Get the file data from the request body
		const arrayBuffer = await request.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Save the file locally
		await saveLocalFile(bucket, path, buffer);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Local upload failed:", error);
		return NextResponse.json(
			{ error: "Failed to save file" },
			{ status: 500 }
		);
	}
}
