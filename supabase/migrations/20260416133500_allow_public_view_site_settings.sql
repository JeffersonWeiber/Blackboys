-- Allow public to view site settings (required for tracking scripts like Meta Pixel to work for visitors)
CREATE POLICY "Public can view site settings"
ON public.site_settings
FOR SELECT
USING (true);
