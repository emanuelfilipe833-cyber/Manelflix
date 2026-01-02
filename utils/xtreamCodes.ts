
import { IPTVItem, XCCredentials, SeriesInfo, Episode } from '../types';

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 40000) {
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

  try {
    // 1. LOGIN
    const loginUrl = `${baseUrl}/player_api.php?${authParams}`;
    const loginRes = await fetchWithTimeout(wrapUrl(loginUrl));
    const loginData = await loginRes.json();
    
    if (!loginData.user_info || loginData.user_info.auth === 0) {
      throw new Error('Acesso Negado: Usuário ou Senha incorretos.');
    }

    const items: IPTVItem[] = [];

    const fetchAction = async (action: string) => {
      try {
        const url = `${baseUrl}/player_api.php?${authParams}&action=${action}`;
        const res = await fetchWithTimeout(wrapUrl(url));
        if (!res.ok) return [];
        return await res.json();
      } catch (e) {
        console.error(`Erro em ${action}:`, e);
        return [];
      }
    };

    // Buscamos um por um para não sobrecarregar servidores mais simples
    const live = await fetchAction('get_live_streams');
    const vod = await fetchAction('get_vod_streams');
    const series = await fetchAction('get_series');

    if (Array.isArray(live)) {
      live.forEach((item: any) => {
        if (item.stream_id) items.push({
          id: `live_${item.stream_id}`,
          name: item.name || 'Canal',
          logo: item.stream_icon || '',
          url: `${baseUrl}/live/${user}/${pass}/${item.stream_id}.m3u8`,
          category: item.category_name || 'TV',
          group: 'Live'
        });
      });
    }

    if (Array.isArray(vod)) {
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
    }

    if (Array.isArray(series)) {
      series.forEach((item: any) => {
        if (item.series_id) items.push({
          id: `series_${item.series_id}`,
          name: item.name || 'Série',
          logo: item.cover || '',
          url: `SERIES_ID:${item.series_id}`, 
          category: item.category_name || 'Séries',
          group: 'Series'
        });
      });
    }

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
    
    if (!data.episodes) throw new Error('Esta série está vazia no servidor.');

    // Normalizar episódios: Xtream Codes as vezes retorna objeto { "1": [...], "2": [...] }
    const rawEpisodes = data.episodes;
    const normalizedSeasons: { [key: string]: Episode[] } = {};

    Object.keys(rawEpisodes).forEach(seasonNum => {
      const seasonData = rawEpisodes[seasonNum];
      if (Array.isArray(seasonData)) {
        normalizedSeasons[seasonNum] = seasonData.map((ep: any) => ({
          id: ep.id || ep.stream_id,
          title: ep.title || `Episódio ${ep.episode_num}`,
          container_extension: ep.container_extension || 'mp4',
          season: parseInt(seasonNum),
          episode_num: parseInt(ep.episode_num),
          info: ep.info || {}
        }));
      }
    });

    const info = data.info || {};
    return {
      name: info.name || 'Série',
      cover: info.cover || '',
      plot: info.plot || 'Sem descrição.',
      cast: info.cast || '',
      director: info.director || '',
      genre: info.genre || '',
      releaseDate: info.releaseDate || '',
      rating: info.rating || 'N/A',
      seasons: normalizedSeasons
    };
  } catch (e) {
    throw new Error('Falha ao abrir temporadas.');
  }
}

export function getEpisodeStreamUrl(creds: XCCredentials, episodeId: string, ext: string = 'mp4'): string {
  const { host, user, pass } = creds;
  let baseUrl = host.trim();
  if (!baseUrl.startsWith('http')) baseUrl = `http://${baseUrl}`;
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
  return `${baseUrl}/series/${user}/${pass}/${episodeId}.${ext}`;
}

export async function getFirstEpisodeUrl(creds: XCCredentials, seriesId: string): Promise<string> {
  const info = await getSeriesInfo(creds, seriesId);
  const seasons = Object.keys(info.seasons);
  if (seasons.length > 0) {
    const episodes = info.seasons[seasons[0]];
    if (episodes.length > 0) {
      return getEpisodeStreamUrl(creds, episodes[0].id, episodes[0].container_extension);
    }
  }
  throw new Error('Sem episódios.');
}
