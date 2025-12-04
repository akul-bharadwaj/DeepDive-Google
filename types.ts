export enum Difficulty {
  Easy = 3,   // 3x3
  Medium = 5, // 5x5
  Hard = 10   // 10x10
}

export interface Point {
  x: number;
  y: number;
}

export interface PieceShape {
  top: number;    // 0: flat, 1: tab, -1: slot
  right: number;
  bottom: number;
  left: number;
}

export interface PuzzlePiece {
  id: number;
  row: number;
  col: number;
  correctPos: Point; // The target position on the board (pixels)
  currentPos: Point; // The current position (pixels)
  shape: PieceShape;
  imgUrl: string;    // Data URL for this specific piece
  width: number;
  height: number;
  isLocked: boolean; // True if snapped to correct position
  zIndex: number;
}

export interface GameState {
  isPlaying: boolean;
  imageSrc: string | null;
  difficulty: Difficulty;
  pieces: PuzzlePiece[];
  containerSize: { width: number; height: number };
  pieceSize: { width: number; height: number };
}
