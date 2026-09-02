-- Lock the "resources" storage bucket down to document files only.
-- The upload page already checks this in the browser, but that check can be
-- bypassed (devtools, a direct API call), so this is the enforcement that
-- actually matters: Supabase Storage rejects any upload whose Content-Type
-- doesn't match one of these, regardless of what the client sends.

update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
where id = 'resources';
