
import React from 'react';
import { BoardState, Position, Move, PlayerColor, Piece } from '../types';
import Square from './Square';
import { HEBREW_FILES, HEBREW_RANKS_DISPLAY } from '../constants';

interface BoardProps {
  boardData: BoardState;
  onSquareClick: (pos: Position) => void;
  selectedPiecePos: Position | null;
  possibleMoves: Move[];
  isCheck: boolean;
  kingPosIfInCheck: Position | null;
  playerColor: PlayerColor; 
  aiLastMove: Move | null;
  aiMoveAttentionKey: number; 
  isReplayActive: boolean; // New prop for replay state
}

const ChessBoard: React.FC<BoardProps> = ({ boardData, onSquareClick, selectedPiecePos, possibleMoves, isCheck, kingPosIfInCheck, playerColor, aiLastMove, aiMoveAttentionKey, isReplayActive }) => {
  const squareSizeClass = "w-12 h-12 md:w-16 md:h-16";
  const labelSizeClass = "w-6 h-6 md:w-8 md:h-8"; 
  const labelTextClass = "text-xs md:text-sm text-slate-200"; // Changed from text-slate-400

  return (
    <div className="inline-block">
      {/* Top Ranks */}
      <div className="flex">
        <div className={`${labelSizeClass} flex-shrink-0`}></div> 
        {HEBREW_FILES.map(file => (
          <div key={`top-file-${file}`} className={`${squareSizeClass} ${labelTextClass} flex items-center justify-center`}>
            {file}
          </div>
        ))}
        <div className={`${labelSizeClass} flex-shrink-0`}></div> 
      </div>

      {boardData.map((row, rIndex) => (
        <div key={`row-wrapper-${rIndex}`} className="flex">
          {/* Left Rank Label */}
          <div className={`${squareSizeClass} ${labelTextClass} flex items-center justify-center flex-shrink-0`} style={{width: labelSizeClass.match(/w-(\d+)/)?.[1] ? `${parseInt(labelSizeClass.match(/w-(\d+)/)?.[1] || '6', 10)/4}rem` : '1.5rem'}}>
             {HEBREW_RANKS_DISPLAY[rIndex]}
          </div>
          {/* Board Squares */}
          {row.map((square, cIndex) => {
            const currentPos = { row: rIndex, col: cIndex };
            const isLight = (rIndex + cIndex) % 2 === 0;
            const isSelected = selectedPiecePos?.row === rIndex && selectedPiecePos?.col === cIndex;
            const isPossible = possibleMoves.some(move => move.to.row === rIndex && move.to.col === cIndex);
            
            let isCheckSquareForThisKing = false;
            if (isCheck && kingPosIfInCheck) {
               const pieceOnSquare = boardData[rIndex][cIndex];
               if(pieceOnSquare && pieceOnSquare.type === 'K' && pieceOnSquare.color === boardData[kingPosIfInCheck.row][kingPosIfInCheck.col]?.color) {
                  isCheckSquareForThisKing = true;
               }
            }

            const isAiMoveFrom = !!aiLastMove && aiLastMove.from.row === rIndex && aiLastMove.from.col === cIndex;
            const isAiMoveTo = !!aiLastMove && aiLastMove.to.row === rIndex && aiLastMove.to.col === cIndex;

            // Replay specific highlights
            const isReplayHighlightFrom = isReplayActive && !!aiLastMove && aiLastMove.from.row === rIndex && aiLastMove.from.col === cIndex;
            // Highlight the square where the captured piece WAS, showing the captured piece during replay on the "before" board.
            const isReplayHighlightToCaptured = isReplayActive && !!aiLastMove && !!aiLastMove.capturedPiece && aiLastMove.to.row === rIndex && aiLastMove.to.col === cIndex;


            return (
              <Square
                key={`${rIndex}-${cIndex}`}
                squareData={square}
                position={currentPos}
                isLight={isLight}
                isSelected={isSelected}
                isPossibleMove={isPossible}
                isCheckSquare={isCheckSquareForThisKing}
                onClick={onSquareClick}
                isAiMoveFrom={isAiMoveFrom}
                isAiMoveTo={isAiMoveTo}
                aiMoveAttentionKey={aiMoveAttentionKey}
                isReplayActive={isReplayActive}
                isReplayHighlightFrom={isReplayHighlightFrom}
                isReplayHighlightToCaptured={isReplayHighlightToCaptured}
              />
            );
          })}
          {/* Right Rank Label */}
           <div className={`${squareSizeClass} ${labelTextClass} flex items-center justify-center flex-shrink-0`} style={{width: labelSizeClass.match(/w-(\d+)/)?.[1] ? `${parseInt(labelSizeClass.match(/w-(\d+)/)?.[1] || '6', 10)/4}rem` : '1.5rem'}}>
            {HEBREW_RANKS_DISPLAY[rIndex]}
          </div>
        </div>
      ))}
      
      {/* Bottom Ranks */}
       <div className="flex">
        <div className={`${labelSizeClass} flex-shrink-0`}></div> 
        {HEBREW_FILES.map(file => (
          <div key={`bottom-file-${file}`} className={`${squareSizeClass} ${labelTextClass} flex items-center justify-center`}>
            {file}
          </div>
        ))}
        <div className={`${labelSizeClass} flex-shrink-0`}></div> 
      </div>
    </div>
  );
};

export default ChessBoard;
