-- Allow anyone to view site settings (required for tracking scripts on frontend)
CREATE POLICY "Public can view site settings"
ON public.site_settings
FOR SELECT
USING (true);

-- Ensure editors can also update (not just admin)
CREATE POLICY "Editor can update site settings"
ON public.site_settings
FOR UPDATE
USING (has_role(auth.uid(), 'editor'::app_role));