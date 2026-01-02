
import { IPTVItem, XCCredentials, SeriesInfo, Episode, IPTVCategory } from '../types';

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 60000) {
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

export async function fetchXtreamData(creds: XCCredentials): Promise<{ items: IPTVItem[], categories: IPTVCategory[] }> {
  let { host, user, pass, useProxy } = creds;
  
  let baseUrl = host.trim();
  if (!baseUrl.startsWith('http')) baseUrl = `http://${baseUrl}`;
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
  
  const wrapUrl = (url: string) => {
    if (!useProxy) return url;
    return `https://corsproxy.io/?${encodeURIComponent(url)}`;
  };

  const auth = `username=${user}&password=${pass}`;

  try {
    const fetchAction = async (action: string) => {
      const url = `${baseUrl}/player_api.php?${auth}&action=${action}`;
      const res = await fetchWithTimeout(wrapUrl(url));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    };

    // Chamadas SEQUENCIAIS para evitar bloqueio do servidor (HTTP 429/403)
    const catLive = await fetchAction('get_live_categories');
    const catVod = await fetchAction('get_vod_categories');
    const catSer = await fetchAction('get_series_categories');

    // Fix: Explicitly cast 'group' to the correct union type to satisfy IPTVCategory interface
    const categories: IPTVCategory[] = [
      ...catLive.map((c: any) => ({ id: String(c.category_id), name: c.category_name, group: 'Live' as 'Live' })),
      ...catVod.map((c: any) => ({ id: String(c.category_id), name: c.category_name, group: 'Movie' as 'Movie' })),
      ...catSer.map((c: any) => ({ id: String(c.category_id), name: c.category_name, group: 'Series' as 'Series' }))
    ];

    const live = await fetchAction('get_live_streams');
    const vod = await fetchAction('get_vod_streams');
    const series = await fetchAction('get_series');

    const items: IPTVItem[] = [];
    const catMap = new Map(categories.map(c => [c.id, c.name]));

    live.forEach((item: any) => {
      if (!item.stream_id) return;
      items.push({
        id: `live_${item.stream_id}`,
        name: item.name || 'Canal',
        logo: item.stream_icon || '',
        url: `${baseUrl}/live/${user}/${pass}/${item.stream_id}.m3u8`,
        category_id: String(item.category_id),
        category_name: catMap.get(String(item.category_id)) || 'Outros',
        group: 'Live'
      });
    });

    vod.forEach((item: any) => {
      if (!item.stream_id) return;
      const ext = item.container_extension || 'mp4';
      items.push({
        id: `vod_${item.stream_id}`,
        name: item.name || 'Filme',
        logo: item.stream_icon || '',
        url: `${baseUrl}/movie/${user}/${pass}/${item.stream_id}.${ext}`,
        category_id: String(item.category_id),
        category_name: catMap.get(String(item.category_id)) || 'Filmes',
        group: 'Movie'
      });
    });

    series.forEach((item: any) => {
      if (!item.series_id) return;
      items.push({
        id: `series_${item.series_id}`,
        name: item.name || 'Série',
        logo: item.cover || '',
        url: `SERIES_ID:${item.series_id}`,
        category_id: String(item.category_id),
        category_name: catMap.get(String(item.category_id)) || 'Séries',
        group: 'Series'
      });
    });

    return { items, categories };
  } catch (e: any) {
    console.error('IPTV Fetch Error:', e);
    throw new Error('Servidor não respondeu. Verifique Host/DNS e Proxy.');
  }
}

export async function getSeriesInfo(creds: XCCredentials, seriesId: string): Promise<SeriesInfo> {
  const { host, user, pass, useProxy } = creds;
  let baseUrl = host.trim();
  if (!baseUrl.startsWith('http')) baseUrl = `http://${baseUrl}`;
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

  const url = `${baseUrl}/player_api.php?username=${user}&password=${pass}&action=get_series_info&series_id=${seriesId}`;
  const res = await fetchWithTimeout(useProxy ? `https://corsproxy.io/?${encodeURIComponent(url)}` : url);
  const data = await res.json();
  
  if (!data || !data.episodes) throw new Error('Dados da série não encontrados.');

  const rawEpisodes = data.episodes;
  const normalizedSeasons: { [key: string]: Episode[] } = {};

  Object.keys(rawEpisodes).forEach(seasonNum => {
    const seasonData = rawEpisodes[seasonNum];
    if (Array.isArray(seasonData)) {
      normalizedSeasons[seasonNum] = seasonData.map((ep: any) => ({
        id: String(ep.id || ep.stream_id),
        title: ep.title || `Episódio ${ep.episode_num}`,
        container_extension: ep.container_extension || 'mp4',
        season: parseInt(seasonNum),
        episode_num: parseInt(ep.episode_num),
        info: ep.info || {}
      }));
    }
  });

  return {
    name: data.info?.name || 'Série',
    cover: data.info?.cover || '',
    plot: data.info?.plot || 'Sem descrição.',
    cast: data.info?.cast || '',
    director: data.info?.director || '',
    genre: data.info?.genre || '',
    releaseDate: data.info?.releaseDate || '',
    rating: String(data.info?.rating || 'N/A'),
    seasons: normalizedSeasons
  };
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
    if (episodes && episodes.length > 0) {
      return getEpisodeStreamUrl(creds, episodes[0].id, episodes[0].container_extension);
    }
  }
  throw new Error('Série sem episódios.');
}
