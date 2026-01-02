
import { IPTVItem, XCCredentials } from '../types';

export async function fetchXtreamCodes(creds: XCCredentials): Promise<IPTVItem[]> {
  const { host, user, pass, useProxy } = creds;
  let baseUrl = host.trim();
  if (!baseUrl.startsWith('http')) baseUrl = `http://${baseUrl}`;
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
  
  // Usando um proxy diferente e mais direto para evitar o erro "Oops" do allorigins
  const wrapUrl = (url: string) => {
    if (!useProxy) return url;
    // Tenta usar o codetabs que é mais limpo para APIs JSON
    return `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
  };

  const authParams = `username=${user}&password=${pass}`;
  const loginUrl = `${baseUrl}/player_api.php?${authParams}`;

  try {
    const response = await fetch(wrapUrl(loginUrl));
    if (!response.ok) throw new Error(`Servidor respondeu com status ${response.status}`);
    
    const data = await response.json();

    if (!data.user_info || data.user_info.auth === 0) {
      throw new Error('Credenciais inválidas ou conta expirada.');
    }

    // Função interna para buscar dados com tratamento de erro
    const fetchAction = async (action: string) => {
      const url = `${baseUrl}/player_api.php?${authParams}&action=${action}`;
      const res = await fetch(wrapUrl(url));
      return res.json();
    };

    // Buscamos os dados em paralelo
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
    if (error.message.includes('Unexpected token')) {
      throw new Error('O servidor IPTV retornou um erro ou o Proxy falhou. Tente desativar o Proxy ou verifique a URL.');
    }
    throw new Error(error.message || 'Erro de conexão com o servidor IPTV');
  }
}
