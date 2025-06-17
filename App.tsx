import React, { useState, useEffect, useCallback, useRef } from 'react';
import ChessBoard from './components/Board';
import PromotionModal from './components/PromotionModal';
import CapturedPiecesDisplay from './components/CapturedPiecesDisplay'; 
import { ChessLogic, moveToAlgebraic, positionToAlgebraic } from './services/chessLogic';
import { getAIMove } from './services/geminiService';
import { BoardState, PlayerColor, Position, Move, GameState, PieceSymbol, CastlingRights, SquareState, Piece, DifficultyLevel } from './types';
import { USER_PLAYER_COLOR, AI_PLAYER_COLOR, createInitialBoard, PIECE_NAMES_HEBREW, PLAYER_COLOR_HEBREW } from './constants';
// import israelFlag from './assets/israel_flag.png'; // Corrected Path - Assuming assets folder is at the same level as App.tsx or src

const App: React.FC = () => {
  const initialGameState: GameState = {
    board: ChessLogic.getInitialBoard(),
    currentPlayer: USER_PLAYER_COLOR,
    selectedPiecePos: null,
    possibleMoves: [],
    gameStatus: "הלבן תורו. בחר כלי.",
    moveHistory: [],
    gameOver: false,
    isCheck: false,
    castlingRights: ChessLogic.getInitialCastlingRights(),
    lastMove: null,
    isAITurn: false,
    isLoadingAI: false,
    aiLastMove: null,
    capturedByWhite: [], 
    capturedByBlack: [], 
    difficulty: 'medium', 
  };

  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [showPromotionModal, setShowPromotionModal] = useState<boolean>(false);
  const [promotionMove, setPromotionMove] = useState<Move | null>(null);
  const [aiMoveAttentionKey, setAiMoveAttentionKey] = useState<number>(0); 
  
  // State for AI move replay
  const [replayingAiMoveBoard, setReplayingAiMoveBoard] = useState<BoardState | null>(null);
  const [isReplayActive, setIsReplayActive] = useState<boolean>(false);
  const activeReplayTimerRef = useRef<number | null>(null);


  const findKingPos = useCallback((board: BoardState, color: PlayerColor): Position | null => {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'K' && piece.color === color) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }, []);

  const updateGameStatus = useCallback((board: BoardState, currentPlayer: PlayerColor, lastMove: Move | null, castlingRights: CastlingRights) => {
    const isCheck = ChessLogic.isKingInCheck(board, currentPlayer, lastMove, castlingRights);
    let newStatus = `${currentPlayer === 'white' ? PLAYER_COLOR_HEBREW.white : PLAYER_COLOR_HEBREW.black} תורו.`; 
    let gameOver = false;

    if (isCheck) {
      newStatus = `${currentPlayer === 'white' ? PLAYER_COLOR_HEBREW.white : PLAYER_COLOR_HEBREW.black} נמצא בשח!`; 
      if (ChessLogic.isCheckmate(board, currentPlayer, lastMove, castlingRights)) {
        newStatus = `שחמט! ${currentPlayer === 'white' ? PLAYER_COLOR_HEBREW.black : PLAYER_COLOR_HEBREW.white} ניצח!`; 
        gameOver = true;
      }
    } else if (ChessLogic.isStalemate(board, currentPlayer, lastMove, castlingRights)) {
      newStatus = "תיקו! פט."; 
      gameOver = true;
    }
    
    setGameState((prev: GameState) => ({ ...prev, gameStatus: newStatus, isCheck, gameOver }));
    return { isCheck, gameOver };
  }, []);


  const handleSquareClick = (pos: Position) => {
    if (gameState.gameOver || gameState.isAITurn || gameState.isLoadingAI || isReplayActive) return;

    const pieceAtPos = gameState.board[pos.row][pos.col];

    if (gameState.selectedPiecePos) { 
      const move = gameState.possibleMoves.find((m: Move) => m.to.row === pos.row && m.to.col === pos.col);
      if (move) { 
        const movingPiece = gameState.board[gameState.selectedPiecePos.row][gameState.selectedPiecePos.col];
        const promotionRank = gameState.currentPlayer === 'white' ? 0 : 7;
        if (movingPiece?.type === 'P' && pos.row === promotionRank) {
          setPromotionMove(move); 
          setShowPromotionModal(true);
        } else {
          makeMove(move);
        }
      } else if (pieceAtPos && pieceAtPos.color === gameState.currentPlayer) { 
        const newPossibleMoves = ChessLogic.getValidMoves(gameState.board, pos, gameState.currentPlayer, gameState.lastMove, gameState.castlingRights);
        setGameState((prev: GameState) => ({ ...prev, selectedPiecePos: pos, possibleMoves: newPossibleMoves }));
      } else { 
        setGameState((prev: GameState) => ({ ...prev, selectedPiecePos: null, possibleMoves: [] }));
      }
    } else { 
      if (pieceAtPos && pieceAtPos.color === gameState.currentPlayer) {
        const newPossibleMoves = ChessLogic.getValidMoves(gameState.board, pos, gameState.currentPlayer, gameState.lastMove, gameState.castlingRights);
        setGameState((prev: GameState) => ({ ...prev, selectedPiecePos: pos, possibleMoves: newPossibleMoves }));
      }
    }
  };
  
  const handlePromotionSelect = (promotedPieceType: PieceSymbol) => {
    if (promotionMove) {
      const moveWithPromotion: Move = { ...promotionMove, promotion: promotedPieceType };
      makeMove(moveWithPromotion);
    }
    setShowPromotionModal(false);
    setPromotionMove(null);
  };


  const makeMove = (move: Move) => {
    const movingPiece = gameState.board[move.from.row][move.from.col];
    if (!movingPiece) return;
    
    const { newBoard, newCastlingRights, newLastMove } = ChessLogic.applyMove(gameState.board, move, gameState.currentPlayer);
    
    const newMoveHistory = [...gameState.moveHistory, moveToAlgebraic(newLastMove)];
    const nextPlayer = gameState.currentPlayer === USER_PLAYER_COLOR ? AI_PLAYER_COLOR : USER_PLAYER_COLOR;
    const playerMakingTheMove = gameState.currentPlayer;

    let updatedCapturedByWhite = gameState.capturedByWhite;
    let updatedCapturedByBlack = gameState.capturedByBlack;

    if (newLastMove.capturedPiece) {
      if (newLastMove.capturedPiece.color === 'black') { 
        updatedCapturedByWhite = [...gameState.capturedByWhite, newLastMove.capturedPiece];
      } else { 
        updatedCapturedByBlack = [...gameState.capturedByBlack, newLastMove.capturedPiece];
      }
    }
    
    setGameState((prev: GameState) => ({
      ...prev,
      board: newBoard,
      currentPlayer: nextPlayer,
      selectedPiecePos: null,
      possibleMoves: [],
      moveHistory: newMoveHistory,
      castlingRights: newCastlingRights,
      lastMove: newLastMove,
      isAITurn: nextPlayer === AI_PLAYER_COLOR,
      aiLastMove: playerMakingTheMove === AI_PLAYER_COLOR ? newLastMove : prev.aiLastMove,
      capturedByWhite: updatedCapturedByWhite,
      capturedByBlack: updatedCapturedByBlack,
    }));
  };

  useEffect(() => {
    if (!gameState.gameOver) {
       updateGameStatus(gameState.board, gameState.currentPlayer, gameState.lastMove, gameState.castlingRights);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.board, gameState.currentPlayer, gameState.lastMove, gameState.castlingRights, gameState.gameOver]);


  useEffect(() => {
    if (gameState.currentPlayer === AI_PLAYER_COLOR && !gameState.gameOver && gameState.isAITurn) {
      setGameState((prev: GameState) => ({ ...prev, isLoadingAI: true, gameStatus: "AI חושב..." }));
      
      const performAIMove = async () => {
        const aiMove = await getAIMove(gameState.board, AI_PLAYER_COLOR, gameState.moveHistory, gameState.castlingRights, gameState.lastMove, gameState.difficulty);
        if (aiMove) {
          const movingPiece = gameState.board[aiMove.from.row][aiMove.from.col];
          const promotionRank = AI_PLAYER_COLOR === 'white' ? 0 : 7;
          if (movingPiece?.type === 'P' && aiMove.to.row === promotionRank && !aiMove.promotion) {
            aiMove.promotion = 'Q'; 
          }
          makeMove(aiMove);
        } else {
           console.error("AI could not make a move. This might be a stalemate/checkmate or AI service error.");
            setGameState((prev: GameState) => ({ ...prev, gameStatus: "AI לא יכול לבצע מהלך. בדוק אם זה פט או מט."}));
        }
        setGameState((prev: GameState) => ({ ...prev, isLoadingAI: false, isAITurn: false }));
      };
      
      const aiMoveTimer = setTimeout(performAIMove, 1000); 
      return () => clearTimeout(aiMoveTimer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentPlayer, gameState.gameOver, gameState.isAITurn, gameState.difficulty]); 

  const resetGame = (difficulty?: DifficultyLevel) => {
    setGameState({
      ...initialGameState,
      board: ChessLogic.getInitialBoard(), 
      castlingRights: ChessLogic.getInitialCastlingRights(),
      capturedByWhite: [], 
      capturedByBlack: [],
      difficulty: difficulty || gameState.difficulty, 
      gameStatus: `${PLAYER_COLOR_HEBREW.white} תורו. בחר כלי.`
    }); 
    setShowPromotionModal(false);
    setPromotionMove(null);
    setAiMoveAttentionKey(0); 
    setIsReplayActive(false);
    setReplayingAiMoveBoard(null);
    if(activeReplayTimerRef.current) clearTimeout(activeReplayTimerRef.current);
  };
  
  const kingPosForHighlight = gameState.isCheck ? findKingPos(gameState.board, gameState.currentPlayer) : null;

  const handleShowAiLastMove = () => {
    if (gameState.aiLastMove && !isReplayActive) { // Prevent re-triggering if already replaying
      if (activeReplayTimerRef.current) {
        clearTimeout(activeReplayTimerRef.current);
      }

      const boardBeforeAiMove = ChessLogic.revertMove(gameState.board, gameState.aiLastMove);
      setReplayingAiMoveBoard(boardBeforeAiMove);
      setIsReplayActive(true);

      activeReplayTimerRef.current = window.setTimeout(() => {
        setIsReplayActive(false);
        setReplayingAiMoveBoard(null);
        // Trigger attention on current board after replay
        setAiMoveAttentionKey((prev: number) => prev + 1); 
        activeReplayTimerRef.current = null;
      }, 2000); // 2 seconds for showing the "before" state
    }
  };

  useEffect(() => {
    // Cleanup timer on component unmount
    return () => {
      if (activeReplayTimerRef.current) {
        clearTimeout(activeReplayTimerRef.current);
      }
    };
  }, []);

  const describePieceTypeAndColor = (piece: Piece | null | undefined): string => {
    if (!piece) return "";
    const colorName = PLAYER_COLOR_HEBREW[piece.color]; 
    const pieceName = PIECE_NAMES_HEBREW[piece.type]; 
    return `${pieceName} ה${colorName}`; 
  };
  
  const getMovedPieceDescription = (): string => {
    if (!gameState.aiLastMove) return "";
    // To get the piece type *before* promotion, we need to check if aiLastMove involved promotion
    const originalMovingPieceType = gameState.aiLastMove.promotion 
        ? 'P' // If it was a promotion, the original piece was a Pawn
        : gameState.board[gameState.aiLastMove.to.row]?.[gameState.aiLastMove.to.col]?.type; // Otherwise, get type from current board

    if (!originalMovingPieceType) return "כלי לא ידוע";
    
    const colorName = PLAYER_COLOR_HEBREW[AI_PLAYER_COLOR]; // AI's color
    return `${PIECE_NAMES_HEBREW[originalMovingPieceType as PieceSymbol]} ה${colorName}`;
  };

  const handleDifficultyChange = (level: DifficultyLevel) => {
    if (gameState.difficulty !== level) {
        resetGame(level); 
    }
  };
  
  const difficultyButtonClass = (level: DifficultyLevel) => 
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-700
     ${gameState.difficulty === level 
       ? 'bg-purple-600 text-white shadow-md' 
       : 'bg-slate-600 hover:bg-slate-500 text-slate-100' // Changed from text-slate-200
     }`;

  const groupedMoveHistory: { moveNumber: number; white: string; black: string }[] = [];
  for (let i = 0; i < gameState.moveHistory.length; i += 2) {
    groupedMoveHistory.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: gameState.moveHistory[i],
      black: gameState.moveHistory[i + 1] || '',
    });
  }

  const getStatusBgClass = () => {
    if (gameState.gameOver) return 'bg-red-600';
    if (gameState.isCheck) return 'bg-orange-500';
    return 'bg-sky-700';
  };

  const getStatusTextClass = () => {
    if (gameState.gameOver) return 'text-red-100';
    if (gameState.isCheck) return 'text-orange-100';
    return 'text-sky-100';
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-2 sm:p-4 selection:bg-purple-500 selection:text-white">
      <header className="mb-4 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
          שחמט עם כלביא 🇮🇱
        </h1>
        <p className="text-slate-400 mt-1 text-sm sm:text-base">שחק נגד יריב AI מתקדם.</p>
      </header>
      
      <div className="flex flex-col lg:flex-row items-start gap-4 md:gap-6 w-full max-w-5xl xl:max-w-6xl">
        <div className="relative mx-auto lg:mx-0">
          <ChessBoard
            boardData={isReplayActive && replayingAiMoveBoard ? replayingAiMoveBoard : gameState.board}
            onSquareClick={handleSquareClick}
            selectedPiecePos={gameState.selectedPiecePos}
            possibleMoves={gameState.possibleMoves}
            isCheck={gameState.isCheck}
            kingPosIfInCheck={kingPosForHighlight}
            playerColor={USER_PLAYER_COLOR}
            aiLastMove={gameState.aiLastMove}
            aiMoveAttentionKey={aiMoveAttentionKey} 
            isReplayActive={isReplayActive}
          />
          {(gameState.isLoadingAI || isReplayActive) && ( // Show overlay during AI thinking OR during replay
            <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-20 rounded-md">
              <div className="text-lg sm:text-xl font-semibold animate-pulse text-slate-100">
                {isReplayActive ? "מציג מהלך AI..." : "AI חושב..."}
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-800 p-4 sm:p-5 rounded-lg shadow-2xl w-full lg:w-96 space-y-3 sm:space-y-4">
          <h2 className="text-xl sm:text-2xl font-semibold border-b border-slate-700 pb-2 mb-3 text-slate-100">מידע והגדרות</h2>
          
          <div className="space-y-1">
            <h3 className="text-lg font-medium text-slate-200">סטטוס המשחק</h3> {/* Changed from text-slate-300 */}
            <div className={`text-base sm:text-lg p-2.5 rounded-md ${getStatusBgClass()}`}>
              <span className={`font-bold ${getStatusTextClass()}`}>
                {gameState.gameStatus}
              </span>
            </div>
            <div className="text-sm text-slate-300"> {/* Changed from text-slate-400 */}
              תור: <span className="font-semibold text-slate-200">{gameState.currentPlayer === USER_PLAYER_COLOR ? `${PLAYER_COLOR_HEBREW.white} (אתה)` : `${PLAYER_COLOR_HEBREW.black} (AI)`}</span>
            </div>
          </div>
          
          <div className="pt-2">
             <h3 className="text-lg font-medium text-slate-200 mb-1.5">רמת קושי</h3> {/* Changed from text-slate-300 */}
             <div className="flex space-x-2 rtl:space-x-reverse">
                {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map(level => (
                    <button key={level} onClick={() => handleDifficultyChange(level)} className={difficultyButtonClass(level)}>
                        {level === 'easy' ? 'קל' : level === 'medium' ? 'בינוני' : 'קשה'}
                    </button>
                ))}
             </div>
          </div>


          <button
            onClick={handleShowAiLastMove}
            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 px-4 rounded-lg transition-colors duration-150 text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!gameState.aiLastMove || gameState.isLoadingAI || isReplayActive}
          >
            הצג מהלך אחרון של AI
          </button>

          {gameState.aiLastMove && (
            <div className="text-xs sm:text-sm pt-2 border-t border-slate-700">
              <p className="font-medium text-slate-200 mb-0.5">פרטי מהלך AI אחרון:</p> {/* Changed from text-slate-300 */}
              <p className="text-slate-200 leading-relaxed">
                {`${getMovedPieceDescription()} מ-${positionToAlgebraic(gameState.aiLastMove.from)} ל-${positionToAlgebraic(gameState.aiLastMove.to)}.`}
                {gameState.aiLastMove.isEnPassant && gameState.aiLastMove.capturedPiece &&
                  ` לכד ${describePieceTypeAndColor(gameState.aiLastMove.capturedPiece)} (אן פסאן).`
                }
                {!gameState.aiLastMove.isEnPassant && gameState.aiLastMove.capturedPiece &&
                  ` לכד ${describePieceTypeAndColor(gameState.aiLastMove.capturedPiece)}.`
                }
                {gameState.aiLastMove.promotion && ` הוכתר ל-${PIECE_NAMES_HEBREW[gameState.aiLastMove.promotion]}.`}
                {gameState.aiLastMove.isCastling && (gameState.aiLastMove.to.col === 6 ? ' הצרחה קטנה.' : ' הצרחה גדולה.')}
              </p>
            </div>
          )}
          
          <CapturedPiecesDisplay pieces={gameState.capturedByBlack} title="כלים שלכד השחור (לבנים):" />
          <CapturedPiecesDisplay pieces={gameState.capturedByWhite} title="כלים שלכד הלבן (שחורים):" />


          <button
            onClick={() => resetGame()}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 px-4 rounded-lg transition-colors duration-150 text-sm sm:text-base"
          >
            משחק חדש
          </button>

          <div className="pt-2">
            <h3 className="text-lg font-semibold mb-1.5 border-b border-slate-700 pb-1.5 text-slate-100">היסטוריית מהלכים</h3>
            <div className="h-40 sm:h-48 overflow-y-auto bg-slate-800/50 p-2 rounded-md text-xs sm:text-sm space-y-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/50">
              {groupedMoveHistory.length === 0 && <p className="text-slate-400 italic text-center py-4">אין מהלכים עדיין.</p>}
              {groupedMoveHistory.map(({ moveNumber, white, black }) => (
                <div key={moveNumber} className={`flex items-center p-1.5 rounded-sm ${moveNumber % 2 === 1 ? 'bg-slate-700' : 'bg-slate-600'}`}>
                  <span className="w-6 sm:w-7 text-right pr-1.5 text-slate-200 font-medium">{moveNumber}.</span> {/* Changed from text-slate-400 */}
                  <span className="flex-1 font-mono text-slate-200">{white}</span>
                  {black && <span className="flex-1 pl-1.5 font-mono text-slate-200">{black}</span>} {/* Changed from text-slate-300 */}
                  {!black && <span className="flex-1 pl-1.5"></span>} 
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {showPromotionModal && promotionMove && (
        <PromotionModal 
          playerColor={gameState.currentPlayer} 
          onPromote={handlePromotionSelect} 
        />
      )}
       <footer className="mt-6 text-center text-slate-500 text-xs sm:text-sm">
        <p>&copy; {new Date().getFullYear()} שחמט עם כלביא 🇮🇱. כל הזכויות שמורות.</p>
        <p>פותח באהבה ע"י שולמית</p>
      </footer>
    </div>
  );
};

export default App;
