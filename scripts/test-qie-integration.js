/**
 * Test script for QIE Blockchain integration
 * This script tests the complete flow: game logging, NFT minting, and history display
 */

const testGameResult = {
  gameType: 'PLINKO',
  playerAddress: '0x83CC763c3D80906B62e79c0b5D9Ab87C3D4D1646',
  betAmount: 0.001,
  payout: 0.0003,
  result: {
    ballPath: [0, 1, 0, 1, 1, 0, 1],
    finalSlot: 3,
    multiplier: 0.3
  },
  entropyProof: {
    transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    sequenceNumber: '12345',
    requestId: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
  }
};

async function testQIEIntegration() {
  console.log('🧪 Testing QIE Blockchain Integration...\n');

  try {
    // Step 1: Test log-game API
    console.log('📝 Step 1: Testing log-game API...');
    const response = await fetch('http://localhost:3000/api/log-game', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testGameResult)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`API call failed: ${result.error}`);
    }

    console.log('✅ API call successful!');
    console.log('📊 Response:', JSON.stringify(result, null, 2));

    const logTransactionId = result.transactions?.log?.id;
    const nftTransactionId = result.transactions?.nft?.id;

    if (!logTransactionId || !nftTransactionId) {
      throw new Error('Missing transaction IDs in response');
    }

    // Step 2: Poll transaction statuses
    console.log('\n⏳ Step 2: Polling transaction statuses...');
    
    let logCompleted = false;
    let nftCompleted = false;
    let attempts = 0;
    const maxAttempts = 30; // 1 minute with 2-second intervals

    while ((!logCompleted || !nftCompleted) && attempts < maxAttempts) {
      attempts++;
      console.log(`\n🔄 Attempt ${attempts}/${maxAttempts}:`);

      // Check log transaction
      if (!logCompleted) {
        try {
          const logResponse = await fetch(`http://localhost:3000/api/log-game?id=${logTransactionId}`);
          const logResult = await logResponse.json();
          
          if (logResult.success && logResult.transaction) {
            console.log(`📝 Log transaction status: ${logResult.transaction.status}`);
            if (logResult.transaction.status === 'COMPLETED') {
              logCompleted = true;
              console.log('✅ Game logging completed!');
              console.log('🔗 QIE Transaction Hash:', logResult.transaction.result?.txHash);
              console.log('🧱 Block Number:', logResult.transaction.result?.blockNumber);
            } else if (logResult.transaction.status === 'FAILED') {
              console.log('❌ Game logging failed:', logResult.transaction.error);
              break;
            }
          }
        } catch (error) {
          console.log('⚠️ Error checking log transaction:', error.message);
        }
      }

      // Check NFT transaction
      if (!nftCompleted) {
        try {
          const nftResponse = await fetch(`http://localhost:3000/api/log-game?id=${nftTransactionId}`);
          const nftResult = await nftResponse.json();
          
          if (nftResult.success && nftResult.transaction) {
            console.log(`🎨 NFT transaction status: ${nftResult.transaction.status}`);
            if (nftResult.transaction.status === 'COMPLETED') {
              nftCompleted = true;
              console.log('✅ NFT minting completed!');
              console.log('🎨 NFT Token ID:', nftResult.transaction.result?.tokenId);
              console.log('🔗 NFT Transaction Hash:', nftResult.transaction.result?.txHash);
              console.log('🌐 NFT Explorer URL:', nftResult.transaction.result?.nftUrl);
            } else if (nftResult.transaction.status === 'FAILED') {
              console.log('❌ NFT minting failed:', nftResult.transaction.error);
              break;
            }
          }
        } catch (error) {
          console.log('⚠️ Error checking NFT transaction:', error.message);
        }
      }

      if (!logCompleted || !nftCompleted) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      }
    }

    // Step 3: Summary
    console.log('\n📊 Test Summary:');
    console.log('================');
    console.log(`Game Logging: ${logCompleted ? '✅ COMPLETED' : '❌ FAILED/TIMEOUT'}`);
    console.log(`NFT Minting: ${nftCompleted ? '✅ COMPLETED' : '❌ FAILED/TIMEOUT'}`);
    
    if (logCompleted && nftCompleted) {
      console.log('\n🎉 QIE Blockchain integration is working correctly!');
      console.log('✅ Game results are being logged to QIE Testnet');
      console.log('✅ NFTs are being minted for each game');
      console.log('✅ Transaction queue is processing correctly');
    } else {
      console.log('\n⚠️ Some issues detected. Check the logs above for details.');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testQIEIntegration();