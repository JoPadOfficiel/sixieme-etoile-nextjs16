import { config } from "@repo/config";
import { getSignedUrl, isLocalStorageEnabled } from "@repo/storage";
import { NextResponse } from "next/server";

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
		const signedUrl = await getSignedUrl(filePath, {
			bucket,
			expiresIn: 60 * 60,
		});

		// If using local storage, the URL is a local path - redirect to it
		// Local URLs start with /uploads/
		if (signedUrl.startsWith("/uploads/") || isLocalStorageEnabled()) {
			return NextResponse.redirect(
				new URL(signedUrl, process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
				{ headers: { "Cache-Control": "max-age=3600" } }
			);
		}

		// For S3 URLs, redirect normally
		return NextResponse.redirect(signedUrl, {
			headers: { "Cache-Control": "max-age=3600" },
		});
	} catch (error) {
		console.error("Image proxy error:", error);
		return new Response("Not found", { status: 404 });
	}
};
