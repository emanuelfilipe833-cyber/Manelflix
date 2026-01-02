
import { IPTVItem, XCCredentials } from '../types';

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 25000) {
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
    const response = await fetchWithTimeout(wrapUrl(loginUrl));
    if (!response.ok) throw new Error(`O servidor não respondeu. Verifique o Host.`);
    
    const data = await response.json();
    if (!data.user_info || data.user_info.auth === 0) {
      throw new Error('Usuário ou Senha incorretos.');
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

    // Carregamento simultâneo otimizado
    const [live, vod, series] = await Promise.all([
      fetchAction('get_live_streams'),
      fetchAction('get_vod_streams'),
      fetchAction('get_series')
    ]);

    const items: IPTVItem[] = [];

    // TV AO VIVO: Usando .m3u8 (Tecnologia Blink)
    live.forEach((item: any) => {
      if (item.stream_id) {
        items.push({
          id: `live_${item.stream_id}`,
          name: item.name || 'Canais',
          logo: item.stream_icon || '',
          // A tecnologia Blink usa m3u8 para Live no Chrome
          url: `${baseUrl}/live/${user}/${pass}/${item.stream_id}.m3u8`,
          category: item.category_name || 'TV',
          group: 'Live'
        });
      }
    });

    // FILMES: MP4/MKV direto
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

    // SÉRIES
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
    throw new Error(error.message || 'Erro ao conectar com o provedor.');
  }
}

export async function getFirstEpisodeUrl(creds: XCCredentials, seriesId: string): Promise<string> {
  const { host, user, pass, useProxy } = creds;
  let baseUrl = host.trim();
  if (!baseUrl.startsWith('http')) baseUrl = `http://${baseUrl}`;
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

  const url = `${baseUrl}/player_api.php?username=${user}&password=${pass}&action=get_series_info&series_id=${seriesId}`;
  try {
    const res = await fetchWithTimeout(useProxy ? `https://corsproxy.io/?${encodeURIComponent(url)}` : url);
    const data = await res.json();
    if (data.episodes) {
      const seasons = Object.keys(data.episodes);
      if (seasons.length > 0) {
        const firstSeason = data.episodes[seasons[0]];
        const episode = Array.isArray(firstSeason) ? firstSeason[0] : firstSeason;
        if (episode) {
          const ext = episode.container_extension || 'mp4';
          const streamId = episode.id || episode.stream_id;
          return `${baseUrl}/series/${user}/${pass}/${streamId}.${ext}`;
        }
      }
    }
    throw new Error('Nenhum episódio disponível.');
  } catch (e) {
    throw new Error('Erro ao carregar série.');
  }
}
