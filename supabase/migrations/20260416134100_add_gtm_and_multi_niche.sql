-- 1. Add GTM to site_settings (nothing needed if key system is generic, but let's ensure it exists)
-- Key 'tracking_gtm' will be used in the 'site_settings' table via the UI.

-- 2. Add niches array to portfolio_items
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS niches TEXT[];

-- 3. Migrate existing singular niche to the new array
UPDATE public.portfolio_items 
SET niches = ARRAY[niche] 
WHERE niches IS NULL AND niche IS NOT NULL;

-- 4. Set a default empty array for items without niche
UPDATE public.portfolio_items 
SET niches = ARRAY[]::TEXT[] 
WHERE niches IS NULL;

-- 5. Add index for performance on the array column
CREATE INDEX IF NOT EXISTS idx_portfolio_items_niches ON public.portfolio_items USING GIN (niches);

-- 6. Grant permissions (just in case)
GRANT ALL ON public.portfolio_items TO authenticated;
GRANT SELECT ON public.portfolio_items TO anon;