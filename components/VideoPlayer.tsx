
import React from 'react';
import { Play, Pause, Volume2, Maximize, ChevronLeft, Loader2, AlertTriangle, RefreshCcw } from 'lucide-react';
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
  const [retryCount, setRetryCount] = React.useState(0);

  // 1. RESOLVER A URL (Lidar com Proxy e Séries)
  React.useEffect(() => {
    async function resolveUrl() {
      setIsLoading(true);
      setError(null);
      try {
        let rawUrl = '';
        if (item.url.startsWith('SERIES_ID:')) {
          if (!creds) throw new Error('Credenciais ausentes.');
          rawUrl = await getFirstEpisodeUrl(creds, item.url.split(':')[1]);
        } else {
          rawUrl = item.url;
        }

        // Se o site for HTTPS e o vídeo HTTP, precisamos do proxy ou o Chrome bloqueia
        // Usamos um proxy que suporta streaming de vídeo
        if (creds?.useProxy && rawUrl.startsWith('http:')) {
          setVideoUrl(`https://corsproxy.io/?${encodeURIComponent(rawUrl)}`);
        } else {
          setVideoUrl(rawUrl);
        }
      } catch (e: any) {
        setError(e.message || 'Erro ao obter link.');
        setIsLoading(false);
      }
    }
    resolveUrl();
  }, [item.url, creds, retryCount]);

  // 2. MOTOR DE REPRODUÇÃO
  React.useEffect(() => {
    if (!videoUrl) return;
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    const isHls = videoUrl.includes('.m3u8') || item.group === 'Live';

    const handleFatalError = (msg: string) => {
      console.error(msg);
      setError(msg);
      setIsLoading(false);
    };

    if (isHls) {
      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          // Aumentamos o buffer para evitar travamentos
          maxBufferLength: 30,
          maxMaxBufferLength: 60
        });
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => setIsPlaying(false));
          setIsLoading(false);
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              handleFatalError("Erro de rede. O servidor IPTV pode estar bloqueando o acesso via navegador.");
            } else {
              handleFatalError("Formato de vídeo incompatível com este navegador.");
            }
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
      // FILMES (MP4/MKV/AVI)
      video.src = videoUrl;
      video.oncanplay = () => {
        video.play().catch(() => setIsPlaying(false));
        setIsLoading(false);
      };
      video.onerror = () => {
        handleFatalError("Não foi possível carregar este filme. Tente desativar o Proxy nas configurações.");
      };
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [videoUrl]);

  const togglePlay = () => {
    if (videoRef.current?.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
      {/* Top Bar */}
      <div className="absolute top-0 w-full p-6 flex items-center justify-between bg-gradient-to-b from-black/100 to-transparent z-50">
        <button onClick={onClose} className="text-white flex items-center gap-3">
          <ChevronLeft size={32} className="hover:text-red-600 transition" />
          <div className="text-left overflow-hidden">
            <span className="block font-black text-lg uppercase truncate max-w-[200px]">{item.name}</span>
            <span className="block text-[9px] text-zinc-500 font-bold tracking-[0.2em]">{item.group}</span>
          </div>
        </button>
      </div>

      <div className="relative w-full h-full flex items-center justify-center">
        {isLoading && !error && (
          <div className="flex flex-col items-center gap-5">
            <Loader2 size={40} className="text-red-600 animate-spin" />
            <p className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.4em] animate-pulse">Sincronizando Stream</p>
          </div>
        )}

        {error ? (
          <div className="text-center px-10 max-w-sm">
            <div className="bg-red-600/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-600/20">
              <AlertTriangle className="text-red-600" size={32} />
            </div>
            <h3 className="text-white text-lg font-black uppercase mb-2 tracking-tighter italic">Falha no Carregamento</h3>
            <p className="text-zinc-500 text-[11px] mb-8 leading-relaxed font-bold uppercase">{error}</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => setRetryCount(c => c + 1)} className="bg-white text-black w-full py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
                <RefreshCcw size={14} /> Tentar Novamente
              </button>
              <button onClick={onClose} className="text-zinc-500 font-black uppercase text-[9px] hover:text-white transition">Fechar Player</button>
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
          <button onClick={togglePlay} className="text-white hover:text-red-600 transition-colors">
            {isPlaying ? <Pause size={36} fill="white" /> : <Play size={36} fill="white" />}
          </button>
          <button onClick={() => videoRef.current?.requestFullscreen()} className="text-white hover:text-zinc-400">
            <Maximize size={24} />
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
