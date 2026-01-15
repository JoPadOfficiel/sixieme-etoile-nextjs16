import { config } from "@repo/config";
import { getSignedUrl, isLocalStorageEnabled } from "@repo/storage";
import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { join } from "path";

// Local storage directory
const LOCAL_STORAGE_DIR = process.env.LOCAL_STORAGE_DIR || "./public/uploads";

export const GET = async (
	req: Request,
	{ params }: { params: Promise<{ path: string[] }> },
) => {
	const { path } = await params;

	// Handle full path with nested directories (e.g., bucket/orgId/file.png)
	if (path.length < 2) {
		return new Response("Invalid path", { status: 400 });
	}

	const bucket = path[0];
	const filePath = path.slice(1).join("/");

	if (!bucket || !filePath) {
		return new Response("Invalid path", { status: 400 });
	}

	// Check if this is an allowed bucket
	const allowedBuckets = [
		config.storage.bucketNames.avatars,
		config.storage.bucketNames.documentLogos,
	];

	if (!allowedBuckets.includes(bucket)) {
		return new Response("Not found", { status: 404 });
	}

	try {
		// If using local storage, serve file directly
		if (isLocalStorageEnabled()) {
			const localFilePath = join(LOCAL_STORAGE_DIR, bucket, filePath);
			
			try {
				const fileBuffer = await readFile(localFilePath);
				
				// Determine content type based on extension
				const ext = filePath.split(".").pop()?.toLowerCase();
				let contentType = "application/octet-stream";
				if (ext === "png") contentType = "image/png";
				else if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
				else if (ext === "svg") contentType = "image/svg+xml";
				else if (ext === "gif") contentType = "image/gif";
				else if (ext === "webp") contentType = "image/webp";
				
				return new Response(fileBuffer, {
					headers: {
						"Content-Type": contentType,
						"Cache-Control": "public, max-age=3600",
					},
				});
			} catch {
				return new Response("Not found", { status: 404 });
			}
		}

		// For S3 storage, redirect to signed URL
		const signedUrl = await getSignedUrl(filePath, {
			bucket,
			expiresIn: 60 * 60,
		});

		return NextResponse.redirect(signedUrl, {
			headers: { "Cache-Control": "max-age=3600" },
		});
	} catch (error) {
		console.error("Image proxy error:", error);
		return new Response("Not found", { status: 404 });
	}
};
