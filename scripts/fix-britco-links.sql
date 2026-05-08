UPDATE stories
SET body = regexp_replace(
  body,
  '<a[^>]*href="[^"]*brit\.co[^"]*"[^>]*>([^<]*)</a>',
  '\1',
  'gi'
)
WHERE is_external = true AND body LIKE '%brit.co%';
