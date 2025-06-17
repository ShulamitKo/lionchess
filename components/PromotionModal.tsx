import React from 'react';
import { PieceSymbol, PlayerColor } from '../types';
import { PIECE_UNICODE, PROMOTION_PIECES } from '../constants';

interface PromotionModalProps {
  playerColor: PlayerColor;
  onPromote: (piece: PieceSymbol) => void;
}

const PromotionModal: React.FC<PromotionModalProps> = ({ playerColor, onPromote }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-6 rounded-lg shadow-2xl text-white border-2 border-gray-700">
        <h3 className="text-2xl font-semibold mb-6 text-center">קידום רץ</h3>
        <div className="flex justify-around space-x-3">
          {PROMOTION_PIECES.map(pieceSymbol => (
            <button
              key={pieceSymbol}
              onClick={() => onPromote(pieceSymbol)}
              className="p-3 bg-gray-700 hover:bg-gray-600 rounded-md text-4xl transition-colors duration-150 outline outline-2 outline-white"
              aria-label={`Promote to ${pieceSymbol}`}
            >
              <span className={"drop-shadow-[0_0_2px_black]"}>{PIECE_UNICODE[playerColor][pieceSymbol]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromotionModal;
    