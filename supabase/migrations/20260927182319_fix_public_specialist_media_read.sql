-- Anonymous visitors could not read any published specialist photo: the
-- shared SELECT policy also called private.can_manage_specialist_media, which
-- anon may not execute, so every anonymous read failed with "permission
-- denied" and the public site fell back to placeholder portraits.
-- Split it: anon reads only media of published profiles; signed-in users
-- additionally read the media they manage.

DROP POLICY "Published specialist media is readable" ON storage.objects;

CREATE POLICY "Anyone can read published specialist media"
ON storage.objects
FOR SELECT
TO anon
USING (
  bucket_id = 'specialist-profile-media'
  AND private.can_read_published_specialist_media(name)
);

CREATE POLICY "Signed-in users can read permitted specialist media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'specialist-profile-media'
  AND (
    private.can_read_published_specialist_media(name)
    OR private.can_manage_specialist_media(name)
  )
);
