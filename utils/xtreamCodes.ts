
import { IPTVItem, XCCredentials, SeriesInfo, Episode } from '../types';

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

export async function fetchXtreamCodes(creds: XCCredentials): Promise<IPTVItem[]> {
  let { host, user, pass, useProxy } = creds;
  
  if (host.includes('username=') && host.includes('password=')) {
    const urlObj = new URL(host);
    const params = new URLSearchParams(urlObj.search);
    user = params.get('username') || user;
    pass = params.get('password') || pass;
    host = `${urlObj.protocol}//${urlObj.host}`;
  }

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
    const response = await fetchWithTimeout(wrapUrl(loginUrl));
    if (!response.ok) throw new Error(`Servidor não respondeu.`);
    
    const data = await response.json();
    if (!data.user_info || data.user_info.auth === 0) {
      throw new Error('Acesso Negado: Usuário ou Senha incorretos.');
    }

    const fetchAction = async (action: string) => {
      try {
        const url = `${baseUrl}/player_api.php?${authParams}&action=${action}`;
        const res = await fetchWithTimeout(wrapUrl(url));
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

    live.forEach((item: any) => {
      if (item.stream_id) {
        items.push({
          id: `live_${item.stream_id}`,
          name: item.name || 'Canal',
          logo: item.stream_icon || '',
          url: `${baseUrl}/live/${user}/${pass}/${item.stream_id}.m3u8`,
          category: item.category_name || 'TV',
          group: 'Live'
        });
      }
    });

    vod.forEach((item: any) => {
      if (item.stream_id) {
        const ext = item.container_extension || 'mp4';
        items.push({
          id: `vod_${item.stream_id}`,
          name: item.name || 'Filme',
          logo: item.stream_icon || '',
          url: `${baseUrl}/movie/${user}/${pass}/${item.stream_id}.${ext}`,
          category: item.category_name || 'Filmes',
          group: 'Movie'
        });
      }
    });

    series.forEach((item: any) => {
      if (item.series_id) {
        items.push({
          id: `series_${item.series_id}`,
          name: item.name || 'Série',
          logo: item.cover || '',
          url: `SERIES_ID:${item.series_id}`, 
          category: item.category_name || 'Séries',
          group: 'Series'
        });
      }
    });

    return items;
  } catch (error: any) {
    throw new Error(error.message || 'Erro ao conectar com o servidor.');
  }
}

export async function getSeriesInfo(creds: XCCredentials, seriesId: string): Promise<SeriesInfo> {
  const { host, user, pass, useProxy } = creds;
  let baseUrl = host.trim();
  if (!baseUrl.startsWith('http')) baseUrl = `http://${baseUrl}`;
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

  const url = `${baseUrl}/player_api.php?username=${user}&password=${pass}&action=get_series_info&series_id=${seriesId}`;
  try {
    const res = await fetchWithTimeout(useProxy ? `https://corsproxy.io/?${encodeURIComponent(url)}` : url);
    const data = await res.json();
    
    if (!data.episodes) throw new Error('Nenhum episódio encontrado para esta série.');

    const info = data.info || {};
    return {
      name: info.name || 'Série',
      cover: info.cover || '',
      plot: info.plot || 'Sem descrição disponível.',
      cast: info.cast || '',
      director: info.director || '',
      genre: info.genre || '',
      releaseDate: info.releaseDate || '',
      rating: info.rating || 'N/A',
      seasons: data.episodes
    };
  } catch (e) {
    throw new Error('Falha ao carregar detalhes da série.');
  }
}

export function getEpisodeStreamUrl(creds: XCCredentials, episodeId: string, ext: string = 'mp4'): string {
  const { host, user, pass } = creds;
  let baseUrl = host.trim();
  if (!baseUrl.startsWith('http')) baseUrl = `http://${baseUrl}`;
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
  return `${baseUrl}/series/${user}/${pass}/${episodeId}.${ext}`;
}

// Deprecated in favor of detailed series info, but kept for compatibility
export async function getFirstEpisodeUrl(creds: XCCredentials, seriesId: string): Promise<string> {
  const info = await getSeriesInfo(creds, seriesId);
  const seasonKeys = Object.keys(info.seasons);
  if (seasonKeys.length > 0) {
    const firstSeason = info.seasons[seasonKeys[0]];
    if (firstSeason.length > 0) {
      return getEpisodeStreamUrl(creds, firstSeason[0].id, firstSeason[0].container_extension);
    }
  }
  throw new Error('Série vazia.');
}
