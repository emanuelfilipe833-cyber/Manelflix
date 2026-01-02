
import React from 'react';
import { Play, Pause, Volume2, Maximize, ChevronLeft, Loader2, AlertTriangle, ExternalLink, RefreshCcw } from 'lucide-react';
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
  const [rawUrl, setRawUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function resolveUrl() {
      setIsLoading(true);
      setError(null);
      try {
        let url = '';
        if (item.url.startsWith('SERIES_ID:')) {
          if (!creds) throw new Error('Credenciais não encontradas.');
          url = await getFirstEpisodeUrl(creds, item.url.split(':')[1]);
        } else {
          url = item.url;
        }
        setRawUrl(url);

        // Se o site é HTTPS e o vídeo HTTP, precisamos do proxy para o Chrome não bloquear
        if (creds?.useProxy && url.startsWith('http:')) {
          setVideoUrl(`https://corsproxy.io/?${encodeURIComponent(url)}`);
        } else {
          setVideoUrl(url);
        }
      } catch (e: any) {
        setError(e.message || 'Erro ao preparar vídeo.');
        setIsLoading(false);
      }
    }
    resolveUrl();
  }, [item.url, creds]);

  React.useEffect(() => {
    if (!videoUrl) return;
    const video = videoRef.current;
    if (!video) return;

    let hls: null | Hls = null;
    const isHls = videoUrl.includes('.m3u8');
    const isTs = videoUrl.includes('.ts') || item.group === 'Live';

    if (isHls) {
      if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: true });
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => setIsPlaying(false));
          setIsLoading(false);
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            setError('O servidor recusou a conexão ou o formato .m3u8 é inválido.');
            setIsLoading(false);
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = videoUrl;
        video.onloadedmetadata = () => {
          video.play().catch(() => {});
          setIsLoading(false);
        };
      }
    } else {
      // Para arquivos .ts ou filmes (.mp4)
      video.src = videoUrl;
      video.oncanplay = () => {
        video.play().catch(() => setIsPlaying(false));
        setIsLoading(false);
      };
      video.onerror = () => {
        if (isTs) {
          setError('Canais .ts não são suportados nativamente pelo Chrome/Edge. Clique no botão abaixo para abrir externamente.');
        } else {
          setError('Este formato de vídeo não pôde ser reproduzido pelo navegador.');
        }
        setIsLoading(false);
      };
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [videoUrl, item.group]);

  const togglePlay = () => {
    if (videoRef.current?.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
  };

  const openExternal = () => {
    if (rawUrl) window.open(rawUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* Header Player */}
      <div className="absolute top-0 w-full p-6 flex items-center justify-between bg-gradient-to-b from-black to-transparent z-50">
        <button onClick={onClose} className="text-white hover:text-red-600 transition-colors flex items-center gap-4">
          <ChevronLeft size={32} />
          <div className="text-left">
            <h2 className="font-black text-lg uppercase tracking-tight truncate max-w-[200px]">{item.name}</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{item.group}</p>
          </div>
        </button>
      </div>

      <div className="relative w-full h-full flex items-center justify-center bg-zinc-950">
        {isLoading && !error && (
          <div className="flex flex-col items-center gap-5">
            <Loader2 size={44} className="text-red-600 animate-spin" />
            <p className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.4em] animate-pulse">Iniciando Stream</p>
          </div>
        )}

        {error ? (
          <div className="text-center px-10 max-w-sm">
            <div className="w-16 h-16 bg-red-600/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-600/20">
              <AlertTriangle className="text-red-600" size={32} />
            </div>
            <h3 className="text-white text-xl font-black uppercase mb-3 tracking-tighter">Erro na Reprodução</h3>
            <p className="text-zinc-500 text-xs mb-10 leading-relaxed font-bold uppercase italic">{error}</p>
            
            <div className="flex flex-col gap-3">
              <button onClick={openExternal} className="bg-red-600 text-white w-full py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-red-700 active:scale-95 transition shadow-lg shadow-red-900/20">
                <ExternalLink size={16} /> Abrir Link Direto
              </button>
              <button onClick={onClose} className="text-zinc-500 font-black uppercase text-[10px] hover:text-white transition py-2">Voltar à Lista</button>
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
      </div>

      {!error && !isLoading && (
        <div className="absolute bottom-0 w-full p-10 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-between z-50">
          <div className="flex items-center gap-8">
            <button onClick={togglePlay} className="text-white hover:text-red-600 transition-colors">
              {isPlaying ? <Pause size={38} fill="white" /> : <Play size={38} fill="white" />}
            </button>
          </div>
          <div className="flex items-center gap-6">
             <button onClick={openExternal} className="text-zinc-400 hover:text-white transition-colors" title="Abrir em Nova Aba">
              <ExternalLink size={24} />
            </button>
            <button onClick={() => videoRef.current?.requestFullscreen()} className="text-white hover:text-red-600 transition-colors">
              <Maximize size={28} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
