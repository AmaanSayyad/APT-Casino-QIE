"use client";
import { useState } from "react";
import { FaExternalLinkAlt } from "react-icons/fa";
import { useQIETransactionManager } from "@/hooks/useQIETransactionManager";
import { useAccount } from "wagmi";

export default function GameHistory({ history }) {
  const [visibleCount, setVisibleCount] = useState(5);
  
  // Get user account
  const { address } = useAccount();
  
  // Get localStorage transactions
  const { getTransactionsForGame } = useQIETransactionManager();
  const localTransactions = address ? getTransactionsForGame('PLINKO', address) : { pending: [], completed: [] };
  
  // Open Entropy Explorer link (Arbitrum Sepolia)
  const openEntropyExplorer = (txHash) => {
    if (txHash) {
      const entropyExplorerUrl = `https://entropy-explorer.pyth.network/?chain=arbitrum-sepolia&search=${txHash}`;
      window.open(entropyExplorerUrl, '_blank');
    }
  };

  // Open QIE Testnet Explorer link
  const openQIETestnetExplorer = (txHash) => {
    if (txHash) {
      const qieExplorerUrl = `https://testnet.qie.digital/tx/${txHash}`;
      window.open(qieExplorerUrl, '_blank');
    }
  };

  // Open QIE NFT Explorer link
  const openQIENFTExplorer = (tokenId) => {
    if (tokenId) {
      const nftContractAddress = process.env.NEXT_PUBLIC_QIE_GAME_NFT_ADDRESS;
      const explorerUrl = `https://testnet.qie.digital/token/${nftContractAddress}/instance/${tokenId}`;
      window.open(explorerUrl, '_blank');
    }
  };

  // Combine DB history with localStorage transactions
  const combineHistoryWithLocalTransactions = () => {
    const combinedHistory = [...history];

    // Map existing history rows by transaction ids
    const byLogId = new Map();
    const byNftId = new Map();
    combinedHistory.forEach((game) => {
      if (game.qieLogTransactionId) byLogId.set(game.qieLogTransactionId, game);
      if (game.nftTransactionId) byNftId.set(game.nftTransactionId, game);
    });

    // Enrich existing rows with completed tx info (no extra rows)
    localTransactions.completed.forEach((tx) => {
      let matchedGame = null;
      if (tx.logId && byLogId.has(tx.logId)) {
        matchedGame = byLogId.get(tx.logId);
      } else if (tx.nftId && byNftId.has(tx.nftId)) {
        matchedGame = byNftId.get(tx.nftId);
      }

      if (matchedGame) {
        if (tx.txHash) matchedGame.qieTxHash = tx.txHash;
        if (tx.tokenId) matchedGame.nftTokenId = tx.tokenId;
        if (matchedGame.isPendingTransaction) matchedGame.isPendingTransaction = false;
      }
    });

    // Add pending tx rows only when we don't already have that id represented
    localTransactions.pending.forEach((tx) => {
      const existsInCombined = combinedHistory.some(
        (game) =>
          (game.qieLogTransactionId && game.qieLogTransactionId === tx.logId) ||
          (game.nftTransactionId && game.nftTransactionId === tx.nftId) ||
          game.id === `pending-${tx.logId || tx.nftId}`
      );

      if (!existsInCombined) {
        combinedHistory.unshift({
          id: `pending-${tx.logId || tx.nftId}`,
          gameType: 'PLINKO',
          title: gameHistory?.title || '', // optional, may be empty
          betAmount: tx.betAmount || 0,
          multiplier: 'Pending...',
          payout: 'Pending...',
          outcome: 'pending',
          time: new Date(tx.createdAt).toLocaleTimeString(),
          qieTxHash: null,
          nftTokenId: null,
          entropyProof: null,
          isPendingTransaction: true,
          qieLogTransactionId: tx.logId,
          nftTransactionId: tx.nftId,
        });
      }
    });

    return combinedHistory;
  };

  const combinedHistory = combineHistoryWithLocalTransactions();
  
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Game History</h3>
        {combinedHistory.length > visibleCount && (
          <button
            onClick={() => setVisibleCount((c) => Math.min(c + 5, combinedHistory.length))}
            className="bg-[#2A0025] border border-[#333947] rounded-lg px-3 py-2 text-sm text-white hover:bg-[#3A0035] transition-colors"
          >
            Show more
          </button>
        )}
      </div>

      {/* Game History Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#333947]">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Game
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Title
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Bet amount
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Multiplier
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Payout
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Blockchain Links
              </th>
            </tr>
          </thead>
          <tbody>
            {combinedHistory.slice(0, visibleCount).map((game) => (
              <tr key={game.id} className="border-b border-[#333947]/30 hover:bg-[#2A0025]/50 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      game.isPendingTransaction 
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
                        : 'bg-gradient-to-r from-pink-500 to-purple-500'
                    }`}>
                      {game.isPendingTransaction ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <span className="text-xs font-bold text-white">P</span>
                      )}
                    </div>
                    <span className="text-white text-sm">
                      Plinko
                      {game.isPendingTransaction && (
                        <span className="ml-1 text-yellow-400 text-xs">(Processing...)</span>
                      )}
                      {game.isLocalTransaction && (
                        <span className="ml-1 text-green-400 text-xs">(Recent)</span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-gray-300 text-sm">{game.title}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                    <span className="text-white text-sm">{game.betAmount}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-gray-300 text-sm">{game.multiplier}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                    <span className="text-white text-sm">{game.payout}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-col gap-1">
                    {game.isPendingTransaction ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-yellow-400 text-xs">Processing...</span>
                      </div>
                    ) : game.entropyProof || game.qieTxHash || game.nftTokenId ? (
                      <>
                        <div className="text-xs text-gray-300 font-mono">
                          <div className="text-yellow-400 font-bold">{game.entropyProof?.sequenceNumber && game.entropyProof.sequenceNumber !== '0' ? String(game.entropyProof.sequenceNumber) : ''}</div>
                        </div>
                        <div className="flex gap-1">
                          {game.qieTxHash && (
                            <button
                              onClick={() => openQIETestnetExplorer(game.qieTxHash)}
                              className="flex items-center gap-1 px-2 py-1 bg-[#1983FF]/10 border border-[#1983FF]/30 rounded text-[#1983FF] text-xs hover:bg-[#1983FF]/20 transition-colors"
                            >
                              <FaExternalLinkAlt size={8} />
                              QIE
                            </button>
                          )}
                          {game.nftTokenId && (
                            <button
                              onClick={() => openQIENFTExplorer(game.nftTokenId)}
                              className="flex items-center gap-1 px-2 py-1 bg-[#14D854]/10 border border-[#14D854]/30 rounded text-[#14D854] text-xs hover:bg-[#14D854]/20 transition-colors"
                            >
                              <FaExternalLinkAlt size={8} />
                              NFT
                            </button>
                          )}
                          {game.entropyProof?.transactionHash && (
                            <button
                              onClick={() => openEntropyExplorer(game.entropyProof.transactionHash)}
                              className="flex items-center gap-1 px-2 py-1 bg-[#681DDB]/10 border border-[#681DDB]/30 rounded text-[#681DDB] text-xs hover:bg-[#681DDB]/20 transition-colors"
                            >
                              <FaExternalLinkAlt size={8} />
                              Entropy
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-purple-400 text-xs">Generating...</span>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {history.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-[#2A0025] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-gray-400">📊</span>
          </div>
          <p className="text-gray-400 text-sm">No games played yet</p>
          <p className="text-gray-500 text-xs mt-1">Start playing to see your game history</p>
        </div>
      )}

      <div className="mt-4 text-center text-gray-400 text-sm">
        Showing {Math.min(visibleCount, history.length)} of {history.length} entries
      </div>
    </div>
  );
}

