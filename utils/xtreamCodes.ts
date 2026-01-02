
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
    // O corsproxy.io é o mais compatível com o player do Chrome
    return `https://corsproxy.io/?${encodeURIComponent(url)}`;
  };

  const authParams = `username=${user}&password=${pass}`;
  // Adicionamos output=m3u8 para o servidor já preparar o formato correto
  const loginUrl = `${baseUrl}/player_api.php?${authParams}`;

  try {
    const response = await fetchWithTimeout(wrapUrl(loginUrl));
    if (!response.ok) throw new Error(`Servidor IPTV não respondeu.`);
    
    const data = await response.json();
    if (!data.user_info || data.user_info.auth === 0) {
      throw new Error('Conta inválida ou expirada.');
    }

    // Função interna para processar grandes listas sem travar o navegador
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

    // TV AO VIVO - Usando .m3u8 (Igual ao Blink Player)
    live.forEach((item: any) => {
      if (item.stream_id) {
        items.push({
          id: `live_${item.stream_id}`,
          name: item.name || 'Canal',
          logo: item.stream_icon || '',
          // Mudamos de .ts para .m3u8 para compatibilidade máxima no Chrome
          url: `${baseUrl}/live/${user}/${pass}/${item.stream_id}.m3u8`,
          category: item.category_name || 'TV',
          group: 'Live'
        });
      }
    });

    // FILMES
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
    console.error(error);
    throw new Error('Falha ao conectar. Verifique se o Host/User/Pass estão corretos.');
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
    throw new Error('Série sem episódios.');
  } catch (e) {
    throw new Error('Erro ao carregar vídeo.');
  }
}
