# Data flow diagram

The diagram below captures the end-to-end execution across seeding, pipeline generation, and UI rendering.

![Content Pipeline Workflow](../diagrams/Content%20Pipeline%20Workflow-2025-12-22-152324.svg)

PNG fallback:

- [../diagrams/Content Pipeline Workflow-2025-12-22-152315.png](../diagrams/Content%20Pipeline%20Workflow-2025-12-22-152315.png)

## Phase 1
BeyondChats blogs -> Laravel scraper -> DB -> Laravel CRUD -> React

## Phase 2
Node cron -> Laravel (latest original needing update) -> SERP -> scrape 2 refs -> LLM rewrite -> Laravel (publish updated) -> DB -> React

## Phase 3
React -> Laravel list + detail -> render original + updated
