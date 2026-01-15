import { deleteLocalFile, isLocalStorageEnabled } from "@repo/storage";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Delete a file from local storage
 * Used to clean up old logos when replacing with a new one
 */
export async function DELETE(request: NextRequest) {
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
		await deleteLocalFile(bucket, path);
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Local delete failed:", error);
		return NextResponse.json(
			{ error: "Failed to delete file" },
			{ status: 500 }
		);
	}
}
