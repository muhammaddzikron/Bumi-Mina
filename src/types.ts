export interface Chapter {
  id: string;
  number: number;
  title: string;
  subtitle?: string;
  isLocked: boolean;
  pages: string[]; // Array of strings representing pages in the book
  imageUrl?: string;
  summary?: string;
}

export interface Bookmark {
  chapterId: string;
  pageIndex: number;
}

export interface Review {
  id: string;
  chapterId: string;
  name: string;
  rating: number;
  comment: string;
  timestamp: string;
}

export interface BookSettings {
  textSize: "sm" | "base" | "lg" | "xl" | "2xl";
  themeName: "cream" | "sepia" | "night" | "charcoal";
  fontFamily: "serif" | "sans";
}
