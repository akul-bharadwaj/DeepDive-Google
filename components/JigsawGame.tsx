import React, { useState, useEffect, useRef } from 'react';
import { Difficulty, PuzzlePiece } from '../types';
import { generatePuzzle } from '../utils/puzzleGenerator';
import { SNAP_TOLERANCE } from '../constants';
import { Loader2, CheckCircle, RefreshCcw, Clock } from 'lucide-react';

interface JigsawGameProps {
  imageSrc: string;
  difficulty: Difficulty;
  onBack: () => void;
}

export const JigsawGame: React.FC<JigsawGameProps> = ({ imageSrc, difficulty, onBack }) => {
  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [draggedPieceId, setDraggedPieceId] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [completed, setCompleted] = useState(false);
  
  // Timer state
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize game
  useEffect(() => {
    const initGame = async () => {
      if (!containerRef.current) return;
      setIsLoading(true);
      setCompleted(false);
      setStartTime(null);
      setElapsedTime(0);
      setTimerActive(false);

      const { clientWidth, clientHeight } = containerRef.current;
      // Leave padding for UI and comfort
      const maxWidth = clientWidth - 48; 
      const maxHeight = clientHeight - 48;

      try {
        const { pieces: generatedPieces, puzzleWidth, puzzleHeight } = await generatePuzzle(
          imageSrc, 
          difficulty, 
          maxWidth, 
          maxHeight
        );

        setContainerSize({ width: puzzleWidth, height: puzzleHeight });

        // Randomize initial positions scattered around the board
        const shuffled = generatedPieces.map(p => ({
            ...p,
            currentPos: {
                x: Math.random() * (puzzleWidth - p.width) * 1.2 - (puzzleWidth * 0.1),
                y: Math.random() * (puzzleHeight - p.height) * 1.2 - (puzzleHeight * 0.1)
            }
        }));
        setPieces(shuffled);
      } catch (err) {
        console.error("Failed to generate puzzle", err);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(initGame, 100);
    window.addEventListener('resize', initGame);
    return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', initGame);
    };
  }, [imageSrc, difficulty]);

  // Timer Effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerActive && !completed) {
      if (!startTime) setStartTime(Date.now());
      
      interval = setInterval(() => {
        if (startTime) {
          setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, completed, startTime]);

  // Check completion
  useEffect(() => {
    if (pieces.length > 0 && pieces.every(p => p.isLocked)) {
      setCompleted(true);
      setTimerActive(false);
    }
  }, [pieces]);

  const handlePointerDown = (e: React.PointerEvent, pieceId: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Start timer on first interaction
    if (!timerActive && !completed) {
      setTimerActive(true);
      setStartTime(Date.now());
    }

    const piece = pieces.find(p => p.id === pieceId);
    if (!piece || piece.isLocked) return;

    // Bring to front
    const maxZ = Math.max(...pieces.map(p => p.zIndex), 1);
    setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, zIndex: maxZ + 1 } : p));

    setDraggedPieceId(pieceId);
    
    const boardRect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    
    // Offset = Mouse position relative to piece TopLeft
    const offsetX = e.clientX - (boardRect.left + piece.currentPos.x);
    const offsetY = e.clientY - (boardRect.top + piece.currentPos.y);

    setDragOffset({ x: offsetX, y: offsetY });
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggedPieceId === null || !containerRef.current) return;
    e.preventDefault();

    const board = containerRef.current.firstElementChild as HTMLElement;
    if (!board) return;
    
    const boardRect = board.getBoundingClientRect();

    const newX = e.clientX - boardRect.left - dragOffset.x;
    const newY = e.clientY - boardRect.top - dragOffset.y;

    setPieces(prev => prev.map(p => {
      if (p.id !== draggedPieceId) return p;
      return { ...p, currentPos: { x: newX, y: newY } };
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggedPieceId === null) return;
    e.preventDefault();
    
    const piece = pieces.find(p => p.id === draggedPieceId);
    if (piece) {
      // Check snap
      const dist = Math.sqrt(
        Math.pow(piece.currentPos.x - piece.correctPos.x, 2) + 
        Math.pow(piece.currentPos.y - piece.correctPos.y, 2)
      );

      if (dist < SNAP_TOLERANCE) {
        // Snap!
        setPieces(prev => prev.map(p => {
          if (p.id !== draggedPieceId) return p;
          return { ...p, currentPos: p.correctPos, isLocked: true, zIndex: 0 }; // Send locked to back
        }));
      }
    }
    
    setDraggedPieceId(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full relative">
      {/* Controls Header */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-50 pointer-events-none">
        <button 
          onClick={onBack}
          className="bg-slate-800/80 backdrop-blur text-white px-4 py-2 rounded-lg pointer-events-auto hover:bg-slate-700 transition shadow-lg border border-slate-600 flex items-center gap-2"
        >
          <span>← Back</span>
        </button>

        <div className="flex items-center gap-4">
          <div className="bg-slate-800/80 backdrop-blur px-4 py-2 rounded-lg text-emerald-400 font-mono text-lg font-bold shadow-lg border border-slate-600 flex items-center gap-2">
             <Clock className="w-5 h-5" />
             {formatTime(elapsedTime)}
          </div>
          <div className="bg-slate-800/80 backdrop-blur px-4 py-2 rounded-lg text-white font-mono text-sm shadow-lg border border-slate-600">
             {pieces.filter(p => p.isLocked).length} / {pieces.length}
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div 
        ref={containerRef}
        className="relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-900 touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-4 text-slate-400">
             <Loader2 className="w-10 h-10 animate-spin" />
             <p>Cutting pieces...</p>
          </div>
        ) : (
          <div 
            className="relative shadow-2xl bg-slate-800/50 border-2 border-slate-700/50 rounded-lg transition-all duration-300"
            style={{ width: containerSize.width, height: containerSize.height }}
          >
             {/* Guide Image (Ghost) */}
             <div 
               className="absolute inset-0 opacity-10 pointer-events-none grayscale transition-opacity hover:opacity-20"
               style={{ 
                 backgroundImage: `url(${imageSrc})`, 
                 backgroundSize: '100% 100%',
                 backgroundRepeat: 'no-repeat'
               }}
             />

             {/* Pieces */}
             {pieces.map((piece) => (
                <div
                  key={piece.id}
                  className="absolute touch-none select-none"
                  style={{
                    transform: `translate(${piece.currentPos.x}px, ${piece.currentPos.y}px)`,
                    width: piece.width,
                    height: piece.height,
                    zIndex: piece.zIndex,
                    cursor: piece.isLocked ? 'default' : 'grab',
                    transition: draggedPieceId === piece.id ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    filter: piece.isLocked ? 'brightness(100%)' : draggedPieceId === piece.id ? 'drop-shadow(0 10px 15px rgba(0,0,0,0.5)) brightness(110%)' : 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))'
                  }}
                  onPointerDown={(e) => handlePointerDown(e, piece.id)}
                >
                  <img 
                    src={piece.imgUrl} 
                    alt=""
                    className="w-full h-full pointer-events-none select-none block"
                    draggable={false}
                  />
                </div>
             ))}
          </div>
        )}
      </div>

      {/* Completion Modal */}
      {completed && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl text-center border border-emerald-500/30 max-w-sm mx-4 transform transition-all animate-in zoom-in-95">
            <CheckCircle className="w-20 h-20 text-emerald-400 mx-auto mb-4 drop-shadow-lg" />
            <h2 className="text-3xl font-bold text-white mb-2">Puzzle Solved!</h2>
            <p className="text-slate-300">Great job!</p>
            <p className="text-2xl font-mono text-emerald-300 mb-8">{formatTime(elapsedTime)}</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={onBack}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2"
              >
                <RefreshCcw className="w-5 h-5" /> Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};