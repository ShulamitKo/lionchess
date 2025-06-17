import React from 'react';
import { Piece as PieceType, PlayerColor, PieceSymbol } from '../types';
import { PIECE_UNICODE } from '../constants';

interface PieceProps {
  piece: PieceType;
}

const PieceDisplay: React.FC<PieceProps> = ({ piece }) => {
  const unicode = PIECE_UNICODE[piece.color][piece.type];
  const colorClass = piece.color === 'white' ? 'text-[#e6c200]' : 'text-[#5c4033]';
  const outlineClass = piece.color === 'white' ? 'drop-shadow-[0_0_2px_#a67c52] outline outline-2 outline-[#a67c52]' : 'drop-shadow-[0_0_2px_#ecdab0] outline outline-2 outline-[#ecdab0]';
  
  const pieceStyle: React.CSSProperties = piece.color === 'white' 
    ? { textShadow: '0px 2px 4px #a67c52' } 
    : { textShadow: '0px 2px 4px #ecdab0' };

  return (
    <span 
      className={`chess-piece text-4xl md:text-5xl ${colorClass} ${outlineClass} cursor-grab`}
      style={pieceStyle}
    >
      {unicode}
    </span>
  );
};

export default PieceDisplay;
