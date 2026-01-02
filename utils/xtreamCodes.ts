
import { IPTVItem, XCCredentials } from '../types';

export async function fetchXtreamCodes(creds: XCCredentials): Promise<IPTVItem[]> {
  const { host, user, pass, useProxy } = creds;
  let baseUrl = host.endsWith('/') ? host.slice(0, -1) : host;
  
  // Proxy utility to bypass CORS if enabled
  const wrapUrl = (url: string) => {
    if (!useProxy) return url;
    return `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  };

  const authParams = `username=${user}&password=${pass}`;
  const loginUrl = `${baseUrl}/player_api.php?${authParams}`;

  try {
    const response = await fetch(wrapUrl(loginUrl));
    let data;
    
    if (useProxy) {
      const json = await response.json();
      data = JSON.parse(json.contents);
    } else {
      data = await response.json();
    }

    if (!data.user_info || data.user_info.auth === 0) {
      throw new Error('Falha na autenticação Xtream Codes. Verifique usuário e senha.');
    }

    // Fetch actions
    const fetchAction = async (action: string) => {
      const url = `${baseUrl}/player_api.php?${authParams}&action=${action}`;
      const res = await fetch(wrapUrl(url));
      if (useProxy) {
        const j = await res.json();
        return JSON.parse(j.contents);
      }
      return res.json();
    };

    const [live, vod, series] = await Promise.all([
      fetchAction('get_live_streams'),
      fetchAction('get_vod_streams'),
      fetchAction('get_series')
    ]);

    const items: IPTVItem[] = [];

    if (Array.isArray(live)) {
      live.forEach((item: any) => {
        items.push({
          id: `live_${item.stream_id}`,
          name: item.name,
          logo: item.stream_icon,
          url: `${baseUrl}/live/${user}/${pass}/${item.stream_id}.ts`,
          category: item.category_name || 'Live',
          group: 'Live'
        });
      });
    }

    if (Array.isArray(vod)) {
      vod.forEach((item: any) => {
        items.push({
          id: `vod_${item.stream_id}`,
          name: item.name,
          logo: item.stream_icon,
          url: `${baseUrl}/movie/${user}/${pass}/${item.stream_id}.${item.container_extension || 'mp4'}`,
          category: item.category_name || 'Movie',
          group: 'Movie'
        });
      });
    }

    if (Array.isArray(series)) {
      series.forEach((item: any) => {
        items.push({
          id: `series_${item.series_id}`,
          name: item.name,
          logo: item.cover,
          url: `${baseUrl}/series/${user}/${pass}/${item.series_id}.mp4`,
          category: item.category_name || 'Series',
          group: 'Series'
        });
      });
    }

    return items;
  } catch (error: any) {
    console.error('XC Fetch Error:', error);
    throw new Error(error.message || 'Erro de conexão com o servidor IPTV');
  }
}
