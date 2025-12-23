/**
 * Core type definitions for the article scraper pipeline
 */

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

export interface OriginalArticlePayload {
  type: 'original';
  title: string;
  content: string;
  source_url: string;
}

export interface UpdatedArticlePayload {
  type: 'updated';
  parent_id: number;
  title: string;
  content: string;
  references: Reference[];
}

export interface CompetitorData {
  url: string;
  title: string | null;
  text: string;
}

export interface RewriteParams {
  originalTitle: string;
  originalHtml: string;
  competitorA: CompetitorData;
  competitorB: CompetitorData;
}

export interface RewriteResult {
  title: string | null;
  html: string;
}

export interface ExtractionResult {
  title: string | null;
  text: string;
  html: string;
}

export interface SerpResult {
  link: string;
  title?: string;
}

export interface SerpApiResponse {
  organic_results?: SerpResult[];
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface GeminiContent {
  parts: Array<{
    text: string;
  }>;
}

export interface GeminiResponse {
  candidates?: Array<{
    content: GeminiContent;
  }>;
}

export type LLMProvider = 'openai' | 'gemini';
