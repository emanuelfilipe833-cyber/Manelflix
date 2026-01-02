
import { IPTVItem, XCCredentials } from '../types';

export async function fetchXtreamCodes(creds: XCCredentials): Promise<IPTVItem[]> {
  const { host, user, pass, useProxy } = creds;
  let baseUrl = host.trim();
  
  if (!baseUrl.startsWith('http')) baseUrl = `http://${baseUrl}`;
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
  
  const wrapUrl = (url: string) => {
    if (!useProxy) return url;
    return `https://corsproxy.io/?${encodeURIComponent(url)}`;
  };

  const authParams = `username=${user}&password=${pass}`;
  const loginUrl = `${baseUrl}/player_api.php?${authParams}`;

  try {
    const response = await fetch(wrapUrl(loginUrl), { cache: 'no-store' });
    if (!response.ok) throw new Error(`Erro no servidor: ${response.status}`);
    
    const data = await response.json();
    if (!data.user_info || data.user_info.auth === 0) {
      throw new Error('Usuário ou Senha inválidos.');
    }

    const fetchAction = async (action: string) => {
      const url = `${baseUrl}/player_api.php?${authParams}&action=${action}`;
      const res = await fetch(wrapUrl(url));
      if (!res.ok) return [];
      return res.json();
    };

    const [live, vod, series] = await Promise.all([
      fetchAction('get_live_streams'),
      fetchAction('get_vod_streams'),
      fetchAction('get_series')
    ]);

    const items: IPTVItem[] = [];

    // Canais (Live)
    if (Array.isArray(live)) {
      live.forEach((item: any) => {
        items.push({
          id: `live_${item.stream_id}`,
          name: item.name,
          logo: item.stream_icon,
          url: `${baseUrl}/live/${user}/${pass}/${item.stream_id}.ts`,
          category: item.category_name || 'Canais',
          group: 'Live'
        });
      });
    }

    // Filmes (VOD)
    if (Array.isArray(vod)) {
      vod.forEach((item: any) => {
        const ext = item.container_extension || 'mp4';
        items.push({
          id: `vod_${item.stream_id}`,
          name: item.name,
          logo: item.stream_icon,
          // Xtream Codes VOD URL: host/movie/user/pass/id.ext
          url: `${baseUrl}/movie/${user}/${pass}/${item.stream_id}.${ext}`,
          category: item.category_name || 'Filmes',
          group: 'Movie'
        });
      });
    }

    // Séries
    if (Array.isArray(series)) {
      series.forEach((item: any) => {
        items.push({
          id: `series_${item.series_id}`,
          name: item.name,
          logo: item.cover,
          url: `SERIES_ID:${item.series_id}`, 
          category: item.category_name || 'Séries',
          group: 'Series'
        });
      });
    }

    return items;
  } catch (error: any) {
    console.error('XC Fetch Error:', error);
    throw new Error(error.message || 'Falha ao conectar ao servidor IPTV.');
  }
}

export async function getFirstEpisodeUrl(creds: XCCredentials, seriesId: string): Promise<string> {
  const { host, user, pass, useProxy } = creds;
  let baseUrl = host.trim();
  if (!baseUrl.startsWith('http')) baseUrl = `http://${baseUrl}`;
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

  const url = `${baseUrl}/player_api.php?username=${user}&password=${pass}&action=get_series_info&series_id=${seriesId}`;
  const wrapUrl = (u: string) => useProxy ? `https://corsproxy.io/?${encodeURIComponent(u)}` : u;

  try {
    const res = await fetch(wrapUrl(url));
    const data = await res.json();
    
    if (data.episodes && Object.keys(data.episodes).length > 0) {
      const seasons = Object.keys(data.episodes);
      const firstSeason = data.episodes[seasons[0]];
      const firstEpisode = Array.isArray(firstSeason) ? firstSeason[0] : firstSeason;
      
      if (firstEpisode) {
        const ext = firstEpisode.container_extension || 'mp4';
        const streamId = firstEpisode.id || firstEpisode.stream_id;
        // Xtream Codes Series URL: host/series/user/pass/id.ext
        return `${baseUrl}/series/${user}/${pass}/${streamId}.${ext}`;
      }
    }
    throw new Error('Nenhum episódio disponível.');
  } catch (e) {
    console.error('Series info error:', e);
    throw e;
  }
}
