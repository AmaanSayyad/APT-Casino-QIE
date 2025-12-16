// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title QIEGameNFT
 * @dev ERC-721 contract for minting game result NFTs on QIE Blockchain
 * Each NFT represents a completed game with metadata stored on-chain
 */
contract QIEGameNFT is ERC721, Ownable {
    using Strings for uint256;

    event GameNFTMinted(
        uint256 indexed tokenId,
        address indexed player,
        string gameType,
        uint256 betAmount,
        uint256 payout,
        bool isWin,
        uint256 timestamp
    );

    struct NFTData {
        uint256 tokenId;
        address player;
        string gameType;
        uint256 betAmount;
        uint256 payout;
        string multiplier;
        bool isWin;
        uint256 timestamp;
        string entropyTxHash;
        string metadataURI;
    }

    // Token ID counter
    uint256 private _tokenIdCounter;
    
    // Mapping from token ID to NFT data
    mapping(uint256 => NFTData) public nftData;
    
    // Mapping from player to their token IDs
    mapping(address => uint256[]) public playerTokens;
    
    // Authorized minters (game logger and treasury contracts)
    mapping(address => bool) public authorizedMinters;
    
    // Base URI for metadata
    string private _baseTokenURI;

    modifier onlyAuthorized() {
        require(authorizedMinters[msg.sender] || msg.sender == owner(), "Not authorized to mint NFTs");
        _;
    }

    constructor() ERC721("QIE Game NFT", "QGAME") Ownable(msg.sender) {
        // Owner is authorized by default
        authorizedMinters[msg.sender] = true;
        _tokenIdCounter = 1; // Start from 1
    }

    /**
     * @dev Mint a game NFT and transfer to player
     * @param player Player address to receive the NFT
     * @param gameType Type of game (ROULETTE, MINES, WHEEL, PLINKO)
     * @param betAmount Bet amount in wei
     * @param payout Payout amount in wei
     * @param multiplier Multiplier as string (e.g., "2.5x")
     * @param isWin Whether the game was won
     * @param entropyTxHash Arbitrum Sepolia transaction hash for entropy
     * @param metadataURI Optional metadata URI (can be empty for on-chain metadata)
     * @return tokenId The minted token ID
     */
    function mintGameNFT(
        address player,
        string memory gameType,
        uint256 betAmount,
        uint256 payout,
        string memory multiplier,
        bool isWin,
        string memory entropyTxHash,
        string memory metadataURI
    ) external onlyAuthorized returns (uint256 tokenId) {
        require(player != address(0), "Invalid player address");
        require(bytes(gameType).length > 0, "Game type cannot be empty");
        
        tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        // Store NFT data
        nftData[tokenId] = NFTData({
            tokenId: tokenId,
            player: player,
            gameType: gameType,
            betAmount: betAmount,
            payout: payout,
            multiplier: multiplier,
            isWin: isWin,
            timestamp: block.timestamp,
            entropyTxHash: entropyTxHash,
            metadataURI: metadataURI
        });

        // Update player tokens
        playerTokens[player].push(tokenId);

        // Mint and transfer to player
        _safeMint(player, tokenId);

        emit GameNFTMinted(
            tokenId,
            player,
            gameType,
            betAmount,
            payout,
            isWin,
            block.timestamp
        );

        return tokenId;
    }

    /**
     * @dev Get NFT metadata for a token
     * @param tokenId Token ID
     * @return NFT data struct
     */
    function getNFTMetadata(uint256 tokenId) external view returns (NFTData memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return nftData[tokenId];
    }

    /**
     * @dev Get all NFTs owned by a player
     * @param player Player address
     * @return Array of token IDs
     */
    function getPlayerNFTs(address player) external view returns (uint256[] memory) {
        return playerTokens[player];
    }

    /**
     * @dev Get player's NFT count
     * @param player Player address
     * @return Number of NFTs owned
     */
    function getPlayerNFTCount(address player) external view returns (uint256) {
        return playerTokens[player].length;
    }

    /**
     * @dev Override tokenURI to provide metadata
     * @param tokenId Token ID
     * @return Token URI string
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        NFTData memory data = nftData[tokenId];
        
        // If custom metadata URI is set, use it
        if (bytes(data.metadataURI).length > 0) {
            return data.metadataURI;
        }
        
        // Otherwise, generate on-chain metadata
        return _generateOnChainMetadata(tokenId, data);
    }

    /**
     * @dev Generate on-chain JSON metadata
     * @param tokenId Token ID
     * @param data NFT data
     * @return JSON metadata string
     */
    function _generateOnChainMetadata(uint256 tokenId, NFTData memory data) internal pure returns (string memory) {
        string memory outcome = data.isWin ? "WIN" : "LOSS";
        string memory name = string(abi.encodePacked("QIE Game #", tokenId.toString(), " - ", data.gameType));
        string memory description = string(abi.encodePacked(
            "Game result NFT for ", data.gameType, " game. ",
            "Bet: ", (data.betAmount / 1e18).toString(), " QIE, ",
            "Payout: ", (data.payout / 1e18).toString(), " QIE, ",
            "Result: ", outcome
        ));

        return string(abi.encodePacked(
            'data:application/json;base64,',
            _base64Encode(bytes(string(abi.encodePacked(
                '{"name":"', name, '",',
                '"description":"', description, '",',
                '"attributes":[',
                    '{"trait_type":"Game Type","value":"', data.gameType, '"},',
                    '{"trait_type":"Bet Amount","value":"', (data.betAmount / 1e18).toString(), ' QIE"},',
                    '{"trait_type":"Payout","value":"', (data.payout / 1e18).toString(), ' QIE"},',
                    '{"trait_type":"Multiplier","value":"', data.multiplier, '"},',
                    '{"trait_type":"Outcome","value":"', outcome, '"},',
                    '{"trait_type":"Timestamp","value":"', data.timestamp.toString(), '"},',
                    '{"trait_type":"Entropy TX","value":"', data.entropyTxHash, '"}',
                ']}'
            ))))
        ));
    }

    /**
     * @dev Base64 encode function
     * @param data Bytes to encode
     * @return Base64 encoded string
     */
    function _base64Encode(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";

        string memory table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        string memory result = new string(encodedLen + 32);

        assembly {
            let tablePtr := add(table, 1)
            let resultPtr := add(result, 32)
            for {
                let dataPtr := data
                let endPtr := add(dataPtr, mload(data))
            } lt(dataPtr, endPtr) {

            } {
                dataPtr := add(dataPtr, 3)
                let input := mload(dataPtr)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(18, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(12, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(6, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(input, 0x3F))))
                resultPtr := add(resultPtr, 1)
            }
            switch mod(mload(data), 3)
            case 1 {
                mstore8(sub(resultPtr, 2), 0x3d)
                mstore8(sub(resultPtr, 1), 0x3d)
            }
            case 2 {
                mstore8(sub(resultPtr, 1), 0x3d)
            }
        }

        return result;
    }

    /**
     * @dev Add authorized minter (only owner)
     * @param minter Address to authorize
     */
    function addAuthorizedMinter(address minter) external onlyOwner {
        require(minter != address(0), "Invalid minter address");
        authorizedMinters[minter] = true;
    }

    /**
     * @dev Remove authorized minter (only owner)
     * @param minter Address to remove authorization
     */
    function removeAuthorizedMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = false;
    }

    /**
     * @dev Check if address is authorized minter
     * @param minter Address to check
     * @return True if authorized
     */
    function isAuthorizedMinter(address minter) external view returns (bool) {
        return authorizedMinters[minter] || minter == owner();
    }

    /**
     * @dev Set base URI for metadata (only owner)
     * @param baseURI New base URI
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    /**
     * @dev Get current token ID counter
     * @return Current token ID that will be minted next
     */
    function getCurrentTokenId() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev Get total supply of minted tokens
     * @return Total number of tokens minted
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter - 1;
    }
}