# ERD (MVP)

Related diagram(s):

- [../diagrams/Content Pipeline Workflow-2025-12-22-152324.svg](../diagrams/Content%20Pipeline%20Workflow-2025-12-22-152324.svg)

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
