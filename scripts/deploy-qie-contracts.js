const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Starting QIE Blockchain contract deployment...");
  
  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  // Check deployer balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "QIE");
  
  if (balance < hre.ethers.parseEther("0.1")) {
    console.warn("⚠️  Warning: Low balance. Make sure you have enough QIE for deployment.");
  }

  const deploymentResults = {
    network: "QIE Testnet",
    chainId: 1983,
    deployer: deployer.address,
    deployerBalance: hre.ethers.formatEther(balance),
    timestamp: new Date().toISOString(),
    contracts: {}
  };

  try {
    // Deploy QIETreasury
    console.log("\n📦 Deploying QIETreasury...");
    const QIETreasury = await hre.ethers.getContractFactory("QIETreasury");
    const qieTreasury = await QIETreasury.deploy();
    await qieTreasury.waitForDeployment();
    const treasuryAddress = await qieTreasury.getAddress();
    
    console.log("✅ QIETreasury deployed to:", treasuryAddress);
    deploymentResults.contracts.QIETreasury = {
      address: treasuryAddress,
      transactionHash: qieTreasury.deploymentTransaction().hash,
      blockNumber: qieTreasury.deploymentTransaction().blockNumber
    };

    // Deploy QIEGameLogger
    console.log("\n📦 Deploying QIEGameLogger...");
    const QIEGameLogger = await hre.ethers.getContractFactory("QIEGameLogger");
    const qieGameLogger = await QIEGameLogger.deploy();
    await qieGameLogger.waitForDeployment();
    const gameLoggerAddress = await qieGameLogger.getAddress();
    
    console.log("✅ QIEGameLogger deployed to:", gameLoggerAddress);
    deploymentResults.contracts.QIEGameLogger = {
      address: gameLoggerAddress,
      transactionHash: qieGameLogger.deploymentTransaction().hash,
      blockNumber: qieGameLogger.deploymentTransaction().blockNumber
    };

    // Deploy QIEGameNFT
    console.log("\n📦 Deploying QIEGameNFT...");
    const QIEGameNFT = await hre.ethers.getContractFactory("QIEGameNFT");
    const qieGameNFT = await QIEGameNFT.deploy();
    await qieGameNFT.waitForDeployment();
    const gameNFTAddress = await qieGameNFT.getAddress();
    
    console.log("✅ QIEGameNFT deployed to:", gameNFTAddress);
    deploymentResults.contracts.QIEGameNFT = {
      address: gameNFTAddress,
      transactionHash: qieGameNFT.deploymentTransaction().hash,
      blockNumber: qieGameNFT.deploymentTransaction().blockNumber
    };

    // Set up contract permissions
    console.log("\n🔐 Setting up contract permissions...");
    
    // Authorize GameLogger to mint NFTs
    console.log("📝 Authorizing GameLogger to mint NFTs...");
    const authorizeMinterTx = await qieGameNFT.addAuthorizedMinter(gameLoggerAddress);
    await authorizeMinterTx.wait();
    console.log("✅ GameLogger authorized as NFT minter");

    // Authorize deployer as logger (for server-side operations)
    console.log("📝 Authorizing deployer as game logger...");
    const authorizeLoggerTx = await qieGameLogger.addAuthorizedLogger(deployer.address);
    await authorizeLoggerTx.wait();
    console.log("✅ Deployer authorized as game logger");

    // Verify contract setup
    console.log("\n🔍 Verifying contract setup...");
    
    const isLoggerAuthorized = await qieGameLogger.isAuthorizedLogger(deployer.address);
    const isMinterAuthorized = await qieGameNFT.isAuthorizedMinter(gameLoggerAddress);
    
    console.log("📊 Contract verification:");
    console.log("  - Deployer is authorized logger:", isLoggerAuthorized);
    console.log("  - GameLogger is authorized minter:", isMinterAuthorized);

    // Save deployment results
    const deploymentFile = `deployments/qie-contracts-${Date.now()}.json`;
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentResults, null, 2));
    console.log("\n💾 Deployment results saved to:", deploymentFile);

    // Generate environment variables
    console.log("\n📋 Environment variables for .env file:");
    console.log("# QIE Blockchain Contract Addresses");
    console.log(`NEXT_PUBLIC_QIE_TREASURY_ADDRESS=${treasuryAddress}`);
    console.log(`NEXT_PUBLIC_QIE_GAME_LOGGER_ADDRESS=${gameLoggerAddress}`);
    console.log(`NEXT_PUBLIC_QIE_GAME_NFT_ADDRESS=${gameNFTAddress}`);
    console.log("");
    console.log("# QIE Blockchain Configuration");
    console.log("NEXT_PUBLIC_QIE_CHAIN_ID=1983");
    console.log("NEXT_PUBLIC_QIE_RPC_URL=https://rpc1testnet.qie.digital/");
    console.log("NEXT_PUBLIC_QIE_EXPLORER_URL=https://testnet.qie.digital");
    console.log("");
    console.log("# Server Private Key (replace with your actual key)");
    console.log("QIE_SERVER_PRIVATE_KEY=your_private_key_here");

    // Generate explorer links
    console.log("\n🔗 QIE Testnet Explorer Links:");
    console.log(`QIETreasury: https://testnet.qie.digital/address/${treasuryAddress}`);
    console.log(`QIEGameLogger: https://testnet.qie.digital/address/${gameLoggerAddress}`);
    console.log(`QIEGameNFT: https://testnet.qie.digital/address/${gameNFTAddress}`);

    console.log("\n🎉 QIE Blockchain deployment completed successfully!");
    console.log("📝 Next steps:");
    console.log("1. Update your .env file with the contract addresses above");
    console.log("2. Update src/config/contracts.js with the new addresses");
    console.log("3. Verify contracts on QIE Testnet Explorer if needed");
    console.log("4. Fund the server wallet with QIE for gas fees");

    return deploymentResults;

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    
    // Save partial deployment results if any contracts were deployed
    if (Object.keys(deploymentResults.contracts).length > 0) {
      deploymentResults.error = error.message;
      const errorFile = `deployments/qie-contracts-error-${Date.now()}.json`;
      fs.writeFileSync(errorFile, JSON.stringify(deploymentResults, null, 2));
      console.log("💾 Partial deployment results saved to:", errorFile);
    }
    
    throw error;
  }
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;