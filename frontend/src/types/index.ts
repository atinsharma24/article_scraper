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

export interface ArticleListResponse {
  data: Article[];
}

export interface ArticleDetailResponse {
  data: Article;
}

export interface ListArticlesOptions {
  type?: 'original' | 'updated';
  parentId?: number;
  perPage?: number;
}
