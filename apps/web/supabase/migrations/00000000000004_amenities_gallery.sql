-- Aggiunge colonne per caratteristiche e galleria foto agli stabilimenti
ALTER TABLE establishments
  ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS gallery_photo_urls TEXT[] DEFAULT '{}';

-- Bucket pubblico per foto stabilimenti
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'establishment-photos',
  'establishment-photos',
  true,
  5242880, -- 5MB max per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: chiunque può leggere (bucket pubblico)
CREATE POLICY "establishment_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'establishment-photos');

-- Policy: solo il proprietario dello stabilimento può caricare
CREATE POLICY "establishment_photos_owner_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'establishment-photos'
    AND auth.uid() IS NOT NULL
  );

-- Policy: solo il proprietario può eliminare
CREATE POLICY "establishment_photos_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'establishment-photos'
    AND auth.uid() IS NOT NULL
  );
