import { Difficulty, PieceShape, PuzzlePiece } from '../types';
import { TAB_SIZE_RATIO } from '../constants';

export const generatePuzzle = async (
  imageSrc: string,
  gridSize: Difficulty,
  maxContainerWidth: number,
  maxContainerHeight: number
): Promise<{ pieces: PuzzlePiece[], puzzleWidth: number, puzzleHeight: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      const { width: imgW, height: imgH } = img;
      
      // Calculate Aspect Ratio to fit within max container bounds
      const imageAspect = imgW / imgH;
      const containerAspect = maxContainerWidth / maxContainerHeight;
      
      let puzzleWidth, puzzleHeight;
      
      if (imageAspect > containerAspect) {
        // Image is wider than container relative to height
        puzzleWidth = maxContainerWidth;
        puzzleHeight = maxContainerWidth / imageAspect;
      } else {
        // Image is taller
        puzzleHeight = maxContainerHeight;
        puzzleWidth = maxContainerHeight * imageAspect;
      }

      // Calculate Rows & Cols to ensure square pieces (1:1 aspect ratio)
      let rows, cols;
      if (imageAspect >= 1) {
        // Landscape or square
        rows = gridSize;
        cols = Math.round(gridSize * imageAspect);
      } else {
        // Portrait
        cols = gridSize;
        rows = Math.round(gridSize * (1 / imageAspect));
      }
      
      const pieceWidth = puzzleWidth / cols;
      const pieceHeight = puzzleHeight / rows;
      
      // Restore grooves: Calculate tab size relative to piece size
      const tabSize = Math.min(pieceWidth, pieceHeight) * TAB_SIZE_RATIO;

      // 1. Generate Shapes Grid
      const shapes: PieceShape[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          shapes[r][c] = {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
          };
          
          // Determine shapes based on neighbors
          
          // Top: if not first row, match the bottom of the piece above
          if (r > 0) {
            shapes[r][c].top = -shapes[r-1][c].bottom;
          }
          
          // Left: if not first col, match the right of the piece to the left
          if (c > 0) {
            shapes[r][c].left = -shapes[r][c-1].right;
          }
          
          // Right: if not last col, random tab(1) or slot(-1)
          if (c < cols - 1) {
            shapes[r][c].right = Math.random() > 0.5 ? 1 : -1;
          }
          
          // Bottom: if not last row, random tab(1) or slot(-1)
          if (r < rows - 1) {
            shapes[r][c].bottom = Math.random() > 0.5 ? 1 : -1;
          }
        }
      }

      // 2. Create Canvases for each piece
      const pieces: PuzzlePiece[] = [];
      let loadedCount = 0;
      const totalPieces = rows * cols;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const shape = shapes[r][c];
          
          const canvasWidth = pieceWidth + tabSize * 2;
          const canvasHeight = pieceHeight + tabSize * 2;

          const canvas = document.createElement('canvas');
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          const ctx = canvas.getContext('2d');

          if (!ctx) continue;

          // Offset to draw (centering the main piece body in the canvas)
          const offsetX = tabSize;
          const offsetY = tabSize;

          // -- DRAW SHAPE & CLIP --
          ctx.save();
          drawJigsawPath(ctx, offsetX, offsetY, pieceWidth, pieceHeight, shape, tabSize);
          ctx.clip();

          // -- DRAW IMAGE --
          // Calculate where this piece is in the global puzzle coordinates
          const globalX = c * pieceWidth - tabSize;
          const globalY = r * pieceHeight - tabSize;

          // Draw the *entire* image scaled to the puzzle size, but translated 
          // so only the relevant part for this piece is visible through the clip.
          ctx.drawImage(
            img,
            0, 0, img.width, img.height,         // Source: Full image
            -globalX, -globalY, puzzleWidth, puzzleHeight // Dest: Shifted and Scaled
          );
          
          ctx.restore();

          // -- STROKE BORDER --
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 1;
          drawJigsawPath(ctx, offsetX, offsetY, pieceWidth, pieceHeight, shape, tabSize);
          ctx.stroke();
          ctx.restore();
          
          // -- BEVEL/HIGHLIGHT EFFECT --
          ctx.save();
          drawJigsawPath(ctx, offsetX, offsetY, pieceWidth, pieceHeight, shape, tabSize);
          ctx.clip();
          
          // Simplified 3D effect
          ctx.globalCompositeOperation = 'source-atop';
          
          // Shadow
          ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
          ctx.shadowBlur = 2;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
          ctx.fillStyle = 'rgba(0,0,0,0)';
          ctx.fillRect(0,0, canvasWidth, canvasHeight);
          
          // Highlight (Top/Left)
          ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
          ctx.shadowBlur = 2;
          ctx.shadowOffsetX = -1;
          ctx.shadowOffsetY = -1;
          ctx.fillRect(0,0, canvasWidth, canvasHeight);
          
          ctx.restore();

          // Add to pieces array
          pieces.push({
            id: r * cols + c,
            row: r,
            col: c,
            width: canvasWidth,
            height: canvasHeight,
            shape: shape,
            correctPos: {
              x: c * pieceWidth - tabSize, 
              y: r * pieceHeight - tabSize
            },
            currentPos: {
              x: 0, // Will be randomized by game component
              y: 0
            },
            imgUrl: canvas.toDataURL(),
            isLocked: false,
            zIndex: 1
          });

          loadedCount++;
          if (loadedCount === totalPieces) {
            resolve({ pieces, puzzleWidth, puzzleHeight });
          }
        }
      }
    };
    img.onerror = reject;
  });
};

function drawJigsawPath(
  ctx: CanvasRenderingContext2D, 
  x: number, y: number, 
  w: number, h: number, 
  shape: PieceShape,
  tabSize: number
) {
  ctx.beginPath();
  
  // Top
  ctx.moveTo(x, y);
  if (shape.top !== 0) {
    drawTab(ctx, x, y, x + w, y, shape.top, tabSize);
  } else {
    ctx.lineTo(x + w, y);
  }

  // Right
  if (shape.right !== 0) {
    drawTab(ctx, x + w, y, x + w, y + h, shape.right, tabSize);
  } else {
    ctx.lineTo(x + w, y + h);
  }

  // Bottom
  if (shape.bottom !== 0) {
    drawTab(ctx, x + w, y + h, x, y + h, shape.bottom, tabSize);
  } else {
    ctx.lineTo(x, y + h);
  }

  // Left
  if (shape.left !== 0) {
    drawTab(ctx, x, y + h, x, y, shape.left, tabSize);
  } else {
    ctx.lineTo(x, y);
  }
  
  ctx.closePath();
}

function drawTab(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, dir: number, size: number) {
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx*dx + dy*dy);
  
  const nx = -dy / len * dir;
  const ny = dx / len * dir;

  const neck = len * 0.2; 
  
  const x1_neck = cx - (dx / len) * neck;
  const y1_neck = cy - (dy / len) * neck;
  
  const x2_neck = cx + (dx / len) * neck;
  const y2_neck = cy + (dy / len) * neck;

  const headX = cx + nx * size;
  const headY = cy + ny * size;

  ctx.bezierCurveTo(
    x1_neck + nx * (size * 0.2), y1_neck + ny * (size * 0.2),
    headX - (dx/len) * (size), headY - (dy/len) * (size*0.2),
    headX - (dx/len) * (size * 0.2), headY
  );
  
  ctx.bezierCurveTo(
    headX + (dx/len) * (size * 0.2), headY,
    headX + (dx/len) * (size), headY + (dy/len) * (size*0.2),
    x2_neck + nx * (size * 0.2), y2_neck + ny * (size * 0.2)
  );
  
  ctx.lineTo(x2, y2);
}