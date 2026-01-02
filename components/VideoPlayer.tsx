
import React from 'react';
import { Play, Pause, Volume2, Maximize, ChevronLeft, Loader2, AlertTriangle } from 'lucide-react';
import { IPTVItem, XCCredentials } from '../types';
import { getFirstEpisodeUrl } from '../utils/xtreamCodes';
import Hls from 'hls.js';

interface VideoPlayerProps {
  item: IPTVItem;
  onClose: () => void;
  creds?: XCCredentials;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ item, onClose, creds }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function resolveUrl() {
      setIsLoading(true);
      setError(null);
      try {
        let rawUrl = '';
        if (item.url.startsWith('SERIES_ID:')) {
          if (!creds) throw new Error('Dados de acesso não encontrados.');
          const seriesId = item.url.split(':')[1];
          rawUrl = await getFirstEpisodeUrl(creds, seriesId);
        } else {
          rawUrl = item.url;
        }

        // Se o proxy estiver ativado e a URL for HTTP, usamos o proxy para o vídeo também
        // Isso ajuda a evitar o erro de "Mixed Content" (HTTPS vs HTTP)
        if (creds?.useProxy && rawUrl.startsWith('http:')) {
          setVideoUrl(`https://corsproxy.io/?${encodeURIComponent(rawUrl)}`);
        } else {
          setVideoUrl(rawUrl);
        }
      } catch (e: any) {
        setError(e.message || 'Erro ao obter link do vídeo.');
        setIsLoading(false);
      }
    }
    resolveUrl();
  }, [item.url, creds]);

  React.useEffect(() => {
    if (!videoUrl) return;
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    
    // Identifica se deve usar HLS (Canais .ts ou .m3u8)
    const isHlsSource = videoUrl.includes('.m3u8') || videoUrl.includes('.ts') || item.group === 'Live';

    if (isHlsSource) {
      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          xhrSetup: (xhr) => {
            xhr.withCredentials = false;
          }
        });
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => setIsPlaying(false));
          setIsLoading(false);
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error('Fatal HLS Error:', data);
            setError('Este formato de vídeo não pôde ser reproduzido pelo navegador.');
            setIsLoading(false);
          }
        });
      } else {
        video.src = videoUrl;
      }
    } else {
      // Filmes (MP4 e outros formatos nativos)
      video.src = videoUrl;
      video.oncanplay = () => {
        video.play().catch(() => setIsPlaying(false));
        setIsLoading(false);
      };
      video.onerror = () => {
        setError('O servidor recusou a conexão ou o formato do filme não é suportado pelo seu navegador.');
        setIsLoading(false);
      };
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [videoUrl, item.group]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute top-0 left-0 w-full p-6 flex items-center justify-between bg-gradient-to-b from-black/90 to-transparent z-20">
        <button onClick={onClose} className="text-white hover:text-red-600 flex items-center gap-3 transition-colors">
          <ChevronLeft size={32} />
          <div className="text-left">
            <span className="block font-black text-xl uppercase tracking-tighter truncate max-w-[200px] md:max-w-md">{item.name}</span>
            <span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
              {item.group === 'Live' ? 'TV AO VIVO' : (item.group === 'Movie' ? 'FILME' : 'SÉRIE')}
            </span>
          </div>
        </button>
      </div>

      <div className="relative w-full h-full flex items-center justify-center bg-zinc-950">
        {isLoading && !error && (
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <Loader2 size={40} className="text-red-600 animate-spin" />
            <p className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em]">Conectando ao Stream...</p>
          </div>
        )}

        {error ? (
          <div className="text-center px-8 max-w-sm">
            <div className="w-20 h-20 bg-red-600/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-600/20">
              <AlertTriangle className="text-red-600" size={32} />
            </div>
            <h3 className="text-white text-xl font-black uppercase mb-3 tracking-tighter">Ops! Falha no Vídeo</h3>
            <p className="text-zinc-500 text-xs mb-8 leading-relaxed font-medium uppercase tracking-wider">{error}</p>
            <div className="flex flex-col gap-2">
              <button onClick={onClose} className="bg-red-600 text-white w-full py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-red-700 transition active:scale-95 shadow-lg shadow-red-900/20">Tentar Outro</button>
              <p className="text-[9px] text-zinc-600 mt-4 uppercase font-bold">Dica: Tente ativar/desativar o Proxy nas configurações.</p>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            playsInline
            onClick={togglePlay}
            crossOrigin="anonymous"
          />
        )}
        
        {!isPlaying && !error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none transition-opacity">
            <Play size={80} className="text-white opacity-80" fill="white" />
          </div>
        )}
      </div>

      {!error && !isLoading && (
        <div className="absolute bottom-0 w-full p-8 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button onClick={togglePlay} className="text-white hover:text-red-600 transition-colors">
              {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
            </button>
            <div className="hidden md:flex items-center gap-4">
              <Volume2 size={24} className="text-zinc-400" />
              <div className="w-24 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="w-2/3 h-full bg-red-600"></div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => videoRef.current?.requestFullscreen()} className="text-white hover:text-red-600 transition-colors">
              <Maximize size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
