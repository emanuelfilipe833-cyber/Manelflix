
export interface IPTVItem {
  id: string;
  name: string;
  logo: string;
  url: string;
  category: string;
  group: 'Live' | 'Movie' | 'Series';
}

export type ViewState = 'Home' | 'Live' | 'Movies' | 'Series' | 'Setup';

export interface XCCredentials {
  host: string;
  user: string;
  pass: string;
  useProxy: boolean;
}
