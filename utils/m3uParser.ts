
import { IPTVItem } from '../types';

export function parseM3U(m3uContent: string): IPTVItem[] {
  const lines = m3uContent.split('\n');
  const items: IPTVItem[] = [];
  let currentItem: Partial<IPTVItem> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      const info = line.split('#EXTINF:')[1];
      
      // Extract name (last part after comma)
      const nameMatch = info.match(/,(.*)$/);
      const name = nameMatch ? nameMatch[1].trim() : 'Unknown';

      // Extract logo
      const logoMatch = info.match(/tvg-logo="([^"]+)"/i);
      const logo = logoMatch ? logoMatch[1] : `https://picsum.photos/seed/${name}/300/450`;

      // Extract category
      const groupMatch = info.match(/group-title="([^"]+)"/i);
      const category = groupMatch ? groupMatch[1] : 'General';

      // Simple heuristic for group type (Live vs VOD)
      // Usually IPTV providers use keywords in group titles
      let group: 'Live' | 'Movie' | 'Series' = 'Live';
      const catLower = category.toLowerCase();
      if (catLower.includes('movie') || catLower.includes('filme')) group = 'Movie';
      else if (catLower.includes('series') || catLower.includes('serie')) group = 'Series';

      // Fix: Use category_id and category_name instead of category to match the IPTVItem interface.
      currentItem = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        logo,
        category_id: category,
        category_name: category,
        group
      };
    } else if (line.startsWith('http') && currentItem.name) {
      currentItem.url = line;
      items.push(currentItem as IPTVItem);
      currentItem = {};
    }
  }

  return items;
}
