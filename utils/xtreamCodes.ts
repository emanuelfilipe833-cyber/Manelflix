
import { IPTVItem, XCCredentials } from '../types';

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 20000) {
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
  
  // Proxy corsproxy.io é mais eficiente para streams e JSONs massivos
  const wrapUrl = (url: string) => {
    if (!useProxy) return url;
    return `https://corsproxy.io/?${encodeURIComponent(url)}`;
  };

  const authParams = `username=${user}&password=${pass}`;
  const loginUrl = `${baseUrl}/player_api.php?${authParams}`;

  try {
    const response = await fetchWithTimeout(wrapUrl(loginUrl));
    if (!response.ok) throw new Error(`O servidor IPTV não respondeu (Status ${response.status})`);
    
    const data = await response.json();
    if (!data.user_info || data.user_info.auth === 0) {
      throw new Error('Usuário ou Senha incorretos ou conta expirada.');
    }

    const fetchAction = async (action: string) => {
      try {
        const url = `${baseUrl}/player_api.php?${authParams}&action=${action}`;
        const res = await fetchWithTimeout(wrapUrl(url));
        if (!res.ok) return [];
        const json = await res.json();
        return Array.isArray(json) ? json : [];
      } catch (e) {
        console.warn(`Erro ao carregar ${action}:`, e);
        return [];
      }
    };

    // Carregamento paralelo para ganhar tempo
    const [live, vod, series] = await Promise.all([
      fetchAction('get_live_streams'),
      fetchAction('get_vod_streams'),
      fetchAction('get_series')
    ]);

    const items: IPTVItem[] = [];

    // Processamento otimizado para não travar a UI
    live.forEach((item: any) => {
      if (item.stream_id) {
        items.push({
          id: `live_${item.stream_id}`,
          name: item.name || 'Canal',
          logo: item.stream_icon || '',
          url: `${baseUrl}/live/${user}/${pass}/${item.stream_id}.ts`,
          category: item.category_name || 'Canais',
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
    if (error.name === 'AbortError') {
      throw new Error('O servidor IPTV demorou muito para responder. Tente novamente.');
    }
    throw new Error(error.message || 'Falha de conexão com o servidor.');
  }
}

export async function getFirstEpisodeUrl(creds: XCCredentials, seriesId: string): Promise<string> {
  const { host, user, pass, useProxy } = creds;
  let baseUrl = host.trim();
  if (!baseUrl.startsWith('http')) baseUrl = `http://${baseUrl}`;
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

  const url = `${baseUrl}/player_api.php?username=${user}&password=${pass}&action=get_series_info&series_id=${seriesId}`;
  const wrapped = useProxy ? `https://corsproxy.io/?${encodeURIComponent(url)}` : url;

  try {
    const res = await fetchWithTimeout(wrapped);
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
    throw new Error('Nenhum episódio encontrado.');
  } catch (e) {
    throw new Error('Falha ao carregar episódio.');
  }
}
