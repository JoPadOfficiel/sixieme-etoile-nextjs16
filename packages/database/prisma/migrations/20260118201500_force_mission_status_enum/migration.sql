
-- Create MissionStatus enum type if it doesn't exist
DO $$ BEGIN
    create type "MissionStatus" as enum ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- If you heavily rely on the table name mapping for other things, you might want a manual migration to ensure types align.
-- This migration ensures the database type exists. 
