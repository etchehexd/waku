export type MediaType = "ANIME" | "MANGA";

export type MediaFormat =
  | "TV"
  | "TV_SHORT"
  | "MOVIE"
  | "SPECIAL"
  | "OVA"
  | "ONA"
  | "MUSIC"
  | "MANGA"
  | "NOVEL"
  | "ONE_SHOT";

export type MediaStatus =
  | "FINISHED"
  | "RELEASING"
  | "NOT_YET_RELEASED"
  | "CANCELLED"
  | "HIATUS";

export interface MediaTitle {
  romaji: string | null;
  english: string | null;
  native: string | null;
}

export interface CoverImage {
  extraLarge: string | null;
  large: string | null;
  color: string | null;
}

export interface AiringSchedule {
  airingAt: number;
  timeUntilAiring: number;
  episode: number;
}

export interface MediaTag {
  id: number;
  name: string;
  rank: number | null;
  isMediaSpoiler: boolean;
}

export interface CharacterEdge {
  role: string;
  node: {
    id: number;
    name: { full: string | null };
    image: { large: string | null };
  };
  voiceActors?: {
    id: number;
    name: { full: string | null };
    image: { large: string | null };
  }[];
}

export interface StaffEdge {
  role: string;
  node: {
    id: number;
    name: { full: string | null };
    image: { large: string | null };
  };
}

export interface RelationEdge {
  relationType: string;
  node: MediaSummary;
}

export interface MediaSummary {
  id: number;
  type: MediaType;
  format: MediaFormat | null;
  status: MediaStatus | null;
  title: MediaTitle;
  coverImage: CoverImage;
  bannerImage: string | null;
  averageScore: number | null;
  meanScore: number | null;
  popularity: number | null;
  favourites: number | null;
  episodes: number | null;
  chapters: number | null;
  volumes: number | null;
  duration: number | null;
  season: string | null;
  seasonYear: number | null;
  genres: string[];
  isAdult: boolean;
  nextAiringEpisode: AiringSchedule | null;
}

export interface MediaRanking {
  rank: number;
  type: "RATED" | "POPULAR";
  allTime: boolean;
  /** Human-readable context, e.g. "highest rated all time". */
  context: string;
  year: number | null;
  season: string | null;
  format: MediaFormat | null;
}

export interface MediaDetail extends MediaSummary {
  description: string | null;
  rankings: MediaRanking[];
  studios: { nodes: { id: number; name: string; isAnimationStudio: boolean }[] };
  tags: MediaTag[];
  startDate: { year: number | null; month: number | null; day: number | null };
  endDate: { year: number | null; month: number | null; day: number | null };
  source: string | null;
  countryOfOrigin: string | null;
  trailer: { id: string; site: string } | null;
  characters: { edges: CharacterEdge[] };
  staff: { edges: StaffEdge[] };
  relations: { edges: RelationEdge[] };
  recommendations: {
    nodes: { mediaRecommendation: MediaSummary | null }[];
  };
}

export interface PageResult<T> {
  Page: {
    pageInfo: {
      total: number;
      currentPage: number;
      lastPage: number;
      hasNextPage: number | boolean;
    };
    media: T[];
  };
}
