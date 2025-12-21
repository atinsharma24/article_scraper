# Data flow diagram

## Phase 1
BeyondChats blogs -> Laravel scraper -> DB -> Laravel CRUD -> React

## Phase 2
Node cron -> Laravel (latest original needing update) -> SERP -> scrape 2 refs -> LLM rewrite -> Laravel (publish updated) -> DB -> React

## Phase 3
React -> Laravel list + detail -> render original + updated
