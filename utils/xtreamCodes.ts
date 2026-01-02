
import { IPTVItem, XCCredentials, SeriesInfo, Episode, IPTVCategory } from '../types';

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

export async function fetchXtreamData(creds: XCCredentials): Promise<{ items: IPTVItem[], categories: IPTVCategory[] }> {
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

  const auth = `username=${user}&password=${pass}`;

  try {
    const fetchAction = async (action: string) => {
      const url = `${baseUrl}/player_api.php?${auth}&action=${action}`;
      const res = await fetchWithTimeout(wrapUrl(url));
      return await res.json();
    };

    // 1. Buscar Categorias primeiro (Mais rápido)
    const [catLive, catVod, catSer] = await Promise.all([
      fetchAction('get_live_categories'),
      fetchAction('get_vod_categories'),
      fetchAction('get_series_categories')
    ]);

    const categories: IPTVCategory[] = [
      ...catLive.map((c: any) => ({ id: c.category_id, name: c.category_name, group: 'Live' })),
      ...catVod.map((c: any) => ({ id: c.category_id, name: c.category_name, group: 'Movie' })),
      ...catSer.map((c: any) => ({ id: c.category_id, name: c.category_name, group: 'Series' }))
    ];

    // 2. Buscar Canais/Filmes/Séries
    const [live, vod, series] = await Promise.all([
      fetchAction('get_live_streams'),
      fetchAction('get_vod_streams'),
      fetchAction('get_series')
    ]);

    const items: IPTVItem[] = [];

    const catMap = new Map(categories.map(c => [c.id, c.name]));

    if (Array.isArray(live)) {
      live.forEach((item: any) => {
        items.push({
          id: `live_${item.stream_id}`,
          name: item.name,
          logo: item.stream_icon || '',
          url: `${baseUrl}/live/${user}/${pass}/${item.stream_id}.m3u8`,
          category_id: item.category_id,
          category_name: catMap.get(item.category_id) || 'Outros',
          group: 'Live'
        });
      });
    }

    if (Array.isArray(vod)) {
      vod.forEach((item: any) => {
        const ext = item.container_extension || 'mp4';
        items.push({
          id: `vod_${item.stream_id}`,
          name: item.name,
          logo: item.stream_icon || '',
          url: `${baseUrl}/movie/${user}/${pass}/${item.stream_id}.${ext}`,
          category_id: item.category_id,
          category_name: catMap.get(item.category_id) || 'Filmes',
          group: 'Movie'
        });
      });
    }

    if (Array.isArray(series)) {
      series.forEach((item: any) => {
        items.push({
          id: `series_${item.series_id}`,
          name: item.name,
          logo: item.cover || '',
          url: `SERIES_ID:${item.series_id}`,
          category_id: item.category_id,
          category_name: catMap.get(item.category_id) || 'Séries',
          group: 'Series'
        });
      });
    }

    return { items, categories };
  } catch (e: any) {
    throw new Error('Falha na comunicação com o servidor IPTV.');
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
  
  const rawEpisodes = data.episodes || {};
  const normalizedSeasons: { [key: string]: Episode[] } = {};

  Object.keys(rawEpisodes).forEach(seasonNum => {
    normalizedSeasons[seasonNum] = rawEpisodes[seasonNum].map((ep: any) => ({
      id: ep.id || ep.stream_id,
      title: ep.title || `Episódio ${ep.episode_num}`,
      container_extension: ep.container_extension || 'mp4',
      season: parseInt(seasonNum),
      episode_num: parseInt(ep.episode_num),
      info: ep.info || {}
    }));
  });

  return {
    name: data.info?.name || 'Série',
    cover: data.info?.cover || '',
    plot: data.info?.plot || '',
    cast: data.info?.cast || '',
    director: data.info?.director || '',
    genre: data.info?.genre || '',
    releaseDate: data.info?.releaseDate || '',
    rating: data.info?.rating || 'N/A',
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
    return getEpisodeStreamUrl(creds, episodes[0].id, episodes[0].container_extension);
  }
  throw new Error('Sem episódios.');
}
