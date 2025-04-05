import React, { useState, useEffect } from 'react';
import './swapInterface.css';
const ethers = require("ethers");

// Props expected:
// - account: string | null
// - isConnected: boolean
// - chainId: string | null (Optional, but useful for chain-specific logic)

function SwapInterface({ account, isConnected, chainId }) { // Receive props
  // Internal state for the swap form remains
  const [sourceChain, setSourceChain] = useState('');
  const [sourceAsset, setSourceAsset] = useState('');
  const [sourceAmount, setSourceAmount] = useState('');
  const [sourceBalance, setSourceBalance] = useState('0.0'); 

  const [destChain, setDestChain] = useState('');
  const [destAsset, setDestAsset] = useState('');
  const [destAmount, setDestAmount] = useState('0.0'); 
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // --- Dummy Data (Keep or replace with dynamic fetching) ---
  const supportedChains = [
     { id: 'eth', name: 'Ethereum', chainIdHex: '0x1', logo: 'ethereum-logo.png' },
     { id: 'poly', name: 'Polygon', chainIdHex: '0x89', logo: 'polygon-logo.png' },
     { id: 'sol', name: 'Solana', chainIdHex: null, logo: 'solana-logo.png' }, // Solana doesn't use hex chain ID
     { id: 'osmo', name: 'Osmosis', chainIdHex: null, logo: 'osmosis-logo.png' }, // Cosmos chains have string IDs
     { id: 'sepolia', name: 'Sepolia Testnet', chainIdHex: '0xaa36a7', logo: 'ethereum-logo.png' }, // Example Testnet
  ];
  const erc20Abi = [
    // Read-Only Functions
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)",
    // Authenticated Functions
    // "function approve(address spender, uint amount) returns (bool)",
    // "function transfer(address to, uint amount) returns (bool)",
  ];
   const assetsByChain = {
    eth: [ // Ethereum Mainnet (Example Addresses - VERIFY BEFORE USE)
        { symbol: 'ETH', name: 'Ether', logo: 'eth-logo.png', isNative: true, decimals: 18 },
        { symbol: 'USDC', name: 'USD Coin', logo: 'usdc-logo.png', isNative: false, contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
        { symbol: 'DAI', name: 'Dai Stablecoin', logo: 'dai-logo.png', isNative: false, contractAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
      ],
      poly: [ // Polygon PoS (Example Addresses - VERIFY BEFORE USE)
        { symbol: 'MATIC', name: 'Matic', logo: 'matic-logo.png', isNative: true, decimals: 18 },
        { symbol: 'USDC', name: 'USD Coin (PoS)', logo: 'usdc-logo.png', isNative: false, contractAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6 }, // Common PoS USDC
         { symbol: 'WETH', name: 'Wrapped Ether', logo: 'weth-logo.png', isNative: false, contractAddress: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18 },
      ],
      sepolia: [ // Sepolia Testnet (Example Addresses - Often need specific test deployments)
        { symbol: 'ETH', name: 'Sepolia Ether', logo: 'eth-logo.png', isNative: true, decimals: 18 },
        // You'd typically deploy your own mock tokens or find standard testnet ones
        { symbol: 'mUSDC', name: 'Mock USDC', logo: 'usdc-logo.png', isNative: false, contractAddress: '0x...', decimals: 6 }, // Replace 0x... with actual deployed test address
        { symbol: 'TST', name: 'Test Token', logo: 'test-logo.png', isNative: false, contractAddress: '0x...', decimals: 18 }, // Replace 0x...
      ],sol: [ {symbol:'SOL'},{symbol:'USDC'} ], osmo: [ {symbol:'OSMO'},{symbol:'ATOM'} ], '' : []
   };


  
  useEffect(() => {
    if (isConnected && chainId) {
        const connectedChain = supportedChains.find(c => c.chainIdHex === chainId);
        if (connectedChain && sourceChain !== connectedChain.id) {
            console.log(`Wallet connected to ${connectedChain.name}, setting source chain.`);
            setSourceChain(connectedChain.id);

            setSourceAsset('');
            setSourceAmount('');
            fetchBalance(connectedChain.id, ''); 
        } else if (!connectedChain) {
             console.warn(`Connected chain ID ${chainId} not in supportedChains list.`);
             setSourceChain('');
        }
    } else if (!isConnected && sourceChain) {
        setSourceChain(''); 
         setSourceAsset('');
         setSourceAmount('');
        setSourceBalance('0.0');
    }
  }, [isConnected, chainId]); 

  // Balance 
  const fetchBalance = async (chainIdentifier, assetIdentifier) => {
      if (!isConnected || !account || !chainIdentifier || !assetIdentifier) {
          setSourceBalance('0.0');
          return;
      }
      console.log(`Fetching balance for ${assetIdentifier} on ${assetIdentifier} for account ${account}...`);
      const chainInfo = supportedChains.find(c => c.id === chainIdentifier);
   // Find the specific asset details within that chain's list
   const assetInfo = (assetsByChain[chainIdentifier] || []).find(a => a.symbol === assetIdentifier);

   // Check if we found the asset and it's on an EVM chain we support here
   if (!assetInfo || chainInfo?.id === 'sol' || chainInfo?.id === 'osmo') {
        console.warn(`Asset ${assetIdentifier} not found or not supported for EVM balance check on chain ${chainIdentifier}`);
        setSourceBalance('0.0');
        return;
   }

   setIsLoadingBalance(true);
   setSourceBalance('Loading...'); // Indicate loading

   try {
     // Create an ethers provider connected to MetaMask
     const provider = new ethers.providers.Web3Provider(window.ethereum);

     let balanceFormatted = '0.0';

     if (assetInfo.isNative) {
       // Fetch balance for the native currency (ETH, MATIC, etc.)
       const balanceWei = await provider.getBalance(account);
       // Format the balance from Wei (smallest unit) to Ether (standard unit)
       balanceFormatted = ethers.utils.formatEther(balanceWei);
       console.log(`Native Balance (${assetInfo.symbol}):`, balanceFormatted);

     } else if (assetInfo.contractAddress) {
       // Fetch balance for an ERC-20 token
       const tokenContract = new ethers.Contract(assetInfo.contractAddress, erc20Abi, provider);

       // Ensure decimals are defined (either from our config or fetch dynamically)
       let decimals = assetInfo.decimals;
       if (decimals === undefined || decimals === null) {
            try {
                 console.log(`Fetching decimals dynamically for ${assetInfo.symbol}`);
                 decimals = await tokenContract.decimals();
            } catch (decError) {
                 console.error(`Could not fetch decimals for ${assetInfo.symbol} (${assetInfo.contractAddress}). Assuming 18.`, decError);
                 decimals = 18; // Fallback if decimals call fails
            }
       }


       const balanceUnits = await tokenContract.balanceOf(account);
       // Format the balance using the token's specific decimals
       balanceFormatted = ethers.utils.formatUnits(balanceUnits, decimals);
       console.log(`Token Balance (${assetInfo.symbol}):`, balanceFormatted);

     } else {
         console.warn(`Asset ${assetIdentifier} is not native and has no contract address defined.`);
         balanceFormatted = 'N/A';
     }

     // Update the state with the formatted balance, trimming unnecessary precision
     // Adjust the toFixed value based on how much precision you want to show
     setSourceBalance(parseFloat(balanceFormatted).toFixed(6));

   } catch (error) {
     console.error(`Error fetching balance for ${assetIdentifier} on ${chainIdentifier}:`, error);
     setSourceBalance('Error'); // Indicate an error occurred
   } finally {
     setIsLoadingBalance(false); // Stop loading indicator
   }
  }

  // --- Event Handlers (Mostly the same, but use `isConnected`) ---
  const handleSourceChainChange = (e) => {
    const newChainId = e.target.value;
    setSourceChain(newChainId);
    setSourceAsset('');
    setSourceAmount('');
    fetchBalance(newChainId, ''); // Fetch balance for new chain
    // Optional: Check if wallet's connected chain matches selected chain
    const selectedChainData = supportedChains.find(c => c.id === newChainId);
    if (isConnected && selectedChainData?.chainIdHex && selectedChainData.chainIdHex !== chainId) {
        console.warn("Selected source chain differs from connected wallet chain.");
        // You might want to prompt the user to switch networks in their wallet here
    }
  };

  const handleSourceAssetChange = (e) => {
    const newAsset = e.target.value;
    console.log(newAsset,"newAsset");
    setSourceAsset(newAsset);
    setSourceAmount('');
    fetchBalance(sourceChain, newAsset); // Fetch balance for selected asset
  };

   const handleSourceAmountChange = (e) => {
       const amount = e.target.value;
       if (/^\d*\.?\d*$/.test(amount)) {
           setSourceAmount(amount);
           // --- !!! Fetch Quote/Estimated Destination Amount !!! ---
           console.log("Fetching quote for destination amount...")
           setDestAmount((parseFloat(amount || 0) * 0.99).toFixed(4)); // Dummy
       }
   }

  const handleDestChainChange = (e) => {
    setDestChain(e.target.value);
    setDestAsset('');
  };

   const handleDestAssetChange = (e) => {
       setDestAsset(e.target.value);
       // --- !!! Re-fetch Quote if needed !!! ---
       console.log("Re-fetching quote for new destination asset...")
       setDestAmount((parseFloat(sourceAmount || 0) * 0.98).toFixed(4)); // Dummy
   }

   const handleMaxClick = () => {
        if(isConnected && sourceBalance) {
           setSourceAmount(sourceBalance);
           // --- !!! Fetch Quote/Estimated Destination Amount !!! ---
           console.log("Fetching quote for MAX amount...")
           setDestAmount((parseFloat(sourceBalance || 0) * 0.99).toFixed(4)); // Dummy
        }
   }

  const handleSwitch = () => {
    // Swap chains, assets... (same logic as before)
    const tempSourceChain = sourceChain;
    const tempSourceAsset = sourceAsset;
    // ... (rest of switch logic)

    setSourceChain(destChain);
    setSourceAsset(destAsset);
    setSourceAmount('');
    setDestAmount('0.0');

    setDestChain(tempSourceChain);
    setDestAsset(tempSourceAsset);

    fetchBalance(destChain, destAsset);
  };

  const handleConfirmSwap = () => {
      if (!isConnected || !account) {
          alert("Please connect your wallet first.");
          return;
      }
      console.log("Initiating swap/bridge transaction...");
      console.log("From:", sourceAmount, sourceAsset, "on", sourceChain);
      console.log("To:", destAsset, "on", destChain);
      console.log("Estimated received:", destAmount);
      console.log("Account:", account);
      console.log("Chain ID:", chainId);
       //TRANSACTION LOGIC HERE
    
      alert("Swap initiated! (Simulation - Check console)");
  }


  return (
    <div className="dark-mode swap-container">
      <div className="swap-body">   
        <div className={`swap-box source-box ${!isConnected ? 'disabled-box' : ''}`}>
          <h2>From</h2>
          <div className="input-group">
            <label htmlFor="source-chain">Chain</label>
            <select
                id="source-chain"
                value={sourceChain}
                onChange={handleSourceChainChange}
                disabled={!isConnected} 
            >
              <option value="" disabled>Select Chain</option>
              {supportedChains.map(chain => (
                <option key={chain.id} value={chain.id}>{chain.name}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="source-asset">Asset</label>
             <div className="asset-input-row">
                 <select
                    id="source-asset"
                    value={sourceAsset}
                    onChange={handleSourceAssetChange}
                    disabled={!isConnected || !sourceChain} // Disable if no connection or chain
                >
                    <option value="" disabled>Select Asset</option>
                    {(assetsByChain[sourceChain] || []).map(asset => (
                        <option key={asset.symbol} value={asset.symbol}>{asset.symbol}</option>
                    ))}
                </select>
                <input
                    type="text"
                    inputMode="decimal"
                    pattern="^[0-9]*[.,]?[0-9]*$"
                    id="source-amount"
                    placeholder="0.0"
                    value={sourceAmount}
                    onChange={handleSourceAmountChange}
                    disabled={!isConnected || !sourceAsset} // Disable if no connection or asset
                />
             </div>
             {isConnected && sourceAsset && (
                 <div className="balance-info">
                    <span>
                        Balance: {isLoadingBalance ? 'Loading...' : sourceBalance} {/* Show loading text */}
                    </span>
                    <button
                        onClick={handleMaxClick}
                        className="max-button"
                        // Disable MAX if loading or balance is zero/invalid
                        disabled={isLoadingBalance || !parseFloat(sourceBalance) || !isConnected}
                    >
                        Max
                    </button>
                 </div>
             )}
             {/* Add placeholder if not connected/asset selected for layout consistency */}
             {(!isConnected || !sourceAsset) && <div className="balance-info placeholder"> </div>}

          </div>
        </div>

        {/* Switch Button */}
        <div className="switch-button-container">
          <button
            onClick={handleSwitch}
            className="switch-button"
            aria-label="Switch source and destination"
            disabled={!isConnected} // Disable switch if not connected
          >
            ⇆
          </button>
        </div>

        {/* Destination Section */}
        <div className={`swap-box dest-box ${!isConnected ? 'disabled-box' : ''}`}>
          <h2>To</h2>
           <div className="input-group">
            <label htmlFor="dest-chain">Chain</label>
            <select
                id="dest-chain"
                value={destChain}
                onChange={handleDestChainChange}
                disabled={!isConnected} // Disable if not connected
            >
              <option value="" disabled>Select Chain</option>
               {supportedChains.map(chain => (
                <option key={chain.id} value={chain.id}>{chain.name}</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="dest-asset">Asset</label>
             <div className="asset-input-row">
                <select
                    id="dest-asset"
                    value={destAsset}
                    onChange={handleDestAssetChange}
                    disabled={!isConnected || !destChain} // Disable if no connection or dest chain
                >
                    <option value="" disabled>Select Asset</option>
                    {(assetsByChain[destChain] || []).map(asset => (
                        <option key={asset.symbol} value={asset.symbol}>{asset.symbol}</option>
                    ))}
                </select>
                <input
                    type="text"
                    inputMode="decimal"
                    id="dest-amount"
                    placeholder="0.0"
                    value={destAmount}
                    readOnly
                    className="destination-amount-display"
                    disabled={!isConnected} // Disable display field too
                />
            </div>
            {/* Placeholder for alignment */}
            <div className="balance-info placeholder"> </div>
          </div>
        </div>
      </div>

       {/* Action Button Area */}
       <div className="action-area">
            {/* Button text/action depends on connection status and form validity */}
            <button
                className="swap-confirm-btn"
                onClick={handleConfirmSwap}
                // Also disable button if balance is loading or resulted in error
                disabled={
                    !isConnected ||
                    isLoadingBalance || // Disable if loading
                    sourceBalance === 'Error' || // Disable on error
                    !sourceAmount ||
                    !parseFloat(sourceAmount) ||
                    !destAsset ||
                    !destChain ||
                    parseFloat(sourceAmount) > parseFloat(sourceBalance) /* Add more checks */
                 }
            >
                {/* Provide informative text */}
                {!isConnected ? "Connect Wallet" :
                 isLoadingBalance ? "Fetching Balance..." : // Show loading status
                 sourceBalance === 'Error' ? "Balance Error" : // Show error status
                 !sourceAmount || parseFloat(sourceAmount) <= 0 ? "Enter Amount" :
                 parseFloat(sourceAmount) > parseFloat(sourceBalance) ? "Insufficient Balance" :
                 !destAsset || !destChain ? "Select Destination" :
                 "Confirm Swap" // Ready state
                 }
            </button>
       </div>

       {/* Footer/Info Area (Add later) */}
       {/* <div className="swap-footer">Estimated Fees, Route, Slippage etc.</div> */}
    </div>
  );
}

export default SwapInterface;
