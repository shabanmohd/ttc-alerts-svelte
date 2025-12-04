-- Add bookmarked_stops column to user_preferences table
-- Stores up to 10 bookmarked stops per user

ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS bookmarked_stops JSONB DEFAULT '[]';

-- Add comment for documentation
COMMENT ON COLUMN public.user_preferences.bookmarked_stops IS 'Array of bookmarked stops: [{id, name, routes[]}]. Max 10 stops.';

-- Example structure:
-- [
--   {"id": "14045", "name": "Bloor-Yonge Station", "routes": ["1", "2", "65"]},
--   {"id": "12345", "name": "Dundas Station", "routes": ["505", "506"]}
-- ]
