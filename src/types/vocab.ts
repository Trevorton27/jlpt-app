export interface JlptWord {
  word: string;
  meaning: string;
  furigana: string;
  romaji: string;
  level: number;
}

export interface JlptApiResponse {
  total: number;
  offset: number;
  limit: number;
  words: JlptWord[];
}
