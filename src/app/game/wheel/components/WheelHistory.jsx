"use client";

import React, { useState } from "react";
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, TextField, InputAdornment, Select, MenuItem, FormControl, Chip, Pagination, Divider, Fade } from "@mui/material";
import { FaHistory, FaFilter, FaDownload, FaSearch, FaTrophy, FaChartLine, FaExternalLinkAlt, FaCheck } from "react-icons/fa";
import Image from "next/image";
import { useQIETransactionManager } from "@/hooks/useQIETransactionManager";
import { useAccount } from "wagmi";
// Using Next.js public asset reference instead of import

const WheelHistory = ({ gameHistory = [] }) => {
  const [activeTab, setActiveTab] = useState("all");
  const [entriesShown, setEntriesShown] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  
  // Get user account
  const { address } = useAccount();
  
  // Get localStorage transactions
  const { getTransactionsForGame } = useQIETransactionManager();
  const localTransactions = address ? getTransactionsForGame('WHEEL', address) : { pending: [], completed: [] };

   // Open QIE Testnet Explorer link for transaction hash
   const openQIETestnetExplorer = (hash) => {
    if (hash && hash !== 'unknown') {
      const explorerUrl = `https://testnet.qie.digital/tx/${hash}`;
      window.open(explorerUrl, '_blank');
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

  // Open Entropy Explorer link (Arbitrum Sepolia)
  const openEntropyExplorer = (txHash) => {
    if (txHash) {
      const entropyExplorerUrl = `https://entropy-explorer.pyth.network/?chain=arbitrum-sepolia&search=${txHash}`;
      window.open(entropyExplorerUrl, '_blank');
    }
  };
  
  // Combine DB history with localStorage transactions
  const combineHistoryWithLocalTransactions = () => {
    const combinedHistory = [...gameHistory];

    // Map by transaction ids coming from /api/log-game
    const byLogId = new Map();
    const byNftId = new Map();
    combinedHistory.forEach((game) => {
      if (game.qieLogTransactionId) byLogId.set(game.qieLogTransactionId, game);
      if (game.nftTransactionId) byNftId.set(game.nftTransactionId, game);
    });

    // Enrich existing history rows with completed tx info (no new "unknown" rows)
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

    // Add pending tx rows only if they are not already represented
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
          game: 'Wheel',
          betAmount: tx.betAmount || 0,
          payout: 0,
          multiplier: 'Pending...',
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

  const historyData = combineHistoryWithLocalTransactions();
  
  // Filter history based on active tab and search query
  const filteredHistory = historyData.filter(item => {
    const matchesSearch = 
      (item.game && item.game.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.multiplier && item.multiplier.toLowerCase().includes(searchQuery.toLowerCase()));
      
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "high-risk") return item.multiplier && parseFloat(item.multiplier) >= 3.0 && matchesSearch;
    if (activeTab === "big-wins") return item.payout && item.payout >= 100 && matchesSearch;
    return matchesSearch;
  });
  
  // Stats calculation from real data
  const totalBets = historyData.length;
  const totalVolume = historyData.reduce((sum, item) => sum + (parseFloat(item.betAmount) || 0), 0);
  const biggestWin = historyData.length > 0 ? Math.max(...historyData.map(item => parseFloat(item.payout) || 0)) : 0;
  
  // Pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const paginatedHistory = filteredHistory.slice((page - 1) * entriesShown, page * entriesShown);
  const totalPages = Math.ceil(filteredHistory.length / entriesShown);
  
  return (
    <Paper
      elevation={5}
      sx={{
        p: { xs: 2, md: 3 },
        borderRadius: 3,
        background: 'linear-gradient(135deg, rgba(9, 0, 5, 0.9) 0%, rgba(25, 5, 30, 0.85) 100%)',
        backdropFilter: 'blur(15px)',
        border: '1px solid rgba(104, 29, 219, 0.2)',
        mb: 5,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        height: '100%',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '5px',
          background: 'linear-gradient(90deg, #681DDB, #14D854)',
        }
      }}
    >
      <Typography 
        variant="h5" 
        fontWeight="bold" 
        gutterBottom
        sx={{ 
          borderBottom: '1px solid rgba(104, 29, 219, 0.3)',
          pb: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          color: 'white',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}
      >
        <FaHistory color="#681DDB" size={22} />
        <span style={{ background: 'linear-gradient(90deg, #FFFFFF, #681DDB)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Game History
        </span>
      </Typography>
      
      <Typography 
        variant="body2" 
        color="rgba(255,255,255,0.7)"
        sx={{ mb: 3 }}
      >
        Recent game results and statistics
      </Typography>

      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' }, 
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', md: 'center' },
        mb: 3,
        gap: 2
      }}>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, 
          gap: 2,
          width: '100%'
        }}>
          <Box 
            sx={{ 
              p: 2, 
              borderRadius: 2, 
              backgroundColor: 'rgba(104, 29, 219, 0.1)', 
              border: '1px solid rgba(104, 29, 219, 0.2)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Typography variant="caption" color="rgba(255,255,255,0.5)" sx={{ mb: 0.5 }}>
              Total Bets
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" fontWeight="bold" color="white">
                {totalBets}
              </Typography>
              <FaChartLine color="rgba(104, 29, 219, 0.8)" />
            </Box>
          </Box>
          
          <Box 
            sx={{ 
              p: 2, 
              borderRadius: 2, 
              backgroundColor: 'rgba(255, 165, 0, 0.1)', 
              border: '1px solid rgba(255, 165, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Typography variant="caption" color="rgba(255,255,255,0.5)" sx={{ mb: 0.5 }}>
              Total Volume
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" fontWeight="bold" color="white" sx={{ 
                maxWidth: '80%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {totalVolume.toFixed(5)} QIE
              </Typography>
              <Box 
                sx={{ 
                  width: 24, 
                  height: 24, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}
              >
                <Image src="/coin.png" width={20} height={20} alt="coin" />
              </Box>
            </Box>
          </Box>
          
          <Box 
            sx={{ 
              p: 2, 
              borderRadius: 2, 
              backgroundColor: 'rgba(20, 216, 84, 0.1)', 
              border: '1px solid rgba(20, 216, 84, 0.2)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Typography variant="caption" color="rgba(255,255,255,0.5)" sx={{ mb: 0.5 }}>
              Biggest Win
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" fontWeight="bold" color="white" sx={{ 
                maxWidth: '80%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {biggestWin.toFixed(5)} QIE
              </Typography>
              <FaTrophy color="#FFA500" />
            </Box>
          </Box>
        </Box>
      </Box>
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' }, 
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', md: 'center' },
        mb: 3,
        gap: 2
      }}>
        <Box sx={{ 
          display: 'flex', 
          gap: 1,
          borderBottom: '1px solid rgba(104, 29, 219, 0.2)',
          width: { xs: '100%', md: 'auto' }
        }}>
          <Button 
            variant={activeTab === 'all' ? 'contained' : 'text'}
            onClick={() => setActiveTab('all')}
            sx={{ 
              borderRadius: '4px 4px 0 0',
              backgroundColor: activeTab === 'all' ? 'rgba(104, 29, 219, 0.3)' : 'transparent',
              color: activeTab === 'all' ? 'white' : 'rgba(255,255,255,0.7)',
              '&:hover': {
                backgroundColor: activeTab === 'all' ? 'rgba(104, 29, 219, 0.4)' : 'rgba(104, 29, 219, 0.1)',
              },
              borderBottom: activeTab === 'all' ? '2px solid #681DDB' : 'none',
              boxShadow: 'none',
              minWidth: '80px'
            }}
          >
            All Spins
          </Button>
          <Button 
            variant={activeTab === 'high-risk' ? 'contained' : 'text'}
            onClick={() => setActiveTab('high-risk')}
            sx={{ 
              borderRadius: '4px 4px 0 0',
              backgroundColor: activeTab === 'high-risk' ? 'rgba(104, 29, 219, 0.3)' : 'transparent',
              color: activeTab === 'high-risk' ? 'white' : 'rgba(255,255,255,0.7)',
              '&:hover': {
                backgroundColor: activeTab === 'high-risk' ? 'rgba(104, 29, 219, 0.4)' : 'rgba(104, 29, 219, 0.1)',
              },
              borderBottom: activeTab === 'high-risk' ? '2px solid #681DDB' : 'none',
              boxShadow: 'none',
              minWidth: '80px'
            }}
          >
            High Risk
          </Button>
          <Button 
            variant={activeTab === 'big-wins' ? 'contained' : 'text'}
            onClick={() => setActiveTab('big-wins')}
            sx={{ 
              borderRadius: '4px 4px 0 0',
              backgroundColor: activeTab === 'big-wins' ? 'rgba(104, 29, 219, 0.3)' : 'transparent',
              color: activeTab === 'big-wins' ? 'white' : 'rgba(255,255,255,0.7)',
              '&:hover': {
                backgroundColor: activeTab === 'big-wins' ? 'rgba(104, 29, 219, 0.4)' : 'rgba(104, 29, 219, 0.1)',
              },
              borderBottom: activeTab === 'big-wins' ? '2px solid #681DDB' : 'none',
              boxShadow: 'none',
              minWidth: '80px'
            }}
          >
            Big Wins
          </Button>
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          gap: 2,
          flexWrap: { xs: 'wrap', md: 'nowrap' }
        }}>
          <TextField
                    placeholder="Search history..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FaSearch color="rgba(255,255,255,0.5)" />
                </InputAdornment>
              ),
              sx: {
                color: 'white',
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: 1,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(104, 29, 219, 0.2)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(104, 29, 219, 0.3)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(104, 29, 219, 0.5)',
                },
                '&::placeholder': {
                  color: 'rgba(255,255,255,0.5)',
                  opacity: 1,
                },
              }
            }}
            sx={{ 
              minWidth: { xs: '100%', md: '200px' },
              '& .MuiInputBase-input::placeholder': {
                color: 'rgba(255,255,255,0.5)',
                opacity: 1,
              },
            }}
          />
          
          <FormControl 
            size="small" 
            sx={{ 
              minWidth: { xs: '100%', md: '120px' },
            }}
          >
            <Select
                  value={entriesShown}
                  onChange={(e) => setEntriesShown(Number(e.target.value))}
              sx={{
                color: 'white',
                backgroundColor: 'rgba(0,0,0,0.2)',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(104, 29, 219, 0.2)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(104, 29, 219, 0.3)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(104, 29, 219, 0.5)',
                },
                '& .MuiSelect-icon': {
                  color: 'rgba(255,255,255,0.5)',
                },
              }}
            >
              <MenuItem value={10}>Show 10</MenuItem>
              <MenuItem value={20}>Show 20</MenuItem>
              <MenuItem value={50}>Show 50</MenuItem>
            </Select>
          </FormControl>
          
          <Button 
            variant="contained"
            startIcon={<FaDownload />}
            sx={{ 
              backgroundColor: 'rgba(104, 29, 219, 0.3)',
              '&:hover': {
                backgroundColor: 'rgba(104, 29, 219, 0.5)',
              },
              minWidth: { xs: '100%', md: 'auto' },
            }}
          >
                  Export
          </Button>
        </Box>
      </Box>
      
      <TableContainer 
        sx={{ 
          backgroundColor: 'rgba(0,0,0,0.2)', 
          borderRadius: 2,
          border: '1px solid rgba(104, 29, 219, 0.2)',
          mb: 3,
          maxHeight: '500px',
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'rgba(0,0,0,0.1)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(104, 29, 219, 0.3)',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: 'rgba(104, 29, 219, 0.5)',
            },
          },
        }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell 
                sx={{ 
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  color: 'white',
                  fontWeight: 'bold',
                  borderBottom: '1px solid rgba(104, 29, 219, 0.2)'
                }}
              >
                Game
              </TableCell>
              <TableCell 
                sx={{ 
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  color: 'white',
                  fontWeight: 'bold',
                  borderBottom: '1px solid rgba(104, 29, 219, 0.2)'
                }}
              >
                Time
              </TableCell>
              <TableCell 
                sx={{ 
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  color: 'white',
                  fontWeight: 'bold',
                  borderBottom: '1px solid rgba(104, 29, 219, 0.2)'
                }}
              >
                Bet Amount
              </TableCell>
              <TableCell 
                sx={{ 
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  color: 'white',
                  fontWeight: 'bold',
                  borderBottom: '1px solid rgba(104, 29, 219, 0.2)'
                }}
              >
                Multiplier
              </TableCell>
              <TableCell 
                sx={{ 
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  color: 'white',
                  fontWeight: 'bold',
                  borderBottom: '1px solid rgba(104, 29, 219, 0.2)'
                }}
              >
                Payout
              </TableCell>
              <TableCell 
                sx={{ 
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  color: 'white',
                  fontWeight: 'bold',
                  borderBottom: '1px solid rgba(104, 29, 219, 0.2)'
                }}
              >
                Result
              </TableCell>
              <TableCell 
                sx={{ 
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  color: 'white',
                  fontWeight: 'bold',
                  borderBottom: '1px solid rgba(104, 29, 219, 0.2)'
                }}
              >
                Blockchain Links
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedHistory.map((item, index) => (
              <Fade 
                in={true} 
                key={item.id}
                style={{ 
                  transformOrigin: '0 0 0',
                  transitionDelay: `${index * 50}ms`
                }}
              >
                <TableRow 
                  sx={{ 
                    '&:nth-of-type(odd)': { 
                      backgroundColor: 'rgba(0,0,0,0.1)' 
                    },
                    '&:hover': { 
                      backgroundColor: 'rgba(104, 29, 219, 0.1)' 
                    },
                    transition: 'background-color 0.2s'
                  }}
                >
                  <TableCell 
                    sx={{ 
                      color: 'white',
                      borderBottom: '1px solid rgba(104, 29, 219, 0.1)'
                    }}
                  >
                    {item.game || 'Wheel'}
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      color: 'rgba(255,255,255,0.7)',
                      borderBottom: '1px solid rgba(104, 29, 219, 0.1)'
                    }}
                  >
                    {item.time}
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      borderBottom: '1px solid rgba(104, 29, 219, 0.1)'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography 
                        variant="body2" 
                        color="rgba(255,255,255,0.7)"
                        sx={{ 
                          maxWidth: '80px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                            {item.betAmount} QIE
                      </Typography>
                      <Image src="/coin.png" width={16} height={16} alt="coin" />
                    </Box>
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      color: 'white',
                      fontWeight: 'medium',
                      borderBottom: '1px solid rgba(104, 29, 219, 0.1)'
                    }}
                  >
                    {item.multiplier}
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      borderBottom: '1px solid rgba(104, 29, 219, 0.1)'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography 
                        variant="body2" 
                        color="#FFA500"
                        fontWeight="medium"
                        sx={{ 
                          maxWidth: '80px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                            {item.payout} QIE
                      </Typography>
                      <Image src="/coin.png" width={16} height={16} alt="coin" />
                    </Box>
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      color: item.payout > 0 ? '#14D854' : '#d82633',
                      fontWeight: 'medium',
                      borderBottom: '1px solid rgba(104, 29, 219, 0.1)'
                    }}
                  >
                        {item.payout > 0 ? `+${item.payout}` : '0'}
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      borderBottom: '1px solid rgba(104, 29, 219, 0.1)'
                    }}
                  >
                    {item.entropyProof || item.qieTxHash || item.nftTokenId ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip 
                            icon={<FaCheck size={10} />}
                            label={item.entropyProof?.sequenceNumber ? 
                                  `#${item.entropyProof.sequenceNumber}` : 
                                  'Verified'
                                }
                            size="small"
                            sx={{ 
                              backgroundColor: 'rgba(20, 216, 84, 0.1)',
                              border: '1px solid rgba(20, 216, 84, 0.2)',
                              color: '#14D854',
                              fontSize: '0.7rem',
                              height: 20,
                              '& .MuiChip-icon': {
                                color: '#14D854',
                                fontSize: '0.7rem',
                              }
                            }}
                          />
                          {item.qieTxHash && (
                            <Button
                              onClick={() => openQIETestnetExplorer(item.qieTxHash)}
                              size="small"
                              startIcon={<FaExternalLinkAlt size={10} />}
                              sx={{ 
                                color: '#1983FF',
                                fontSize: '0.7rem',
                                minWidth: 'auto',
                                p: 0,
                                '&:hover': {
                                  backgroundColor: 'transparent',
                                  textDecoration: 'underline',
                                }
                              }}
                            >
                              QIE
                            </Button>
                          )}
                          {item.nftTokenId && (
                            <Button
                              onClick={() => openQIENFTExplorer(item.nftTokenId)}
                              size="small"
                              startIcon={<FaExternalLinkAlt size={10} />}
                              sx={{ 
                                color: '#14D854',
                                fontSize: '0.7rem',
                                minWidth: 'auto',
                                p: 0,
                                '&:hover': {
                                  backgroundColor: 'transparent',
                                  textDecoration: 'underline',
                                }
                              }}
                            >
                              NFT
                            </Button>
                          )}
                          {item.entropyProof?.transactionHash && (
                            <Button
                              onClick={() => openEntropyExplorer(item.entropyProof.transactionHash)}
                              size="small"
                              startIcon={<FaExternalLinkAlt size={10} />}
                              sx={{ 
                                color: '#681DDB',
                                fontSize: '0.7rem',
                                minWidth: 'auto',
                                p: 0,
                                '&:hover': {
                                  backgroundColor: 'transparent',
                                  textDecoration: 'underline',
                                }
                              }}
                            >
                              Entropy
                            </Button>
                          )}
                        </Box>
                        <Typography variant="caption" color="rgba(255,255,255,0.5)">
                          {item.qieTxHash ? 'Game logged on QIE' : 'Pyth Entropy'}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="rgba(255,255,255,0.3)">
                        N/A
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              </Fade>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
            
            {filteredHistory.length === 0 && (
        <Box 
          sx={{ 
            py: 4, 
            textAlign: 'center', 
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: 2,
            border: '1px solid rgba(104, 29, 219, 0.2)',
            mb: 3
          }}
        >
          <Typography color="rgba(255,255,255,0.5)">
            No results found. Try different filters.
          </Typography>
        </Box>
      )}
      
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Typography variant="body2" color="rgba(255,255,255,0.5)">
                Showing {Math.min(entriesShown, filteredHistory.length)} of {filteredHistory.length} results
        </Typography>
        
        {totalPages > 1 && (
          <Pagination
            count={totalPages}
            page={page}
            onChange={handleChangePage}
            variant="outlined"
            shape="rounded"
            sx={{
              '& .MuiPaginationItem-root': {
                color: 'rgba(255,255,255,0.7)',
                borderColor: 'rgba(104, 29, 219, 0.2)',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(104, 29, 219, 0.3)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(104, 29, 219, 0.4)',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(104, 29, 219, 0.1)',
                },
              },
            }}
          />
        )}
      </Box>
    </Paper>
  );
};

export default WheelHistory; 


