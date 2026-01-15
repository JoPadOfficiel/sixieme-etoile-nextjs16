import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import type {
	GetSignedUploadUrlHandler,
	GetSignedUrlHander,
} from "../../types";

// Local storage directory (relative to project root)
const LOCAL_STORAGE_DIR = process.env.LOCAL_STORAGE_DIR || "./public/uploads";

/**
 * Ensures the local storage directory exists
 */
async function ensureDir(dir: string): Promise<void> {
	try {
		await mkdir(dir, { recursive: true });
	} catch (error) {
		// Directory already exists
	}
}

/**
 * Get "signed" upload URL for local storage
 * In local mode, this returns a special URL that the frontend will use
 * to upload directly to a local API endpoint
 */
export const getSignedUploadUrl: GetSignedUploadUrlHandler = async (
	path,
	{ bucket },
) => {
	// Ensure bucket directory exists
	const bucketDir = join(LOCAL_STORAGE_DIR, bucket);
	await ensureDir(bucketDir);

	// Return a local upload URL that will be handled by the local upload endpoint
	// The path is encoded in the URL for the upload handler to use
	const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
	return `${siteUrl}/api/local-upload?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`;
};

/**
 * Get signed URL for local storage (just returns the public path)
 */
export const getSignedUrl: GetSignedUrlHander = async (
	path,
	{ bucket },
) => {
	// Return the public URL for the file
	return `/uploads/${bucket}/${path}`;
};

/**
 * Save a file to local storage
 * Called by the local upload API endpoint
 */
export async function saveLocalFile(
	bucket: string,
	path: string,
	data: Buffer,
): Promise<void> {
	const bucketDir = join(LOCAL_STORAGE_DIR, bucket);
	await ensureDir(bucketDir);

	// Handle nested paths (e.g., "orgId/uuid.png")
	const filePath = join(bucketDir, path);
	const fileDir = join(filePath, "..");
	await ensureDir(fileDir);

	await writeFile(filePath, data);
}

/**
 * Delete a file from local storage
 */
export async function deleteLocalFile(
	bucket: string,
	path: string,
): Promise<void> {
	const { unlink } = await import("fs/promises");
	const filePath = join(LOCAL_STORAGE_DIR, bucket, path);
	try {
		await unlink(filePath);
	} catch {
		// File doesn't exist or already deleted, ignore
	}
}

/**
 * Check if local storage is enabled
 */
export function isLocalStorageEnabled(): boolean {
	return process.env.STORAGE_PROVIDER === "local" || !process.env.S3_ENDPOINT;
}

