
import { IPTVItem, XCCredentials } from '../types';

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
  
  // Lógica de "Smart Paste": Se o usuário colar a URL completa com user e pass
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
    // Usamos o corsproxy.io que é o mais rápido para requisições de API
    return `https://corsproxy.io/?${encodeURIComponent(url)}`;
  };

  const authParams = `username=${user}&password=${pass}`;
  // Adicionamos output=m3u8 na própria chamada de login
  const loginUrl = `${baseUrl}/player_api.php?${authParams}`;

  try {
    const response = await fetchWithTimeout(wrapUrl(loginUrl));
    if (!response.ok) throw new Error(`Servidor não respondeu (Erro ${response.status})`);
    
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
        console.warn(`Falha ao carregar ${action}`);
        return [];
      }
    };

    // Carregamento paralelo das 3 listas (Igual ao Blink)
    const [live, vod, series] = await Promise.all([
      fetchAction('get_live_streams'),
      fetchAction('get_vod_streams'),
      fetchAction('get_series')
    ]);

    const items: IPTVItem[] = [];

    // Processamento otimizado: Só adicionamos o que tem ID válido
    live.forEach((item: any) => {
      if (item.stream_id) {
        items.push({
          id: `live_${item.stream_id}`,
          name: item.name || 'Canal',
          logo: item.stream_icon || '',
          url: `${baseUrl}/live/${user}/${pass}/${item.stream_id}.m3u8`, // HLS forçado
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
    console.error('Erro de Conexão:', error);
    if (error.name === 'AbortError') throw new Error('O servidor demorou muito para responder.');
    throw new Error(error.message || 'Erro ao conectar com o servidor IPTV.');
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
    throw new Error('Nenhum vídeo disponível.');
  } catch (e) {
    throw new Error('Erro ao abrir episódio.');
  }
}
