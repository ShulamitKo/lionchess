
import { BoardState, Piece, PlayerColor, Position, Move, PieceSymbol, SquareState, CastlingRights } from '../types';
import { createInitialBoard, HEBREW_FILES } from '../constants';

export class ChessLogic {
  public static getInitialBoard(): BoardState {
    return createInitialBoard();
  }

  public static isSquareOnBoard(pos: Position): boolean {
    return pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8;
  }

  private static getPieceAt(board: BoardState, pos: Position): SquareState {
    if (!this.isSquareOnBoard(pos)) return null;
    return board[pos.row][pos.col];
  }

  public static isKingInCheck(board: BoardState, kingColor: PlayerColor, lastMove: Move | null, castlingRights: CastlingRights): boolean {
    const kingPos = this.findKing(board, kingColor);
    if (!kingPos) return false; // Should not happen in a valid game

    const opponentColor = kingColor === 'white' ? 'black' : 'white';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.color === opponentColor) {
          const moves = this.getPseudoLegalMovesForPiece(board, { row: r, col: c }, lastMove, castlingRights, false); // false to not check for self-check during this check
          if (moves.some(move => move.to.row === kingPos.row && move.to.col === kingPos.col)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private static findKing(board: BoardState, color: PlayerColor): Position | null {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'K' && piece.color === color) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }
  
  public static applyMove(
    board: BoardState,
    move: Move,
    playerColor: PlayerColor
  ): { newBoard: BoardState; newCastlingRights: CastlingRights; newLastMove: Move } { 
    const newBoard = board.map(row => row.map(piece => piece ? { ...piece } : null));
    const pieceToMove = newBoard[move.from.row][move.from.col];

    if (!pieceToMove) {
        console.error("Attempted to apply a move with no piece at the source square.");
        return { 
            newBoard: board, 
            newCastlingRights: this.getInitialCastlingRights(), 
            newLastMove: { ...move } 
        };
    }

    let capturedPiece: Piece | undefined = undefined;
    const pieceOnDestinationOriginal = board[move.to.row][move.to.col];

    if (pieceOnDestinationOriginal && pieceOnDestinationOriginal.color !== pieceToMove.color) {
      capturedPiece = pieceOnDestinationOriginal;
    }

    newBoard[move.to.row][move.to.col] = { ...pieceToMove, hasMoved: true };
    newBoard[move.from.row][move.from.col] = null;

    let newCastlingRights = this.updateCastlingRightsForMove(this.getInitialCastlingRights(), move, pieceToMove, board);

    if (move.promotion && pieceToMove.type === 'P') {
      newBoard[move.to.row][move.to.col] = { type: move.promotion, color: playerColor, hasMoved: true };
    }

    if (move.isCastling) {
      if (move.to.col === 6) { 
        const rook = newBoard[move.from.row][7]; 
        if (rook) { 
            newBoard[move.from.row][5] = {...rook, hasMoved: true};
            newBoard[move.from.row][7] = null;
        }
      } else { 
        const rook = newBoard[move.from.row][0]; 
        if (rook) { 
            newBoard[move.from.row][3] = {...rook, hasMoved: true};
            newBoard[move.from.row][0] = null;
        }
      }
    }
    
    if (move.isEnPassant) {
      const capturedPawnRow = move.from.row;
      const capturedPawnCol = move.to.col;
      const enPassantCapturedPawn = board[capturedPawnRow][capturedPawnCol];
      if (enPassantCapturedPawn && enPassantCapturedPawn.color !== pieceToMove.color) {
          capturedPiece = enPassantCapturedPawn;
      }
      newBoard[capturedPawnRow][capturedPawnCol] = null;
    }

    const executedMove: Move = { 
        ...move, 
        promotion: move.promotion,
        capturedPiece: capturedPiece 
    };

    return { newBoard, newCastlingRights, newLastMove: executedMove };
  }

  public static revertMove(boardAfterMove: BoardState, move: Move): BoardState {
    const revertedBoard = boardAfterMove.map(row => row.map(sq => sq ? { ...sq } : null));
    const pieceThatMovedOnAfterBoard = revertedBoard[move.to.row]?.[move.to.col];

    // Step 1: Handle the piece that moved
    if (pieceThatMovedOnAfterBoard) {
        let pieceToPlaceBackAtFrom = { ...pieceThatMovedOnAfterBoard };
        if (move.promotion) {
            pieceToPlaceBackAtFrom.type = 'P'; // Revert promotion to pawn
        }
        revertedBoard[move.from.row][move.from.col] = pieceToPlaceBackAtFrom;
        revertedBoard[move.to.row][move.to.col] = null; // Clear destination for now
    } else if (!move.capturedPiece && !move.isCastling) {
      // This situation (no piece at destination, no capture, not castling) should ideally not occur
      // If it does, it implies the piece that moved isn't at move.to on boardAfterMove.
      // We might need more info in `Move` or assume a specific piece type/color if this becomes an issue.
      // For now, if pieceThatMovedOnAfterBoard is null, this part is skipped.
    }


    // Step 2: Restore captured piece (if any)
    if (move.capturedPiece) {
        if (move.isEnPassant) {
            // For en passant, the captured pawn is restored to its actual square
            const capturedPawnActualRow = move.from.row; // Row of the capturing pawn
            const capturedPawnCol = move.to.col;         // Column pawn moved to (where captured pawn was)
            revertedBoard[capturedPawnActualRow][capturedPawnCol] = { ...move.capturedPiece };
            // The square the capturing pawn moved to (move.to) should be empty now
            revertedBoard[move.to.row][move.to.col] = null;
        } else {
            // Regular capture, captured piece goes to move.to
            revertedBoard[move.to.row][move.to.col] = { ...move.capturedPiece };
        }
    }

    // Step 3: Handle castling - this overrides some previous placements
    if (move.isCastling) {
        const kingPieceAtFrom = revertedBoard[move.from.row][move.from.col];
        if (kingPieceAtFrom && kingPieceAtFrom.type === 'K') {
            kingPieceAtFrom.hasMoved = false; // King's first move for castling
        }

        const kingOriginalRow = move.from.row;

        if (move.to.col === 6) { // Kingside (e.g., white King from e1 to g1, Rook from h1 to f1)
            // Rook was at f1 (kingOriginalRow, 5) on boardAfterMove.
            const rook = boardAfterMove[kingOriginalRow][5];
            if (rook && rook.type === 'R') {
                revertedBoard[kingOriginalRow][7] = { ...rook, hasMoved: false }; // Rook back to h1 (col 7)
                revertedBoard[kingOriginalRow][5] = null; // Clear f1 (col 5)
            }
            revertedBoard[move.to.row][move.to.col] = null; // Clear g1 (king's destination)
        } else if (move.to.col === 2) { // Queenside (e.g., white King from e1 to c1, Rook from a1 to d1)
            // Rook was at d1 (kingOriginalRow, 3) on boardAfterMove.
            const rook = boardAfterMove[kingOriginalRow][3];
            if (rook && rook.type === 'R') {
                revertedBoard[kingOriginalRow][0] = { ...rook, hasMoved: false }; // Rook back to a1 (col 0)
                revertedBoard[kingOriginalRow][3] = null; // Clear d1 (col 3)
            }
            revertedBoard[move.to.row][move.to.col] = null; // Clear c1 (king's destination)
        }
    }
    return revertedBoard;
  }


  public static getValidMoves(board: BoardState, pos: Position, playerColor: PlayerColor, lastMove: Move | null, castlingRights: CastlingRights): Move[] {
    const piece = this.getPieceAt(board, pos);
    if (!piece || piece.color !== playerColor) return [];

    const pseudoLegalMoves = this.getPseudoLegalMovesForPiece(board, pos, lastMove, castlingRights, true);
    
    return pseudoLegalMoves.filter(move => {
      const { newBoard } = this.applyMove(board, move, playerColor); 
      return !this.isKingInCheck(newBoard, playerColor, lastMove, castlingRights);
    });
  }

  private static getPseudoLegalMovesForPiece(board: BoardState, pos: Position, lastMove: Move | null, castlingRights: CastlingRights, includeCastling: boolean): Move[] {
    const piece = this.getPieceAt(board, pos);
    if (!piece) return [];

    switch (piece.type) {
      case 'P': return this.getPawnMoves(board, pos, piece, lastMove);
      case 'R': return this.getRookMoves(board, pos, piece);
      case 'N': return this.getKnightMoves(board, pos, piece);
      case 'B': return this.getBishopMoves(board, pos, piece);
      case 'Q': return this.getQueenMoves(board, pos, piece);
      case 'K': return this.getKingMoves(board, pos, piece, lastMove, castlingRights, includeCastling);
      default: return [];
    }
  }

  private static addMoveIfValid(moves: Move[], board: BoardState, fromPos: Position, toPos: Position, pieceColor: PlayerColor, isCaptureOk: boolean, isNonCaptureOk: boolean, promotionRank?: number): void {
    if (!this.isSquareOnBoard(toPos)) return;

    const targetPiece = this.getPieceAt(board, toPos);
    if (targetPiece) {
      if (isCaptureOk && targetPiece.color !== pieceColor) {
        if (promotionRank !== undefined && toPos.row === promotionRank) {
          (['Q', 'R', 'B', 'N'] as PieceSymbol[]).forEach(p => moves.push({ from: fromPos, to: toPos, promotion: p }));
        } else {
          moves.push({ from: fromPos, to: toPos });
        }
      }
    } else {
      if (isNonCaptureOk) {
         if (promotionRank !== undefined && toPos.row === promotionRank) {
          (['Q', 'R', 'B', 'N'] as PieceSymbol[]).forEach(p => moves.push({ from: fromPos, to: toPos, promotion: p }));
        } else {
          moves.push({ from: fromPos, to: toPos });
        }
      }
    }
  }

  private static getPawnMoves(board: BoardState, pos: Position, piece: Piece, lastMove: Move | null): Move[] {
    const moves: Move[] = [];
    const direction = piece.color === 'white' ? -1 : 1;
    const startRow = piece.color === 'white' ? 6 : 1;
    const promotionRank = piece.color === 'white' ? 0 : 7;

    const oneStep: Position = { row: pos.row + direction, col: pos.col };
    if (this.isSquareOnBoard(oneStep) && !this.getPieceAt(board, oneStep)) {
      this.addMoveIfValid(moves, board, pos, oneStep, piece.color, false, true, promotionRank);
      if (pos.row === startRow) {
        const twoSteps: Position = { row: pos.row + 2 * direction, col: pos.col };
        if (this.isSquareOnBoard(twoSteps) && !this.getPieceAt(board, twoSteps)) {
          this.addMoveIfValid(moves, board, pos, twoSteps, piece.color, false, true);
        }
      }
    }

    const captureOffsets = [-1, 1];
    captureOffsets.forEach(offset => {
      const capturePos: Position = { row: pos.row + direction, col: pos.col + offset };
      if (this.isSquareOnBoard(capturePos)) {
        const targetPiece = this.getPieceAt(board, capturePos);
        if (targetPiece && targetPiece.color !== piece.color) {
          this.addMoveIfValid(moves, board, pos, capturePos, piece.color, true, false, promotionRank);
        }
      }
    });

    if (lastMove) {
      const pieceAtLastMoveTo = board[lastMove.to.row][lastMove.to.col]; 
      if (pieceAtLastMoveTo && pieceAtLastMoveTo.type === 'P' && Math.abs(lastMove.from.row - lastMove.to.row) === 2) { 
        if (pos.row === lastMove.to.row && Math.abs(pos.col - lastMove.to.col) === 1) { 
          const enPassantTargetPos: Position = { row: pos.row + direction, col: lastMove.to.col };
          if (this.isSquareOnBoard(enPassantTargetPos) && !this.getPieceAt(board, enPassantTargetPos)) {
            moves.push({ from: pos, to: enPassantTargetPos, isEnPassant: true });
          }
        }
      }
    }
    return moves;
  }

  private static getSlidingMoves(board: BoardState, pos: Position, piece: Piece, directions: {r: number, c: number}[]): Move[] {
    const moves: Move[] = [];
    directions.forEach(dir => {
      let currentPos = { ...pos };
      while (true) {
        currentPos = { row: currentPos.row + dir.r, col: currentPos.col + dir.c };
        if (!this.isSquareOnBoard(currentPos)) break;
        const targetPiece = this.getPieceAt(board, currentPos);
        if (targetPiece) {
          if (targetPiece.color !== piece.color) {
            moves.push({ from: pos, to: currentPos });
          }
          break; 
        }
        moves.push({ from: pos, to: currentPos });
      }
    });
    return moves;
  }
  
  private static getRookMoves = (board: BoardState, pos: Position, piece: Piece) => this.getSlidingMoves(board, pos, piece, [{r:0,c:1},{r:0,c:-1},{r:1,c:0},{r:-1,c:0}]);
  private static getBishopMoves = (board: BoardState, pos: Position, piece: Piece) => this.getSlidingMoves(board, pos, piece, [{r:1,c:1},{r:1,c:-1},{r:-1,c:1},{r:-1,c:-1}]);
  private static getQueenMoves = (board: BoardState, pos: Position, piece: Piece) => this.getSlidingMoves(board, pos, piece, [{r:0,c:1},{r:0,c:-1},{r:1,c:0},{r:-1,c:0},{r:1,c:1},{r:1,c:-1},{r:-1,c:1},{r:-1,c:-1}]);

  private static getKnightMoves(board: BoardState, pos: Position, piece: Piece): Move[] {
    const moves: Move[] = [];
    const knightOffsets = [
      { r: -2, c: -1 }, { r: -2, c: 1 }, { r: -1, c: -2 }, { r: -1, c: 2 },
      { r: 1, c: -2 }, { r: 1, c: 2 }, { r: 2, c: -1 }, { r: 2, c: 1 },
    ];
    knightOffsets.forEach(offset => {
      const targetPos = { row: pos.row + offset.r, col: pos.col + offset.c };
      this.addMoveIfValid(moves, board, pos, targetPos, piece.color, true, true);
    });
    return moves;
  }

  private static getKingMoves(board: BoardState, pos: Position, piece: Piece, lastMove: Move | null, castlingRights: CastlingRights, includeCastling: boolean): Move[] {
    const moves: Move[] = [];
    const kingOffsets = [
      { r: -1, c: -1 }, { r: -1, c: 0 }, { r: -1, c: 1 },
      { r: 0, c: -1 },                 { r: 0, c: 1 },
      { r: 1, c: -1 }, { r: 1, c: 0 }, { r: 1, c: 1 },
    ];
    kingOffsets.forEach(offset => {
      const targetPos = { row: pos.row + offset.r, col: pos.col + offset.c };
       this.addMoveIfValid(moves, board, pos, targetPos, piece.color, true, true);
    });

    if (includeCastling && !piece.hasMoved && !this.isKingInCheck(board, piece.color, lastMove, castlingRights)) {
      const playerRights = piece.color === 'white' ? castlingRights.white : castlingRights.black;
      const kingRow = pos.row;

      if (playerRights.kingSide) {
        const rookPos = { row: kingRow, col: 7 };
        const rook = this.getPieceAt(board, rookPos);
        if (rook && rook.type === 'R' && !rook.hasMoved) {
          if (!this.getPieceAt(board, {row: kingRow, col: 5}) && !this.getPieceAt(board, {row: kingRow, col: 6})) {
            if (!this.isSquareAttacked(board, {row: kingRow, col: 5}, piece.color === 'white' ? 'black' : 'white', lastMove, castlingRights) && 
                !this.isSquareAttacked(board, {row: kingRow, col: 6}, piece.color === 'white' ? 'black' : 'white', lastMove, castlingRights)) {
              moves.push({ from: pos, to: {row: kingRow, col: 6}, isCastling: true });
            }
          }
        }
      }
      if (playerRights.queenSide) {
        const rookPos = { row: kingRow, col: 0 };
        const rook = this.getPieceAt(board, rookPos);
        if (rook && rook.type === 'R' && !rook.hasMoved) {
           if (!this.getPieceAt(board, {row: kingRow, col: 1}) && !this.getPieceAt(board, {row: kingRow, col: 2}) && !this.getPieceAt(board, {row: kingRow, col: 3})) {
             if (!this.isSquareAttacked(board, {row: kingRow, col: 2}, piece.color === 'white' ? 'black' : 'white', lastMove, castlingRights) && 
                 !this.isSquareAttacked(board, {row: kingRow, col: 3}, piece.color === 'white' ? 'black' : 'white', lastMove, castlingRights)) {
               moves.push({ from: pos, to: {row: kingRow, col: 2}, isCastling: true });
             }
           }
        }
      }
    }
    return moves;
  }

  public static isSquareAttacked(board: BoardState, pos: Position, attackerColor: PlayerColor, lastMove: Move | null, castlingRights: CastlingRights): boolean {
     for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.color === attackerColor) {
          if (piece.type === 'P') {
            const direction = piece.color === 'white' ? -1 : 1;
            const captureOffsets = [-1, 1];
            for (const offset of captureOffsets) {
                if (pos.row === r + direction && pos.col === c + offset) return true;
            }
          } else {
            const moves = this.getPseudoLegalMovesForPiece(board, { row: r, col: c }, lastMove, castlingRights, false);
            if (moves.some(move => move.to.row === pos.row && move.to.col === pos.col)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }
  
  public static getAllPossibleMovesForPlayer(board: BoardState, playerColor: PlayerColor, lastMove: Move | null, castlingRights: CastlingRights): Move[] {
    const allMoves: Move[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.color === playerColor) {
          const moves = this.getValidMoves(board, { row: r, col: c }, playerColor, lastMove, castlingRights);
          allMoves.push(...moves);
        }
      }
    }
    return allMoves;
  }

  public static isCheckmate(board: BoardState, playerColor: PlayerColor, lastMove: Move | null, castlingRights: CastlingRights): boolean {
    if (!this.isKingInCheck(board, playerColor, lastMove, castlingRights)) {
      return false;
    }
    const possibleMoves = this.getAllPossibleMovesForPlayer(board, playerColor, lastMove, castlingRights);
    return possibleMoves.length === 0;
  }

  public static isStalemate(board: BoardState, playerColor: PlayerColor, lastMove: Move | null, castlingRights: CastlingRights): boolean {
     if (this.isKingInCheck(board, playerColor, lastMove, castlingRights)) {
      return false;
    }
    const possibleMoves = this.getAllPossibleMovesForPlayer(board, playerColor, lastMove, castlingRights);
    return possibleMoves.length === 0;
  }

  public static getInitialCastlingRights(): CastlingRights {
    return {
      white: { kingSide: true, queenSide: true },
      black: { kingSide: true, queenSide: true },
    };
  }

  public static updateCastlingRightsForMove(currentRights: CastlingRights, move: Move, movedPiece: Piece, boardBeforeMove: BoardState): CastlingRights {
    const newRights = JSON.parse(JSON.stringify(currentRights)); 
    const playerColor = movedPiece.color;

    if (movedPiece.type === 'K') {
      if (playerColor === 'white') {
        newRights.white.kingSide = false;
        newRights.white.queenSide = false;
      } else {
        newRights.black.kingSide = false;
        newRights.black.queenSide = false;
      }
    } else if (movedPiece.type === 'R') {
      if (playerColor === 'white') {
        if (move.from.col === 0 && move.from.row === 7) newRights.white.queenSide = false;
        if (move.from.col === 7 && move.from.row === 7) newRights.white.kingSide = false;
      } else { 
        if (move.from.col === 0 && move.from.row === 0) newRights.black.queenSide = false;
        if (move.from.col === 7 && move.from.row === 0) newRights.black.kingSide = false;
      }
    }

    const capturedPieceAtTo = boardBeforeMove[move.to.row][move.to.col];
    if (capturedPieceAtTo && capturedPieceAtTo.type === 'R') {
        if (move.to.row === 0 && move.to.col === 0) newRights.black.queenSide = false; 
        if (move.to.row === 0 && move.to.col === 7) newRights.black.kingSide = false;  
        if (move.to.row === 7 && move.to.col === 0) newRights.white.queenSide = false; 
        if (move.to.row === 7 && move.to.col === 7) newRights.white.kingSide = false;  
    }
    return newRights;
  }
}

export function algebraicToPosition(alg: string): Position {
  const col = alg.charCodeAt(0) - 'a'.charCodeAt(0);
  const row = 8 - parseInt(alg.substring(1), 10);
  return { row, col };
}

export function positionToAlgebraic(pos: Position): string {
  if (!pos || pos.col < 0 || pos.col >= HEBREW_FILES.length) return ''; 
  return `${HEBREW_FILES[pos.col]}${8 - pos.row}`;
}


export function moveToAlgebraic(move: Move): string {
  let alg = `${positionToAlgebraic(move.from)}${positionToAlgebraic(move.to)}`;
  if (move.promotion) {
    alg += move.promotion.toLowerCase(); 
  }
  return alg;
}

export function parseAlgebraicMove(moveStr: string): Move | null {
  if (!moveStr || moveStr.length < 4 || moveStr.length > 5) return null;
  
  const fromFile = moveStr.charAt(0);
  const fromRank = moveStr.charAt(1);
  const toFile = moveStr.charAt(2);
  const toRank = moveStr.charAt(3);

  if (!/^[a-h]$/.test(fromFile) || !/^[1-8]$/.test(fromRank) ||
      !/^[a-h]$/.test(toFile) || !/^[1-8]$/.test(toRank)) {
    return null; 
  }

  const from = algebraicToPosition(moveStr.substring(0, 2));
  const to = algebraicToPosition(moveStr.substring(2, 4));
  
  let promotion: PieceSymbol | undefined = undefined;
  if (moveStr.length === 5) {
    const promoChar = moveStr.charAt(4).toUpperCase();
    if (['Q', 'R', 'B', 'N'].includes(promoChar)) {
      promotion = promoChar as PieceSymbol;
    } else {
      return null; 
    }
  }
  return { from, to, promotion };
}
