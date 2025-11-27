/**
 * Document Storage Service
 * Story 7.5: Document Generation & Storage
 *
 * Provides file storage abstraction for generated documents.
 * Uses local filesystem in development, S3-compatible storage in production.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner";

// ============================================================================
// Types
// ============================================================================

export interface StorageService {
	/**
	 * Save a file buffer to storage
	 * @returns The storage path (key) for the saved file
	 */
	save(buffer: Buffer, filename: string, organizationId: string): Promise<string>;

	/**
	 * Get a public or signed URL for accessing the file
	 */
	getUrl(storagePath: string): Promise<string>;

	/**
	 * Get the file buffer from storage
	 */
	getBuffer(storagePath: string): Promise<Buffer>;

	/**
	 * Check if a file exists
	 */
	exists(storagePath: string): Promise<boolean>;
}

// ============================================================================
// Local Storage (Development)
// ============================================================================

export class LocalStorageService implements StorageService {
	private basePath: string;

	constructor(basePath = "/tmp/vtc-documents") {
		this.basePath = basePath;
	}

	async save(buffer: Buffer, filename: string, organizationId: string): Promise<string> {
		const dir = path.join(this.basePath, organizationId);
		await fs.mkdir(dir, { recursive: true });

		const filePath = path.join(dir, filename);
		await fs.writeFile(filePath, buffer);

		// Return relative path from base
		return `${organizationId}/${filename}`;
	}

	async getUrl(storagePath: string): Promise<string> {
		// For local storage, return API endpoint URL
		return `/api/vtc/documents/file/${encodeURIComponent(storagePath)}`;
	}

	async getBuffer(storagePath: string): Promise<Buffer> {
		const filePath = path.join(this.basePath, storagePath);
		return fs.readFile(filePath);
	}

	async exists(storagePath: string): Promise<boolean> {
		const filePath = path.join(this.basePath, storagePath);
		try {
			await fs.access(filePath);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get full file path for local storage
	 */
	getFullPath(storagePath: string): string {
		return path.join(this.basePath, storagePath);
	}
}

// ============================================================================
// S3 Storage (Production)
// ============================================================================

export class S3StorageService implements StorageService {
	private client: S3Client;
	private bucket: string;
	private publicUrl: string;

	constructor() {
		const endpoint = process.env.S3_ENDPOINT;
		const accessKeyId = process.env.S3_ACCESS_KEY_ID;
		const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
		const bucket = process.env.S3_DOCUMENTS_BUCKET || "vtc-documents";
		const publicUrl = process.env.S3_PUBLIC_URL || endpoint;

		if (!endpoint || !accessKeyId || !secretAccessKey) {
			throw new Error("Missing S3 configuration environment variables");
		}

		this.client = new S3Client({
			region: "auto",
			endpoint,
			forcePathStyle: true,
			credentials: {
				accessKeyId,
				secretAccessKey,
			},
		});

		this.bucket = bucket;
		this.publicUrl = publicUrl || "";
	}

	async save(buffer: Buffer, filename: string, organizationId: string): Promise<string> {
		const key = `documents/${organizationId}/${filename}`;

		await this.client.send(
			new PutObjectCommand({
				Bucket: this.bucket,
				Key: key,
				Body: buffer,
				ContentType: "application/pdf",
			})
		);

		return key;
	}

	async getUrl(storagePath: string): Promise<string> {
		// Return signed URL for private buckets
		const signedUrl = await getS3SignedUrl(
			this.client,
			new GetObjectCommand({
				Bucket: this.bucket,
				Key: storagePath,
			}),
			{ expiresIn: 3600 } // 1 hour
		);

		return signedUrl;
	}

	async getBuffer(storagePath: string): Promise<Buffer> {
		const response = await this.client.send(
			new GetObjectCommand({
				Bucket: this.bucket,
				Key: storagePath,
			})
		);

		if (!response.Body) {
			throw new Error("Empty response body from S3");
		}

		// Convert stream to buffer
		const chunks: Uint8Array[] = [];
		for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
			chunks.push(chunk);
		}
		return Buffer.concat(chunks);
	}

	async exists(storagePath: string): Promise<boolean> {
		try {
			await this.client.send(
				new GetObjectCommand({
					Bucket: this.bucket,
					Key: storagePath,
				})
			);
			return true;
		} catch {
			return false;
		}
	}
}

// ============================================================================
// Factory
// ============================================================================

let storageInstance: StorageService | null = null;

/**
 * Get the storage service instance
 * Uses local storage in development, S3 in production
 */
export function getStorageService(): StorageService {
	if (storageInstance) {
		return storageInstance;
	}

	const useS3 = process.env.USE_S3_STORAGE === "true" || process.env.NODE_ENV === "production";

	if (useS3) {
		storageInstance = new S3StorageService();
	} else {
		storageInstance = new LocalStorageService();
	}

	return storageInstance;
}

/**
 * Reset storage instance (for testing)
 */
export function resetStorageService(): void {
	storageInstance = null;
}
