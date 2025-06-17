import React, { useState, useEffect } from 'react';
import { SquareState, Position } from '../types';
import PieceDisplay from './Piece';

interface SquareProps {
  squareData: SquareState;
  position: Position;
  isLight: boolean;
  isSelected: boolean;
  isPossibleMove: boolean;
  isCheckSquare: boolean;
  onClick: (pos: Position) => void;
  isAiMoveFrom: boolean;
  isAiMoveTo: boolean;
  aiMoveAttentionKey: number;
  isReplayActive: boolean; // New: Is the replay animation active?
  isReplayHighlightFrom?: boolean; // New: Highlight for AI piece's original square during replay
  isReplayHighlightToCaptured?: boolean; // New: Highlight for captured piece's square during replay
}

const Square: React.FC<SquareProps> = ({ 
  squareData, position, isLight, isSelected, isPossibleMove, isCheckSquare, onClick, 
  isAiMoveFrom, isAiMoveTo, aiMoveAttentionKey,
  isReplayActive, isReplayHighlightFrom, isReplayHighlightToCaptured 
}) => {
  // צבעי עץ: בהיר - #ecdab0, כהה - #b58863
  const bgClass = isLight ? 'bg-[#ecdab0]' : 'bg-[#b58863]';
  const borderClass = 'border border-[#a67c52]'; // גבול חום עדין
  const squareSizeClass = "w-12 h-12 md:w-16 md:h-16";
  
  const [showAttentionEffect, setShowAttentionEffect] = useState(false);

  useEffect(() => {
    if (!isReplayActive && aiMoveAttentionKey > 0 && (isAiMoveFrom || isAiMoveTo)) {
      setShowAttentionEffect(true);
      const timer = setTimeout(() => {
        setShowAttentionEffect(false);
      }, 1500); 
      return () => clearTimeout(timer);
    }
    if (isReplayActive) { // Reset attention effect if replay starts
        setShowAttentionEffect(false);
    }
  }, [aiMoveAttentionKey, isAiMoveFrom, isAiMoveTo, isReplayActive]);

  let dynamicClasses = "";

  if (isReplayActive) {
    // Replay-specific highlights take precedence
    if (isReplayHighlightFrom) {
      dynamicClasses += ' ring-4 ring-yellow-400 shadow-lg z-30';
    }
    if (isReplayHighlightToCaptured) {
      // If it's a capture square during replay, piece should be visible on it.
      // The background indicates the capture.
      dynamicClasses += ' bg-red-400 bg-opacity-50 ring-2 ring-red-500 z-30';
    }
  } else {
    // Regular game highlights
    if (isSelected) dynamicClasses += ' ring-4 ring-yellow-400 z-10';
    if (isCheckSquare) dynamicClasses += ' bg-red-500 opacity-70'; // Check still applies
    
    // AI's last move persistent pulse (when not replaying)
    if (isAiMoveFrom) dynamicClasses += ' ring-4 ring-sky-400 animate-pulse';
    if (isAiMoveTo) dynamicClasses += ' ring-4 ring-emerald-400 animate-pulse';
    
    // Temporary attention effect (triggered by button, when not replaying)
    if (showAttentionEffect) {
        if (isAiMoveFrom) dynamicClasses += ' shadow-[0_0_20px_8px_rgba(56,189,248,0.8)] z-20'; 
        if (isAiMoveTo) dynamicClasses += ' shadow-[0_0_20px_8px_rgba(52,211,153,0.8)] z-20';
    }
  }

  return (
    <div
      className={`${squareSizeClass} flex items-center justify-center relative ${bgClass} ${borderClass} ${dynamicClasses} transition-all duration-150 ease-in-out`}
      onClick={() => onClick(position)}
      role="button"
      aria-label={`Square ${String.fromCharCode(97 + position.col)}${8 - position.row}`}
    >
      {squareData && <PieceDisplay piece={squareData} />}
      {!isReplayActive && isPossibleMove && !squareData && <div className="possible-move-dot"></div>}
      {!isReplayActive && isPossibleMove && squareData && <div className="absolute inset-0 border-4 border-dashed border-blue-400 opacity-70 rounded"></div>}
    </div>
  );
};

export default Square;
