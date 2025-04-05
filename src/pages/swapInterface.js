import React, { useState, useEffect, useCallback, useRef } from 'react';
import './swapInterface.css'; 
import { ethers } from "ethers";
import ethLogo from '../public/eth.png';
import maticLogo from '../public/matic.png';
import bridgeLogo from '../public/bridge.png';
import uniswapLogo from '../public/uniswap.png';

const DEBOUNCE_TIME = 600; 
const REFRESH_INTERVAL_TIME = 120000;
const polyLogo = '/path/to/your/logos/polygon.png';
const solLogo = '/path/to/your/logos/solana.png';
const osmoLogo = '/path/to/your/logos/osmosis.png';
const usdcLogo = '/path/to/your/logos/usdc.png';
const daiLogo = '/path/to/your/logos/dai.png';
const atomLogo = '/path/to/your/logos/atom.png';
const solAssetLogo = '/path/to/your/logos/sol.png';
const wethLogo = '/path/to/your/logos/weth.png';
const testLogo = '/path/to/your/logos/test.png';
const quickswapLogo = '/path/to/your/logos/quickswap.png';
const raydiumLogo = '/path/to/your/logos/raydium.png';

// Minimal ERC20 ABI needed
const erc20Abi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint amount) returns (bool)",
];


function SwapInterface({ account, isConnected, chainId }) {
  const [sourceChain, setSourceChain] = useState('');
  const [sourceAsset, setSourceAsset] = useState('');
  const [sourceAmount, setSourceAmount] = useState('');
  const [sourceBalance, setSourceBalance] = useState('0.0');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [destChain, setDestChain] = useState('');
  const [destAsset, setDestAsset] = useState('');
  const [quote, setQuote] = useState(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [allowance, setAllowance] = useState(null);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [isCheckingAllowance, setIsCheckingAllowance] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const debounceTimeoutRef = useRef(null);
  const refreshIntervalRef = useRef(null); 
  const lastQuoteParamsRef = useRef(null);

   const supportedChains = [
     { id: 'eth', name: 'Ethereum', chainIdHex: '0x1', logo: ethLogo },
     { id: 'poly', name: 'Polygon', chainIdHex: '0x89', logo: polyLogo },
     { id: 'sepolia', name: 'Sepolia Testnet', chainIdHex: '0xaa36a7', logo: ethLogo },
     { id: 'amoy', name: 'Polygon Amoy', chainIdHex: '0x13882', logo: polyLogo },
     { id: 'sol', name: 'Solana', chainIdHex: null, logo: solLogo },
     { id: 'osmo', name: 'Osmosis', chainIdHex: null, logo: osmoLogo },
  ];
   const assetsByChain = {
    eth: [
        { symbol: 'ETH', name: 'Ether', logo: ethLogo, isNative: true, decimals: 18 },
        { symbol: 'USDC', name: 'USD Coin', logo: usdcLogo, isNative: false, contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
        { symbol: 'DAI', name: 'Dai Stablecoin', logo: daiLogo, isNative: false, contractAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
    ],
    poly: [
        { symbol: 'MATIC', name: 'Matic', logo: maticLogo, isNative: true, decimals: 18 },
        { symbol: 'USDC', name: 'USD Coin (PoS)', logo: usdcLogo, isNative: false, contractAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6 },
        { symbol: 'WETH', name: 'Wrapped Ether', logo: wethLogo, isNative: false, contractAddress: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18 },
    ],
    sepolia: [
        { symbol: 'ETH', name: 'Sepolia Ether', logo: ethLogo, isNative: true, decimals: 18 },
        { symbol: 'mUSDC', name: 'Mock USDC', logo: usdcLogo, isNative: false, contractAddress: '0x...', decimals: 6 }, // Replace
        { symbol: 'TST', name: 'Test Token', logo: testLogo, isNative: false, contractAddress: '0x...', decimals: 18 }, // Replace
    ],
    amoy: [
        { symbol: 'MATIC', name: 'Amoy Matic', logo: maticLogo, isNative: true, decimals: 18 },
        { symbol: 'tUSDC', name: 'Test USDC', logo: usdcLogo, isNative: false, contractAddress: '0x...', decimals: 6 }, // Replace
        { symbol: 'tTST', name: 'Test Token', logo: testLogo, isNative: false, contractAddress: '0x...', decimals: 18 }, // Replace
    ],
    sol: [
        {symbol:'SOL', name: 'Solana', logo: solAssetLogo, isNative: true, decimals: 9 },
        {symbol:'USDC', name: 'USD Coin (SPL)', logo: usdcLogo, isNative: false, mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 }
    ],
    osmo: [
        {symbol:'OSMO', name: 'Osmosis', logo: osmoLogo, isNative: true, decimals: 6 },
        {symbol:'ATOM', name: 'Cosmos Hub', logo: atomLogo, isNative: false, ibcDenom: 'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2', decimals: 6 }
    ],
    '': []
   };
   const logoMap = {
      'eth': ethLogo, 'matic': maticLogo, 'sol': solAssetLogo, 'osmo': osmoLogo, 'atom': atomLogo,
      'usdc': usdcLogo, 'dai': daiLogo, 'weth': wethLogo, 'tst': testLogo, 'musdc': usdcLogo, 'tusdc': usdcLogo, 'ttst': testLogo,
      'uniswap': uniswapLogo, 'quickswap': quickswapLogo, 'raydium': raydiumLogo,
      'bridge': bridgeLogo,
      'default': bridgeLogo
  };

  useEffect(() => {
    if (isConnected && chainId) {
        const connectedChain = supportedChains.find(c => c.chainIdHex === chainId);
        if (connectedChain && sourceChain !== connectedChain.id) {
            console.log(`Wallet connected to ${connectedChain.name}, setting source chain.`);
            setSourceChain(connectedChain.id);
            setSourceAsset('');
            setSourceAmount('');
            setQuote(null);
            setQuoteError('');
            setNeedsApproval(false);
        } else if (!connectedChain && chainId) {
             console.warn(`Connected chain ID ${chainId} not in supportedChains list.`);
             setSourceChain('');
        }
    } else if (!isConnected) {
        setSourceChain('');
        setSourceAsset('');
        setSourceAmount('');
        setSourceBalance('0.0');
        setDestChain('');
        setDestAsset('');
        setQuote(null);
        setQuoteError('');
        setNeedsApproval(false);
        clearTimeout(debounceTimeoutRef.current);
        clearInterval(refreshIntervalRef.current);
        lastQuoteParamsRef.current = null;
    }
  }, [isConnected, chainId, sourceChain]);

  const fetchBalance = useCallback(async (chainIdentifier, assetIdentifier) => {
       if (!isConnected || !account || !chainIdentifier || !assetIdentifier || !window.ethereum) {
          setSourceBalance('0.0');
          return;
      }
      const chainInfo = supportedChains.find(c => c.id === chainIdentifier);
      const assetInfo = (assetsByChain[chainIdentifier] || []).find(a => a.symbol === assetIdentifier);
      if (!assetInfo || !chainInfo || chainInfo.id === 'sol' || chainInfo.id === 'osmo') {
          if(assetInfo) console.warn(`Balance check for non-EVM chain ${chainIdentifier} skipped in EVM fetchBalance.`);
          setSourceBalance('0.0');
          return;
      }
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      if (chainInfo.chainIdHex && network.chainId.toString() !== parseInt(chainInfo.chainIdHex, 16).toString()) {
          console.warn(`Wallet connected to chain ${network.chainId}, but selected source is ${chainIdentifier} (${parseInt(chainInfo.chainIdHex, 16)}). Balance might be incorrect.`);
      }
      console.log(`Fetching balance for ${assetIdentifier} on ${chainIdentifier} for account ${account}...`);
      setIsLoadingBalance(true);
      setSourceBalance('Loading...');
      try {
          let balanceFormatted = '0.0';
          if (assetInfo.isNative) {
              const balanceWei = await provider.getBalance(account);
              balanceFormatted = ethers.utils.formatEther(balanceWei);
          } else if (assetInfo.contractAddress && ethers.utils.isAddress(assetInfo.contractAddress)) {
              const tokenContract = new ethers.Contract(assetInfo.contractAddress, erc20Abi, provider);
              let decimals = assetInfo.decimals;
              if (decimals === undefined || decimals === null) {
                  try { decimals = await tokenContract.decimals(); }
                  catch (decError) { decimals = 18; console.error("Decimals fetch failed", decError); }
              }
              const balanceUnits = await tokenContract.balanceOf(account);
              balanceFormatted = ethers.utils.formatUnits(balanceUnits, decimals);
          } else { balanceFormatted = 'N/A'; }
          setSourceBalance(parseFloat(balanceFormatted).toFixed(6));
      } catch (error) {
          console.error(`Error fetching balance for ${assetIdentifier} on ${chainIdentifier}:`, error);
          setSourceBalance('Error');
      } finally { setIsLoadingBalance(false); }
  }, [isConnected, account, assetsByChain]);

  const checkAllowance = useCallback(async () => {
       if (!isConnected || !account || !sourceChain || !sourceAsset || !sourceAmount || parseFloat(sourceAmount) <= 0 || !window.ethereum || !quote?.approvalData?.spenderAddress) {
          setAllowance(null); setNeedsApproval(false); return;
      }
      const sourceAssetInfo = (assetsByChain[sourceChain] || []).find(a => a.symbol === sourceAsset);
      if (!sourceAssetInfo || sourceAssetInfo.isNative || !sourceAssetInfo.contractAddress || !ethers.utils.isAddress(sourceAssetInfo.contractAddress)) {
          setAllowance(null); setNeedsApproval(false); return;
      }
      const spenderAddress = quote.approvalData.spenderAddress;
      if (!spenderAddress || !ethers.utils.isAddress(spenderAddress)) {
          console.error("Invalid spender address"); setQuoteError("Internal error: Invalid approval target."); setAllowance(null); setNeedsApproval(false); return;
      }
      setIsCheckingAllowance(true); setQuoteError('');
      try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const tokenContract = new ethers.Contract(sourceAssetInfo.contractAddress, erc20Abi, provider);
          const currentAllowance = await tokenContract.allowance(account, spenderAddress);
          setAllowance(currentAllowance);
          const requiredAmount = ethers.utils.parseUnits(sourceAmount, sourceAssetInfo.decimals);
          const hasEnoughAllowance = currentAllowance.gte(requiredAmount);
          setNeedsApproval(!hasEnoughAllowance);
          console.log(`Allowance: Required=${requiredAmount.toString()}, Has=${currentAllowance.toString()}, Needs Approval=${!hasEnoughAllowance}`);
      } catch (error) {
          console.error("Error checking allowance:", error); setQuoteError("Could not check token allowance."); setAllowance(null); setNeedsApproval(false);
      } finally { setIsCheckingAllowance(false); }
  }, [isConnected, account, sourceChain, sourceAsset, sourceAmount, assetsByChain, quote]);


   const fetchQuoteAndDetails = useCallback(async (isRefresh = false) => {

     if (!isRefresh) {
         setQuote(null);
         setQuoteError('');
         setNeedsApproval(false);
     }

     const currentParams = { sourceAmount, sourceAsset, sourceChain, destAsset, destChain, slippage };

     if (!isConnected || !currentParams.sourceChain || !currentParams.sourceAsset || !currentParams.destChain || !currentParams.destAsset || !currentParams.sourceAmount || parseFloat(currentParams.sourceAmount) <= 0) {
         if (!isRefresh) setIsFetchingQuote(false);
         clearInterval(refreshIntervalRef.current); 
         lastQuoteParamsRef.current = null; 
         return;
     }

     if (!isRefresh) {
         setIsFetchingQuote(true);
     }
     console.log(`Fetching quote (${isRefresh ? 'refresh' : 'manual'})... Params:`, currentParams);


     clearInterval(refreshIntervalRef.current);

     try {
         await new Promise(resolve => setTimeout(resolve, isRefresh ? 800 : 1200));

         const sourceAssetInfo = (assetsByChain[currentParams.sourceChain] || []).find(a => a.symbol === currentParams.sourceAsset);
         const destAssetInfo = (assetsByChain[currentParams.destChain] || []).find(a => a.symbol === currentParams.destAsset);
         if (!sourceAssetInfo || !destAssetInfo) throw new Error("Asset info not found");

         const sourceAmountUnits = ethers.utils.parseUnits(currentParams.sourceAmount, sourceAssetInfo.decimals); // v5
         const simulatedRate = (destAssetInfo.symbol === 'USDC' ? 2850 : 0.95) * (Math.random() * 0.1 + 0.95);
         const rateFactorString = (simulatedRate * (10**destAssetInfo.decimals)).toFixed(0);
         const rateFactorBN = ethers.BigNumber.from(rateFactorString); // v5
         const tenPowSourceBN = ethers.utils.parseUnits("1", sourceAssetInfo.decimals); // v5
         const simulatedOutputUnits = sourceAmountUnits.mul(rateFactorBN).div(tenPowSourceBN);
         const slippagePrecision = 18;
         const slippageRate = 1.0 - parseFloat(currentParams.slippage) / 100;
         const slippageFactor = ethers.utils.parseUnits(slippageRate.toFixed(slippagePrecision), slippagePrecision); // v5
         const tenPowSlippagePrecision = ethers.utils.parseUnits("1", slippagePrecision); // v5
         const simulatedMinOutputUnits = simulatedOutputUnits.mul(slippageFactor).div(tenPowSlippagePrecision);

         const estimatedOutputFormatted = ethers.utils.formatUnits(simulatedOutputUnits, destAssetInfo.decimals); // v5
         const minOutputFormatted = ethers.utils.formatUnits(simulatedMinOutputUnits, destAssetInfo.decimals); // v5
         const effectiveRate = (parseFloat(estimatedOutputFormatted) / parseFloat(currentParams.sourceAmount)).toFixed(4);
         const HARDCODED_SPENDER_ADDRESS_DEMO = "0xeD48B8b9b7DA2a964D1F5A4A87374C2dDaA98e70";

         const simulatedQuote = {
             rate: effectiveRate,
             estimatedOutput: parseFloat(estimatedOutputFormatted).toFixed(6),
             minOutput: parseFloat(minOutputFormatted).toFixed(6),
             route: [
                { type: 'dex', chain: currentParams.sourceChain, name: currentParams.sourceChain === 'poly' || currentParams.sourceChain === 'amoy' ? 'QuickSwap' : 'Uniswap V3', logoKey: currentParams.sourceChain === 'poly' || currentParams.sourceChain === 'amoy' ? 'quickswap' : 'uniswap' }, // Added amoy check
                { type: 'bridge', chain: `${currentParams.sourceChain}->${currentParams.destChain}`, name: 'HypotheticalBridge', logoKey: 'bridge' },
                ...(currentParams.destChain === 'sol' && currentParams.destAsset !== 'SOL' ? [{ type: 'dex', chain: currentParams.destChain, name: 'Raydium', logoKey: 'raydium' }] : []),
            ],
            fees: {
                sourceGas: { tokenSymbol: sourceAssetInfo.isNative ? sourceAssetInfo.symbol : (currentParams.sourceChain === 'poly' || currentParams.sourceChain === 'amoy' ? 'MATIC' : 'ETH'), amount: (currentParams.sourceChain === 'poly' || currentParams.sourceChain === 'amoy' ? 0.02 : 0.005) * (Math.random() * 0.4 + 0.8), usdValue: (currentParams.sourceChain === 'poly' || currentParams.sourceChain === 'amoy' ? 0.02 : 15.00) * (Math.random() * 0.4 + 0.8)}, // Added amoy check
                bridgeFee: { tokenSymbol: destAssetInfo.symbol, amount: parseFloat(estimatedOutputFormatted) * 0.001, usdValue: parseFloat(estimatedOutputFormatted) * 0.001 * (destAssetInfo.symbol === 'USDC' ? 1 : 2800) },
                destGas: { tokenSymbol: destAssetInfo.isNative ? destAssetInfo.symbol : '?', amount: 0.001, usdValue: 0.1 },
                platformFee: { tokenSymbol: sourceAssetInfo.symbol, amount: 0, usdValue: 0 },
            },
             priceImpact: (parseFloat(currentParams.sourceAmount) / 100).toFixed(2),
             timeEstimate: `${5 + Math.floor(Math.random() * 15)}-${15 + Math.floor(Math.random() * 10)} minutes`,
             approvalData: {
                allowanceRequired: !sourceAssetInfo.isNative,
                spenderAddress: sourceAssetInfo.isNative ? null : HARDCODED_SPENDER_ADDRESS_DEMO
             },
              // transaction: 
         };

         setQuote(simulatedQuote);
         setQuoteError('');
         lastQuoteParamsRef.current = currentParams;

     } catch (error) {
         console.error(`Error fetching quote (${isRefresh ? 'refresh' : 'manual'}):`, error);
         if (!isRefresh) {
             if (error.code === 'NUMERIC_FAULT' && error.fault === 'overflow') {
                  setQuoteError(`Calculation error: Amount may be too large or precision issue.`);
             } else {
                  setQuoteError(`Failed to get quote: ${error.message}`);
             }
             setQuote(null);
         } else {
             console.warn("Background quote refresh failed.");
         }
         lastQuoteParamsRef.current = null;

     } finally {
         if (!isRefresh) {
             setIsFetchingQuote(false);
         }

         if (lastQuoteParamsRef.current) {
             console.log(`Scheduling refresh quote interval (${REFRESH_INTERVAL_TIME / 1000}s)`);
             refreshIntervalRef.current = setInterval(() => {
                  const currentInputs = {
                      sourceAmount: document.getElementById('source-amount')?.value || sourceAmount, // Read directly or use state
                      sourceAsset, sourceChain, destAsset, destChain, slippage
                  };
                 const lastInputs = lastQuoteParamsRef.current;

                 if (lastInputs &&
                     currentInputs.sourceAmount === lastInputs.sourceAmount &&
                     currentInputs.sourceAsset === lastInputs.sourceAsset &&
                     currentInputs.sourceChain === lastInputs.sourceChain &&
                     currentInputs.destAsset === lastInputs.destAsset &&
                     currentInputs.destChain === lastInputs.destChain &&
                     currentInputs.slippage === lastInputs.slippage)
                 {
                     console.log("Refresh interval triggered: Inputs match, fetching refresh quote.");
                     fetchQuoteAndDetails(true); 
                 } else {
                     console.log("Refresh interval triggered: Inputs changed since last success, stopping refresh.", {currentInputs, lastInputs});
                     clearInterval(refreshIntervalRef.current);
                     lastQuoteParamsRef.current = null;
                 }
             }, REFRESH_INTERVAL_TIME);
         }
     }
   }, [isConnected, sourceChain, sourceAsset, destChain, destAsset, sourceAmount, slippage]);

   useEffect(() => {
     if (debounceTimeoutRef.current) {
       clearTimeout(debounceTimeoutRef.current);
     }
     if (refreshIntervalRef.current) {
       clearInterval(refreshIntervalRef.current);
       console.log("Inputs changed, clearing refresh interval.");
       lastQuoteParamsRef.current = null;
     }

     debounceTimeoutRef.current = setTimeout(() => {
       if (sourceAmount && parseFloat(sourceAmount) > 0 && destAsset && destChain && sourceAsset && sourceChain) {
         fetchQuoteAndDetails(false); 
       } else {
         setQuote(null);
         setQuoteError('');
         setNeedsApproval(false);
         setIsFetchingQuote(false); 
         lastQuoteParamsRef.current = null; 
       }
     }, DEBOUNCE_TIME);

     return () => {
       clearTimeout(debounceTimeoutRef.current);
       clearInterval(refreshIntervalRef.current); 
     };
   }, [sourceAmount, destAsset, destChain, sourceAsset, sourceChain, slippage, fetchQuoteAndDetails]); // Effect dependencies

    useEffect(() => {
       if (quote && quote.approvalData?.allowanceRequired && quote.approvalData?.spenderAddress) {
           checkAllowance();
       } else {
           setAllowance(null);
           setNeedsApproval(false);
       }
    }, [quote, checkAllowance]);


    const handleApprove = useCallback(async () => {
      if (!isConnected || !account || !sourceAsset || !window.ethereum || !quote?.approvalData?.spenderAddress) {
          alert("Cannot approve: Missing information or wallet connection."); return;
      }
      const sourceAssetInfo = (assetsByChain[sourceChain] || []).find(a => a.symbol === sourceAsset);
      if (!sourceAssetInfo || sourceAssetInfo.isNative || !sourceAssetInfo.contractAddress || !ethers.utils.isAddress(sourceAssetInfo.contractAddress)) {
          alert("Cannot approve: Invalid asset type or configuration."); return;
      }
      const spenderAddress = quote.approvalData.spenderAddress;
      if (!spenderAddress || !ethers.utils.isAddress(spenderAddress)) {
          alert("Cannot approve: Invalid target address provided by routing."); return;
      }
      setIsApproving(true); setQuoteError('');
      try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
          const tokenContract = new ethers.Contract(sourceAssetInfo.contractAddress, erc20Abi, signer);
          const amountToApprove = ethers.constants.MaxUint256;
          console.log(`Approving spender ${spenderAddress} for MAX units of ${sourceAssetInfo.symbol}`);
          const tx = await tokenContract.approve(spenderAddress, amountToApprove);
          console.log("Approval transaction sent:", tx.hash); alert(`Approval submitted. Tx Hash: ${tx.hash}\nPlease wait...`);
          await tx.wait(1);
          console.log("Approval transaction confirmed!"); alert("Approval successful!");
          await checkAllowance();
      } catch (error) {
          console.error("Error during approval:", error);
          if (error.code === 4001 || error.code === 'ACTION_REJECTED' ) { alert("Approval transaction rejected by user."); setQuoteError("Approval rejected."); }
          else { alert(`Approval failed: ${error.message || error}`); setQuoteError(`Approval failed: ${error.message || 'Unknown error'}`); }
      } finally { setIsApproving(false); }
    }, [isConnected, account, sourceChain, sourceAsset, assetsByChain, quote, checkAllowance]); // Added dependencies


    const handleSourceChainChange = (e) => {
      const newChainId = e.target.value;
      setSourceChain(newChainId); setSourceAsset(''); setSourceAmount(''); setSourceBalance('0.0');
      setQuote(null); setQuoteError(''); setNeedsApproval(false);
    };
    const handleSourceAssetChange = (e) => {
      const newAsset = e.target.value;
      setSourceAsset(newAsset); setSourceAmount(''); setQuote(null); setQuoteError(''); setNeedsApproval(false); // Clear quote state
      fetchBalance(sourceChain, newAsset);
    };
    const handleSourceAmountChange = (e) => {
        const amount = e.target.value;
        if (amount === '' || /^\d*\.?\d*$/.test(amount)) { setSourceAmount(amount); }
    };
    const handleDestChainChange = (e) => {
      setDestChain(e.target.value); setDestAsset('');
      setQuote(null); setQuoteError(''); setNeedsApproval(false);
    };
    const handleDestAssetChange = (e) => {
        setDestAsset(e.target.value);
    };
    const handleMaxClick = () => {
        const numericBalance = parseFloat(sourceBalance);
        if(isConnected && !isNaN(numericBalance) && numericBalance > 0) { setSourceAmount(sourceBalance); }
    };
    const handleSwitch = () => {
        const tempSourceChain = sourceChain; const tempSourceAsset = sourceAsset; const tempDestChain = destChain; const tempDestAsset = destAsset;
        if (!tempSourceChain || !tempSourceAsset || !tempDestChain || !tempDestAsset) return;
        setSourceChain(tempDestChain); setSourceAsset(tempDestAsset); setDestChain(tempSourceChain); setDestAsset(tempSourceAsset);
        setSourceAmount(''); setQuote(null); setQuoteError(''); setNeedsApproval(false);
        fetchBalance(tempDestChain, tempDestAsset);
    };
     const handleSlippageChange = (e) => { setSlippage(e.target.value); };


    const handleConfirmSwap = async () => {
         if (!isConnected || !account || !quote || needsApproval || isFetchingQuote || !!quoteError) {
            alert("Cannot swap: Please resolve issues (Connect, Get Quote, Approve, Check Errors)."); return;
        }
        console.log("--- Initiating Swap/Bridge ---"); console.log("Account:", account); console.log("Source:", sourceAmount, sourceAsset, "on", sourceChain); console.log("Destination:", destAsset, "on", destChain); console.log("Quote Details:", quote);
        alert("Initiating swap simulation... Check console. Real transaction logic needed!");
    };


  return (
    <div className="dark-mode swap-container">
      <div className="swap-body">
        <div className={`swap-box source-box ${!isConnected ? 'disabled-box' : ''}`}>
          <h2>From</h2>
          <div className="input-group">
            <label htmlFor="source-chain">Chain</label>
            <select id="source-chain" value={sourceChain} onChange={handleSourceChainChange} disabled={!isConnected}>
              <option value="" disabled>Select Chain</option>
              {supportedChains.map(chain => (<option key={chain.id} value={chain.id}>{chain.name}</option>))}
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="source-asset">Asset</label>
            <div className="asset-input-row">
              <select id="source-asset" value={sourceAsset} onChange={handleSourceAssetChange} disabled={!isConnected || !sourceChain}>
                <option value="" disabled>Select Asset</option>
                {(assetsByChain[sourceChain] || []).map(asset => (<option key={asset.symbol} value={asset.symbol}>{asset.symbol}</option>))}
              </select>
              <input type="text" inputMode="decimal" pattern="^[0-9]*[.,]?[0-9]*$" id="source-amount" placeholder="0.0" value={sourceAmount} onChange={handleSourceAmountChange} disabled={!isConnected || !sourceAsset} />
            </div>
            {isConnected && sourceAsset && (
              <div className="balance-info">
                <span>Balance: {isLoadingBalance ? 'Loading...' : sourceBalance}</span>
                <button onClick={handleMaxClick} className="max-button" disabled={isLoadingBalance || isNaN(parseFloat(sourceBalance)) || parseFloat(sourceBalance) <= 0 || !isConnected}>Max</button>
              </div>
            )}
            {(!isConnected || !sourceAsset) && <div className="balance-info placeholder"> </div>}
          </div>
        </div>

        <div className="switch-button-container">
          <button onClick={handleSwitch} className="switch-button" aria-label="Switch source and destination" disabled={!isConnected || !sourceChain || !sourceAsset || !destChain || !destAsset}>⇆</button>
        </div>

        <div className={`swap-box dest-box ${!isConnected ? 'disabled-box' : ''}`}>
          <h2>To</h2>
          <div className="input-group">
            <label htmlFor="dest-chain">Chain</label>
            <select id="dest-chain" value={destChain} onChange={handleDestChainChange} disabled={!isConnected}>
              <option value="" disabled>Select Chain</option>
              {supportedChains.map(chain => (<option key={chain.id} value={chain.id}>{chain.name}</option>))}
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="dest-asset">Asset</label>
            <div className="asset-input-row">
              <select id="dest-asset" value={destAsset} onChange={handleDestAssetChange} disabled={!isConnected || !destChain}>
                <option value="" disabled>Select Asset</option>
                {(assetsByChain[destChain] || []).map(asset => (<option key={asset.symbol} value={asset.symbol}>{asset.symbol}</option>))}
              </select>
              <input type="text" inputMode="decimal" id="dest-amount" placeholder="0.0" value={isFetchingQuote && !quote ? 'Fetching...' : (quote?.estimatedOutput || '')} readOnly className="destination-amount-display" disabled={!isConnected} />
            </div>
            <div className="balance-info placeholder"> </div>
          </div>
        </div>
      </div>

      { (isConnected && (isFetchingQuote || quote || quoteError)) && (
         <div className="swap-details">
            {isFetchingQuote && !quote && <div className="loading-indicator">Fetching best quote... <span className="spinner"></span></div>}
            {quoteError && <div className="error-message quote-error">{quoteError}</div>}
            {quote && !quoteError && (
            <>
               <div className="detail-row rate-display">
                    <span>Rate:</span>
                    <span>{`1 ${sourceAsset} ≈ ${quote.rate} ${destAsset}`}</span>
               </div>
               <div className="detail-row route-visualization">
                 <span>Route:</span>
                 <div className="route-path">
                    <img width={'30px'} height={'30px'} src={logoMap[sourceAsset?.toLowerCase()] || logoMap['default']} alt={sourceAsset} className="route-icon" title={sourceAsset}/>
                    {quote.route.map((step, index) => (
                        <React.Fragment key={index}>
                         <span className="route-arrow">→</span>
                         <img width={'30px'} height={'30px'} src={logoMap[step.logoKey] || logoMap['default']} title={`${step.name} (${step.chain})`} alt={step.name} className="route-icon" />
                        </React.Fragment>
                    ))}
                    <span className="route-arrow">→</span>
                     <img width={'30px'} height={'30px'} src={logoMap[destAsset?.toLowerCase()] || logoMap['default']} alt={destAsset} className="route-icon" title={destAsset}/>
                 </div>
               </div>
               <div className="detail-row fees-breakdown">
                  <span>Fees:</span>
                  <div className="fee-details">
                     <div>Source Gas: ~{quote.fees.sourceGas.amount.toFixed(5)} {quote.fees.sourceGas.tokenSymbol} (${quote.fees.sourceGas.usdValue.toFixed(2)})</div>
                     <div>Bridge Fee: ~{quote.fees.bridgeFee.amount.toFixed(5)} {quote.fees.bridgeFee.tokenSymbol} (${quote.fees.bridgeFee.usdValue.toFixed(2)})</div>
                     <div>Dest Gas: ~{quote.fees.destGas.amount.toFixed(5)} {quote.fees.destGas.tokenSymbol} (${quote.fees.destGas.usdValue.toFixed(2)})</div>
                  </div>
               </div>
               <div className="detail-row price-info">
                    <span>Price Impact:</span>
                    <span className={parseFloat(quote.priceImpact) > 1 ? 'warning-text' : ''}>{quote.priceImpact}% {parseFloat(quote.priceImpact) > 1 ? '(High)' : ''}</span>
               </div>
               <div className="detail-row price-info">
                    <span>Min. Received:</span>
                    <span>{quote.minOutput} {destAsset}</span>
               </div>
                <div className="detail-row slippage-setting">
                    <label htmlFor="slippage">Slippage:</label>
                    <select id="slippage" value={slippage} onChange={handleSlippageChange} disabled={isFetchingQuote}>
                        <option value="0.1">0.1%</option>
                        <option value="0.5">0.5%</option>
                        <option value="1.0">1.0%</option>
                    </select>
               </div>
               <div className="detail-row time-estimate">
                    <span>Est. Time:</span>
                    <span>{quote.timeEstimate}</span>
               </div>
            </>
            )}
         </div>
      )}

       <div className="action-area">
            {isConnected ? (
                <>
                    {needsApproval && quote?.approvalData?.allowanceRequired && !(assetsByChain[sourceChain] || []).find(a => a.symbol === sourceAsset)?.isNative && (
                        <button className="swap-confirm-btn approve-btn" onClick={handleApprove} disabled={isApproving || isCheckingAllowance || isFetchingQuote || !!quoteError}>
                            {isApproving ? 'Approving...' : isCheckingAllowance ? 'Checking...' : `Approve ${sourceAsset}`}
                            {(isApproving || isCheckingAllowance) && <span className="button-spinner"></span> }
                        </button>
                    )}
                    <button className="swap-confirm-btn" onClick={handleConfirmSwap} disabled={ !quote || needsApproval || isFetchingQuote || isCheckingAllowance || isApproving || !!quoteError || isLoadingBalance || sourceBalance === 'Error' || !sourceAmount || parseFloat(sourceAmount) <= 0 || parseFloat(sourceAmount) > parseFloat(sourceBalance) }>
                       { isFetchingQuote ? 'Getting Quote...' : quoteError ? 'Error Getting Quote' : isCheckingAllowance ? 'Checking Allowance...' : isLoadingBalance ? 'Checking Balance...' : sourceBalance === 'Error' ? 'Balance Error' : !sourceAmount || parseFloat(sourceAmount) <= 0 ? 'Enter Amount' : parseFloat(sourceAmount) > parseFloat(sourceBalance) ? 'Insufficient Balance' : needsApproval ? `Approve ${sourceAsset} First` : isApproving ? `Approving ${sourceAsset}...` : 'Confirm Swap' }
                    </button>
                </>
            ) : ( <button className="swap-confirm-btn" disabled> Connect Wallet to Swap </button> )}
       </div>
    </div>
  );
}

export default SwapInterface;
