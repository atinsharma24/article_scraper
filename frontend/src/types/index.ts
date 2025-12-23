export interface Reference {
  url: string;
  title: string | null;
}

export interface Article {
  id: number;
  type: 'original' | 'updated';
  parent_id: number | null;
  title: string;
  slug: string | null;
  content: string;
  source_url: string | null;
  references: Reference[] | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleIndexItem extends Article {
  updates_count?: number;
}

export interface ArticleWithUpdates extends Article {
  updates?: Article[];
}

// Laravel pagination response (we only rely on `data`, but keep common fields for correctness)
export interface Paginated<T> {
  data: T[];
  current_page?: number;
  per_page?: number;
  total?: number;
  next_page_url?: string | null;
  prev_page_url?: string | null;
}

export interface ListArticlesOptions {
  type?: 'original' | 'updated';
  parentId?: number;
  perPage?: number;
}
