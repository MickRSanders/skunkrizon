-- Fix cross-tenant read access on policy-documents storage bucket
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can read policy docs" ON storage.objects;

-- Create a tenant-isolated SELECT policy scoped to user's own folder
CREATE POLICY "Users can read own policy docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'policy-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );