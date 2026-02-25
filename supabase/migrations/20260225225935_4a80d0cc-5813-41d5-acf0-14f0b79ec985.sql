
-- Create storage bucket for policy documents
INSERT INTO storage.buckets (id, name, public) VALUES ('policy-documents', 'policy-documents', false);

-- Authenticated users can upload to their own folder
CREATE POLICY "Users can upload policy docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'policy-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Authenticated users can read all policy docs
CREATE POLICY "Users can read policy docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'policy-documents');

-- Users can delete their own uploads
CREATE POLICY "Users can delete own policy docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'policy-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
