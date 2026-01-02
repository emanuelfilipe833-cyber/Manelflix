
import React from 'react';
import { Play, Pause, Volume2, Maximize, ChevronLeft, Loader2 } from 'lucide-react';
import { IPTVItem, XCCredentials } from '../types';
import { getFirstEpisodeUrl } from '../utils/xtreamCodes';
import Hls from 'hls.js';

interface VideoPlayerProps {
  item: IPTVItem;
  onClose: () => void;
  creds?: XCCredentials; // Necessário para séries
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ item, onClose, creds }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);

  // Efeito para resolver a URL final (especialmente para séries)
  React.useEffect(() => {
    async function resolveUrl() {
      if (item.url.startsWith('SERIES_ID:')) {
        if (!creds) {
          setError('Credenciais ausentes para carregar série.');
          setIsLoading(false);
          return;
        }
        try {
          const seriesId = item.url.split(':')[1];
          const url = await getFirstEpisodeUrl(creds, seriesId);
          setVideoUrl(url);
        } catch (e) {
          setError('Não foi possível carregar os episódios desta série.');
          setIsLoading(false);
        }
      } else {
        setVideoUrl(item.url);
      }
    }
    resolveUrl();
  }, [item.url, creds]);

  // Efeito para o Player de Vídeo
  React.useEffect(() => {
    if (!videoUrl) return;
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    const isHlsSource = videoUrl.includes('.m3u8') || videoUrl.includes('.ts') || item.group === 'Live';

    if (isHlsSource) {
      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true
        });
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => setIsPlaying(false));
          setIsLoading(false);
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error('HLS Error:', data);
            setError('Erro ao reproduzir canal (HLS).');
            setIsLoading(false);
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = videoUrl;
        video.onloadedmetadata = () => {
          video.play();
          setIsLoading(false);
        };
      } else {
        setError('Navegador incompatível com este formato.');
        setIsLoading(false);
      }
    } else {
      // Reprodução Direta (MP4, MKV, AVI para Filmes/Séries)
      video.src = videoUrl;
      video.oncanplay = () => {
        video.play().catch(() => setIsPlaying(false));
        setIsLoading(false);
      };
      video.onerror = () => {
        setError('Erro ao carregar o arquivo de vídeo. O formato pode não ser suportado pelo navegador.');
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
      {/* Top Bar */}
      <div className="absolute top-0 left-0 w-full p-6 flex items-center justify-between bg-gradient-to-b from-black/90 to-transparent z-20">
        <button onClick={onClose} className="text-white hover:text-red-600 flex items-center gap-3 transition-colors">
          <ChevronLeft size={32} />
          <div className="text-left">
            <span className="block font-black text-xl uppercase tracking-tighter">{item.name}</span>
            <span className="block text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{item.group === 'Live' ? 'Ao Vivo' : (item.group === 'Movie' ? 'Filme' : 'Série')}</span>
          </div>
        </button>
      </div>

      {/* Main Player Area */}
      <div className="relative w-full h-full flex items-center justify-center">
        {isLoading && !error && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={48} className="text-red-600 animate-spin" />
            <p className="text-zinc-500 font-bold text-xs uppercase tracking-[0.2em]">Preparando Stream...</p>
          </div>
        )}

        {error ? (
          <div className="text-center px-8 max-w-md">
            <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-red-600 text-3xl font-bold">!</span>
            </div>
            <p className="text-white text-lg font-bold mb-2">Erro de Reprodução</p>
            <p className="text-zinc-500 text-sm mb-8 leading-relaxed">{error}</p>
            <button onClick={onClose} className="bg-white text-black px-8 py-3 rounded-full font-black uppercase text-xs tracking-widest hover:bg-zinc-200 transition">Voltar</button>
          </div>
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            playsInline
            onClick={togglePlay}
          />
        )}
        
        {!isPlaying && !error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
            <Play size={80} className="text-white opacity-80" fill="white" />
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      {!error && !isLoading && (
        <div className="absolute bottom-0 w-full p-8 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button onClick={togglePlay} className="text-white hover:text-red-600 transition-colors">
              {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
            </button>
            <div className="flex items-center gap-4">
              <Volume2 size={24} className="text-zinc-400" />
              <div className="w-24 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="w-2/3 h-full bg-red-600"></div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
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
