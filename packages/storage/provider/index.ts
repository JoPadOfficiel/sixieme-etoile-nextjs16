import * as localProvider from "./local";
import * as s3Provider from "./s3";

/**
 * Check if S3 is configured
 */
function isS3Configured(): boolean {
	return !!(
		process.env.S3_ENDPOINT &&
		process.env.S3_ACCESS_KEY_ID &&
		process.env.S3_SECRET_ACCESS_KEY
	);
}

/**
 * Get the appropriate storage provider based on configuration
 * Falls back to local storage if S3 is not configured
 */
function getProvider() {
	if (process.env.STORAGE_PROVIDER === "local") {
		return localProvider;
	}
	
	if (isS3Configured()) {
		return s3Provider;
	}

	// Default to local if S3 is not configured
	console.warn(
		"[Storage] S3 not configured, falling back to local storage. " +
		"Set S3_ENDPOINT, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY to use S3, " +
		"or set STORAGE_PROVIDER=local to suppress this warning."
	);
	return localProvider;
}

// Export functions that delegate to the active provider
export const getSignedUploadUrl: typeof localProvider.getSignedUploadUrl = async (
	path,
	options,
) => {
	return getProvider().getSignedUploadUrl(path, options);
};

export const getSignedUrl: typeof localProvider.getSignedUrl = async (
	path,
	options,
) => {
	return getProvider().getSignedUrl(path, options);
};

// Re-export local storage utilities for direct use
export { saveLocalFile, deleteLocalFile, isLocalStorageEnabled } from "./local";
