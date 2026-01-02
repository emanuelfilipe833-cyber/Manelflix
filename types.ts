
export interface IPTVItem {
  id: string;
  name: string;
  logo: string;
  url: string;
  category: string;
  group: 'Live' | 'Movie' | 'Series';
}

export interface Episode {
  id: string;
  title: string;
  container_extension: string;
  season: number;
  episode_num: number;
  info: any;
}

export interface SeriesInfo {
  name: string;
  cover: string;
  plot: string;
  cast: string;
  director: string;
  genre: string;
  releaseDate: string;
  rating: string;
  seasons: {
    [key: string]: Episode[];
  };
}

export type ViewState = 'Home' | 'Live' | 'Movies' | 'Series' | 'Setup';

export interface XCCredentials {
  host: string;
  user: string;
  pass: string;
  useProxy: boolean;
}
