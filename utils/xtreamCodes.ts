
import { IPTVItem, XCCredentials } from '../types';

export async function fetchXtreamCodes(creds: XCCredentials): Promise<IPTVItem[]> {
  const { host, user, pass, useProxy } = creds;
  let baseUrl = host.trim();
  
  // Garantir que comece com http e não tenha barra no final
  if (!baseUrl.startsWith('http')) baseUrl = `http://${baseUrl}`;
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
  
  /**
   * O erro "Failed to fetch" geralmente é causado por:
   * 1. Bloqueio de Conteúdo Misto (App HTTPS tentando acessar Servidor IPTV HTTP)
   * 2. Bloqueio de CORS
   * 3. O proxy escolhido está fora do ar ou bloqueando a requisição.
   */
  const wrapUrl = (url: string) => {
    if (!useProxy) return url;
    // corsproxy.io é atualmente um dos mais estáveis para IPTV
    return `https://corsproxy.io/?${encodeURIComponent(url)}`;
  };

  const authParams = `username=${user}&password=${pass}`;
  const loginUrl = `${baseUrl}/player_api.php?${authParams}`;

  try {
    const response = await fetch(wrapUrl(loginUrl), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Alguns proxies precisam de sinalização extra ou cache skip
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`O servidor IPTV ou o Proxy retornou erro ${response.status}.`);
    }
    
    const data = await response.json();

    if (!data.user_info || data.user_info.auth === 0) {
      throw new Error('Usuário ou Senha incorretos no servidor IPTV.');
    }

    // Função interna para buscar dados com tratamento de erro
    const fetchAction = async (action: string) => {
      const url = `${baseUrl}/player_api.php?${authParams}&action=${action}`;
      const res = await fetch(wrapUrl(url));
      if (!res.ok) return [];
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
    
    if (error.message === 'Failed to fetch') {
      throw new Error('Falha de Conexão: O servidor IPTV recusou a conexão ou o Proxy falhou. Tente ativar/desativar o Proxy.');
    }
    
    if (error.message.includes('Unexpected token')) {
      throw new Error('Erro de Formato: O servidor IPTV enviou uma resposta que não é um JSON válido. Verifique se o endereço (Host) está correto.');
    }
    
    throw new Error(error.message || 'Erro desconhecido ao conectar com Xtream Codes.');
  }
}
