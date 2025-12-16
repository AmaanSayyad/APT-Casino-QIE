/**
 * Explorer URL utility functions for QIE Blockchain and Pyth Entropy
 * 
 * This module provides functions to generate explorer URLs for:
 * - QIE Testnet transactions and NFTs
 * - Pyth Entropy transactions on Arbitrum Sepolia
 */

// QIE Testnet Explorer base URL
const QIE_EXPLORER_BASE_URL = 'https://testnet.qie.digital';

// Pyth Entropy Explorer configuration
const ENTROPY_EXPLORER_BASE_URL = 'https://entropy-explorer.pyth.network';
const ENTROPY_CHAIN = 'arbitrum-sepolia';

/**
 * Generate QIE Testnet Explorer URL for a transaction
 * @param {string} txHash - Transaction hash
 * @returns {string} QIE Explorer transaction URL
 * @throws {Error} If txHash is not provided or invalid
 */
export function getQIEExplorerUrl(txHash) {
  if (!txHash || typeof txHash !== 'string') {
    throw new Error('Transaction hash is required and must be a string');
  }
  
  // Remove '0x' prefix if present and validate hex format
  const cleanHash = txHash.startsWith('0x') ? txHash.slice(2) : txHash;
  if (!/^[a-fA-F0-9]{64}$/.test(cleanHash)) {
    throw new Error('Invalid transaction hash format');
  }
  
  return `${QIE_EXPLORER_BASE_URL}/tx/${txHash}`;
}

/**
 * Generate QIE Testnet Explorer URL for an NFT token
 * @param {string} tokenId - NFT token ID
 * @param {string} contractAddress - NFT contract address (optional, uses env var if not provided)
 * @returns {string} QIE Explorer NFT URL
 * @throws {Error} If tokenId is not provided or invalid
 */
export function getQIENFTUrl(tokenId, contractAddress = null) {
  if (!tokenId || (typeof tokenId !== 'string' && typeof tokenId !== 'number')) {
    throw new Error('Token ID is required and must be a string or number');
  }
  
  // Use provided contract address or fall back to environment variable
  const nftContractAddress = contractAddress || process.env.NEXT_PUBLIC_QIE_GAME_NFT_ADDRESS;
  
  if (!nftContractAddress) {
    throw new Error('NFT contract address is required. Provide it as parameter or set NEXT_PUBLIC_QIE_GAME_NFT_ADDRESS environment variable');
  }
  
  // Validate contract address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(nftContractAddress)) {
    throw new Error('Invalid contract address format');
  }
  
  return `${QIE_EXPLORER_BASE_URL}/token/${nftContractAddress}/${tokenId}`;
}

/**
 * Generate Pyth Entropy Explorer URL for an Arbitrum Sepolia transaction
 * @param {string} txHash - Transaction hash from Arbitrum Sepolia
 * @returns {string} Entropy Explorer transaction URL
 * @throws {Error} If txHash is not provided or invalid
 */
export function getEntropyExplorerUrl(txHash) {
  if (!txHash || typeof txHash !== 'string') {
    throw new Error('Transaction hash is required and must be a string');
  }
  
  // Remove '0x' prefix if present and validate hex format
  const cleanHash = txHash.startsWith('0x') ? txHash.slice(2) : txHash;
  if (!/^[a-fA-F0-9]{64}$/.test(cleanHash)) {
    throw new Error('Invalid transaction hash format');
  }
  
  return `${ENTROPY_EXPLORER_BASE_URL}/?chain=${ENTROPY_CHAIN}&search=${txHash}`;
}

/**
 * Get QIE Explorer base URL
 * @returns {string} QIE Explorer base URL
 */
export function getQIEExplorerBaseUrl() {
  return QIE_EXPLORER_BASE_URL;
}

/**
 * Get Entropy Explorer base URL
 * @returns {string} Entropy Explorer base URL
 */
export function getEntropyExplorerBaseUrl() {
  return ENTROPY_EXPLORER_BASE_URL;
}

/**
 * Validate if a string is a valid Ethereum transaction hash
 * @param {string} txHash - Transaction hash to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidTxHash(txHash) {
  if (!txHash || typeof txHash !== 'string') {
    return false;
  }
  
  const cleanHash = txHash.startsWith('0x') ? txHash.slice(2) : txHash;
  return /^[a-fA-F0-9]{64}$/.test(cleanHash);
}

/**
 * Validate if a string is a valid Ethereum address
 * @param {string} address - Address to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidAddress(address) {
  if (!address || typeof address !== 'string') {
    return false;
  }
  
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}