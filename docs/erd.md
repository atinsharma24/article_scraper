# ERD (MVP)

## articles
- id
- type (original|updated)
- parent_id (nullable; updated -> original)
- title
- slug
- content
- source_url
- published_at
- references (jsonb; updated rows only)
- created_at, updated_at
