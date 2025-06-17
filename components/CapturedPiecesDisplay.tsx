import React from 'react';
import { Piece } from '../types';
import { PIECE_UNICODE } from '../constants';

interface CapturedPiecesDisplayProps {
  pieces: Piece[];
  title: string;
}

const CapturedPiecesDisplay: React.FC<CapturedPiecesDisplayProps> = ({ pieces, title }) => {
  if (pieces.length === 0) {
    return null; 
  }

  const pieceOrder: Record<string, number> = { 'Q': 1, 'R': 2, 'B': 3, 'N': 4, 'P': 5 };
  const sortedPieces = [...pieces].sort((a, b) => {
    return (pieceOrder[a.type] || 99) - (pieceOrder[b.type] || 99);
  });


  return (
    <div className="mt-3 pt-3 border-t border-gray-500">
      <h4 className="text-md font-medium text-gray-100 mb-1.5">{title}</h4>
      <div className="bg-gray-800 p-2 rounded-md flex flex-wrap gap-x-1 gap-y-0 text-2xl">
        {sortedPieces.map((piece, index) => {
          const colorClass = piece.color === 'white' ? 'text-white' : 'text-gray-900';
          const outlineClass = piece.color === 'white' ? 'drop-shadow-[0_0_2px_black] outline outline-2 outline-black' : 'drop-shadow-[0_0_2px_white] outline outline-2 outline-white';
          const pieceStyle: React.CSSProperties = piece.color === 'white' 
            ? { textShadow: '0px 2px 4px rgba(0, 0, 0, 0.8)' } 
            : { textShadow: '0px 2px 4px rgba(255, 255, 255, 0.7)' };

          return (
            <span 
              key={index} 
              className={`${colorClass} ${outlineClass}`}
              style={pieceStyle}
              aria-label={`${piece.color} ${piece.type}`}
            >
              {PIECE_UNICODE[piece.color][piece.type]}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default CapturedPiecesDisplay;
