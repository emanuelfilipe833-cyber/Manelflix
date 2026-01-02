
import React from 'react';
import { X, Play, Loader2, ChevronDown, Star, Calendar, User, Film } from 'lucide-react';
import { IPTVItem, XCCredentials, SeriesInfo, Episode } from '../types';
import { getSeriesInfo, getEpisodeStreamUrl } from '../utils/xtreamCodes';

interface SeriesDetailsProps {
  item: IPTVItem;
  creds: XCCredentials;
  onClose: () => void;
  onPlayEpisode: (url: string, title: string) => void;
}

const SeriesDetails: React.FC<SeriesDetailsProps> = ({ item, creds, onClose, onPlayEpisode }) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<SeriesInfo | null>(null);
  const [selectedSeason, setSelectedSeason] = React.useState<string>('');

  React.useEffect(() => {
    async function load() {
      try {
        const seriesId = item.url.split(':')[1];
        const data = await getSeriesInfo(creds, seriesId);
        setInfo(data);
        const seasons = Object.keys(data.seasons);
        if (seasons.length > 0) setSelectedSeason(seasons[0]);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [item, creds]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[80] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center">
        <Loader2 size={48} className="text-red-600 animate-spin mb-4" />
        <span className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.4em]">Carregando Temporadas...</span>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="fixed inset-0 z-[80] bg-black flex items-center justify-center p-10">
        <div className="text-center">
          <p className="text-red-500 mb-6 font-bold uppercase text-xs">{error || 'Erro ao carregar série.'}</p>
          <button onClick={onClose} className="bg-white text-black px-8 py-3 rounded-full font-black text-[10px] uppercase">Voltar</button>
        </div>
      </div>
    );
  }

  const episodes = info.seasons[selectedSeason] || [];

  return (
    <div className="fixed inset-0 z-[80] bg-black overflow-y-auto hide-scrollbar animate-in fade-in zoom-in duration-300">
      {/* Background Hero */}
      <div className="relative h-[60vh] w-full overflow-hidden">
        <img src={info.cover} className="w-full h-full object-cover opacity-30 blur-sm scale-110" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-red-600 rounded-full transition-all z-[90]">
          <X size={24} className="text-white" />
        </button>

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="bg-red-600 text-[10px] font-black px-2 py-1 rounded">SÉRIE</span>
            {info.rating && (
              <span className="flex items-center gap-1 text-yellow-500 font-bold text-sm">
                <Star size={14} fill="currentColor" /> {info.rating}
              </span>
            )}
            {info.releaseDate && (
              <span className="text-zinc-400 text-sm flex items-center gap-1">
                <Calendar size={14} /> {info.releaseDate}
              </span>
            )}
          </div>
          <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tighter italic">{info.name}</h1>
          <p className="text-zinc-400 text-xs md:text-base max-w-2xl line-clamp-3 md:line-clamp-none font-medium leading-relaxed">
            {info.plot}
          </p>
          <div className="flex flex-wrap gap-6 pt-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">
            {info.director && <span className="flex items-center gap-2"><Film size={14}/> Dir: {info.director}</span>}
            {info.cast && <span className="flex items-center gap-2"><User size={14}/> Elenco: {info.cast}</span>}
          </div>
        </div>
      </div>

      {/* Seasons & Episodes */}
      <div className="p-6 md:p-12 space-y-8 bg-black">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <h2 className="text-2xl font-black uppercase tracking-tighter italic">Episódios</h2>
          
          {/* Season Selector */}
          <div className="relative">
            <select 
              value={selectedSeason} 
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="appearance-none bg-zinc-900 border border-zinc-800 text-white px-6 py-3 pr-12 rounded-xl text-xs font-black uppercase tracking-widest outline-none focus:border-red-600 transition-all w-full md:w-auto"
            >
              {Object.keys(info.seasons).map(num => (
                <option key={num} value={num}>Temporada {num}</option>
              ))}
            </select>
            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500" />
          </div>
        </div>

        {/* Episode List */}
        <div className="grid grid-cols-1 gap-4">
          {episodes.map((ep, idx) => (
            <div 
              key={ep.id} 
              onClick={() => onPlayEpisode(getEpisodeStreamUrl(creds, ep.id, ep.container_extension), `${info.name} - E${ep.episode_num}`)}
              className="group flex items-center gap-4 p-4 bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-800/50 rounded-2xl cursor-pointer transition-all active:scale-[0.98]"
            >
              <div className="w-12 h-12 flex-shrink-0 bg-red-600/10 rounded-xl flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all">
                <Play size={20} fill="currentColor" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mb-1">Episódio {ep.episode_num}</span>
                <h3 className="text-sm font-bold truncate uppercase tracking-tight">{ep.title || `Episódio ${ep.episode_num}`}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SeriesDetails;
