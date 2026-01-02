
import { IPTVItem, XCCredentials } from '../types';

export async function fetchXtreamCodes(creds: XCCredentials): Promise<IPTVItem[]> {
  const { host, user, pass } = creds;
  const baseUrl = host.endsWith('/') ? host.slice(0, -1) : host;
  const authParams = `username=${user}&password=${pass}`;
  
  const loginUrl = `${baseUrl}/player_api.php?${authParams}`;
  
  const response = await fetch(loginUrl);
  const data = await response.json();

  if (!data.user_info || data.user_info.auth === 0) {
    throw new Error('Falha na autenticação Xtream Codes');
  }

  // Fetch Live, VOD and Series
  const [live, vod, series] = await Promise.all([
    fetch(`${baseUrl}/player_api.php?${authParams}&action=get_live_streams`).then(res => res.json()),
    fetch(`${baseUrl}/player_api.php?${authParams}&action=get_vod_streams`).then(res => res.json()),
    fetch(`${baseUrl}/player_api.php?${authParams}&action=get_series`).then(res => res.json())
  ]);

  const items: IPTVItem[] = [];

  // Process Live
  if (Array.isArray(live)) {
    live.forEach((item: any) => {
      items.push({
        id: `live_${item.stream_id}`,
        name: item.name,
        logo: item.stream_icon,
        url: `${baseUrl}/live/${user}/${pass}/${item.stream_id}.ts`,
        category: item.category_id,
        group: 'Live'
      });
    });
  }

  // Process VOD
  if (Array.isArray(vod)) {
    vod.forEach((item: any) => {
      items.push({
        id: `vod_${item.stream_id}`,
        name: item.name,
        logo: item.stream_icon,
        url: `${baseUrl}/movie/${user}/${pass}/${item.stream_id}.${item.container_extension || 'mp4'}`,
        category: item.category_id,
        group: 'Movie'
      });
    });
  }

  // Process Series
  if (Array.isArray(series)) {
    series.forEach((item: any) => {
      items.push({
        id: `series_${item.series_id}`,
        name: item.name,
        logo: item.cover,
        url: `${baseUrl}/series/${user}/${pass}/${item.series_id}.mp4`, // Simplified for demo
        category: item.category_id,
        group: 'Series'
      });
    });
  }

  return items;
}
