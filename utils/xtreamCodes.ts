
import { IPTVItem, XCCredentials } from '../types';

export async function fetchXtreamCodes(creds: XCCredentials): Promise<IPTVItem[]> {
  const { host, user, pass, useProxy } = creds;
  let baseUrl = host.trim();
  
  if (!baseUrl.startsWith('http')) baseUrl = `http://${baseUrl}`;
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
  
  // Proxy robusto para chamadas de API
  const wrapUrl = (url: string) => {
    if (!useProxy) return url;
    return `https://corsproxy.io/?${encodeURIComponent(url)}`;
  };

  const authParams = `username=${user}&password=${pass}`;
  const loginUrl = `${baseUrl}/player_api.php?${authParams}`;

  try {
    const response = await fetch(wrapUrl(loginUrl), { 
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) throw new Error(`Servidor IPTV offline (Status ${response.status})`);
    
    const data = await response.json();
    if (!data.user_info || data.user_info.auth === 0) {
      throw new Error('Conta IPTV expirada ou dados incorretos.');
    }

    const fetchAction = async (action: string) => {
      try {
        const url = `${baseUrl}/player_api.php?${authParams}&action=${action}`;
        const res = await fetch(wrapUrl(url));
        if (!res.ok) return [];
        const json = await res.json();
        return Array.isArray(json) ? json : [];
      } catch (e) {
        return [];
      }
    };

    const [live, vod, series] = await Promise.all([
      fetchAction('get_live_streams'),
      fetchAction('get_vod_streams'),
      fetchAction('get_series')
    ]);

    const items: IPTVItem[] = [];

    // CANAIS: Preferimos .m3u8 (HLS) para rodar no navegador
    live.forEach((item: any) => {
      if (!item.stream_id) return;
      items.push({
        id: `live_${item.stream_id}`,
        name: item.name || 'Canal',
        logo: item.stream_icon || '',
        url: `${baseUrl}/live/${user}/${pass}/${item.stream_id}.m3u8`,
        category: item.category_name || 'TV',
        group: 'Live'
      });
    });

    // FILMES: Xtream Codes padrão /movie/user/pass/id.ext
    vod.forEach((item: any) => {
      if (!item.stream_id) return;
      const ext = item.container_extension || 'mp4';
      items.push({
        id: `vod_${item.stream_id}`,
        name: item.name || 'Filme',
        logo: item.stream_icon || '',
        url: `${baseUrl}/movie/${user}/${pass}/${item.stream_id}.${ext}`,
        category: item.category_name || 'VOD',
        group: 'Movie'
      });
    });

    // SÉRIES: Precisam de resolução de ID de episódio
    series.forEach((item: any) => {
      if (!item.series_id) return;
      items.push({
        id: `series_${item.series_id}`,
        name: item.name || 'Série',
        logo: item.cover || '',
        url: `SERIES_ID:${item.series_id}`, 
        category: item.category_name || 'Séries',
        group: 'Series'
      });
    });

    return items;
  } catch (error: any) {
    console.error('XC Fetch Error:', error);
    throw new Error(error.message || 'Erro ao conectar no servidor.');
  }
}

export async function getFirstEpisodeUrl(creds: XCCredentials, seriesId: string): Promise<string> {
  const { host, user, pass, useProxy } = creds;
  let baseUrl = host.trim();
  if (!baseUrl.startsWith('http')) baseUrl = `http://${baseUrl}`;
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

  const url = `${baseUrl}/player_api.php?username=${user}&password=${pass}&action=get_series_info&series_id=${seriesId}`;
  
  try {
    const res = await fetch(useProxy ? `https://corsproxy.io/?${encodeURIComponent(url)}` : url);
    const data = await res.json();
    
    if (data.episodes) {
      const seasonKeys = Object.keys(data.episodes);
      if (seasonKeys.length > 0) {
        const firstSeason = data.episodes[seasonKeys[0]];
        const episode = Array.isArray(firstSeason) ? firstSeason[0] : firstSeason;
        if (episode) {
          const ext = episode.container_extension || 'mp4';
          const streamId = episode.id || episode.stream_id;
          return `${baseUrl}/series/${user}/${pass}/${streamId}.${ext}`;
        }
      }
    }
    throw new Error('Nenhum episódio encontrado.');
  } catch (e) {
    throw new Error('Erro ao carregar série.');
  }
}
