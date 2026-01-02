
export interface IPTVItem {
  id: string;
  name: string;
  logo: string;
  url: string;
  category: string;
  group: 'Live' | 'Movie' | 'Series';
}

export interface PlaylistData {
  name: string;
  url: string;
  items: IPTVItem[];
}

export type ViewState = 'Home' | 'Live' | 'Movies' | 'Series' | 'Setup';

export interface XCCredentials {
  host: string;
  user: string;
  pass: string;
}

// Added ChatMessage interface to resolve the import error in ManelAI.tsx
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
