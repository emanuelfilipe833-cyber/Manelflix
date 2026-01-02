
import { IPTVItem, XCCredentials } from '../types';

export async function fetchXtreamCodes(creds: XCCredentials): Promise<IPTVItem[]> {
  const { host, user, pass, useProxy } = creds;
  let baseUrl = host.trim();
  
  if (!baseUrl.startsWith('http')) baseUrl = `http://${baseUrl}`;
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
  
  const wrapUrl = (url: string) => {
    if (!useProxy) return url;
    // corsproxy.io é mais estável para streams e JSONs grandes
    return `https://corsproxy.io/?${encodeURIComponent(url)}`;
  };

  const authParams = `username=${user}&password=${pass}`;
  const loginUrl = `${baseUrl}/player_api.php?${authParams}`;

  try {
    const response = await fetch(wrapUrl(loginUrl), { cache: 'no-store' });
    if (!response.ok) throw new Error(`Status ${response.status}: Servidor inacessível.`);
    
    const data = await response.json();
    if (!data.user_info || data.user_info.auth === 0) {
      throw new Error('Usuário ou Senha incorretos.');
    }

    // Buscamos as streams. Se uma falhar, as outras continuam.
    const fetchAction = async (action: string) => {
      try {
        const url = `${baseUrl}/player_api.php?${authParams}&action=${action}`;
        const res = await fetch(wrapUrl(url));
        if (!res.ok) return [];
        const json = await res.json();
        return Array.isArray(json) ? json : [];
      } catch (e) {
        console.warn(`Falha ao buscar ${action}:`, e);
        return [];
      }
    };

    // Buscamos canais, filmes e séries
    const [live, vod, series] = await Promise.all([
      fetchAction('get_live_streams'),
      fetchAction('get_vod_streams'),
      fetchAction('get_series')
    ]);

    const items: IPTVItem[] = [];

    // Processar Canais
    live.forEach((item: any) => {
      items.push({
        id: `live_${item.stream_id}`,
        name: item.name || 'Canal Sem Nome',
        logo: item.stream_icon || '',
        // Mudamos para .m3u8 para compatibilidade com HLS.js no navegador
        url: `${baseUrl}/live/${user}/${pass}/${item.stream_id}.m3u8`,
        category: item.category_name || 'Canais',
        group: 'Live'
      });
    });

    // Processar Filmes
    vod.forEach((item: any) => {
      const ext = item.container_extension || 'mp4';
      items.push({
        id: `vod_${item.stream_id}`,
        name: item.name || 'Filme Sem Nome',
        logo: item.stream_icon || '',
        url: `${baseUrl}/movie/${user}/${pass}/${item.stream_id}.${ext}`,
        category: item.category_name || 'Filmes',
        group: 'Movie'
      });
    });

    // Processar Séries
    series.forEach((item: any) => {
      items.push({
        id: `series_${item.series_id}`,
        name: item.name || 'Série Sem Nome',
        logo: item.cover || '',
        url: `SERIES_ID:${item.series_id}`, 
        category: item.category_name || 'Séries',
        group: 'Series'
      });
    });

    return items;
  } catch (error: any) {
    console.error('XC Fetch Error:', error);
    throw new Error(error.message || 'Erro de conexão. Verifique o Host e os dados.');
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
    
    if (data.episodes) {
      const seasons = Object.keys(data.episodes);
      if (seasons.length > 0) {
        const firstSeason = data.episodes[seasons[0]];
        const firstEpisode = Array.isArray(firstSeason) ? firstSeason[0] : firstSeason;
        if (firstEpisode) {
          const ext = firstEpisode.container_extension || 'mp4';
          const streamId = firstEpisode.id || firstEpisode.stream_id;
          return `${baseUrl}/series/${user}/${pass}/${streamId}.${ext}`;
        }
      }
    }
    throw new Error('Nenhum episódio encontrado.');
  } catch (e) {
    throw new Error('Erro ao carregar detalhes da série.');
  }
}
