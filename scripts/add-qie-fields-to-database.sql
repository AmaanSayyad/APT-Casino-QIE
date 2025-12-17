-- Migration script to add QIE blockchain fields to game_results table
-- This script adds support for QIE transaction hash, block number, and NFT token ID

-- Add QIE transaction hash column
ALTER TABLE game_results 
ADD COLUMN IF NOT EXISTS qie_tx_hash VARCHAR(66);

-- Add QIE block number column
ALTER TABLE game_results 
ADD COLUMN IF NOT EXISTS qie_block_number BIGINT;

-- Add NFT token ID column
ALTER TABLE game_results 
ADD COLUMN IF NOT EXISTS nft_token_id VARCHAR(255);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_game_results_qie_tx_hash ON game_results(qie_tx_hash);
CREATE INDEX IF NOT EXISTS idx_game_results_nft_token_id ON game_results(nft_token_id);

-- Add comments for documentation
COMMENT ON COLUMN game_results.qie_tx_hash IS 'Transaction hash of the game log on QIE Testnet';
COMMENT ON COLUMN game_results.qie_block_number IS 'Block number of the game log transaction on QIE Testnet';
COMMENT ON COLUMN game_results.nft_token_id IS 'Token ID of the game result NFT minted on QIE Testnet';

-- Display current table structure
\d game_results;