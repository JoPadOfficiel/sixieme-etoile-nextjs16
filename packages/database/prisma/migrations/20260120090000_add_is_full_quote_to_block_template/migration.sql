-- Story 26.21: Add isFullQuote field to block_template
-- This distinguishes single-block templates from full quote templates

-- Add the isFullQuote column with default value false
ALTER TABLE "block_template" ADD COLUMN "isFullQuote" BOOLEAN NOT NULL DEFAULT false;

-- Add index for filtering by template type
CREATE INDEX "block_template_isFullQuote_idx" ON "block_template"("isFullQuote");
