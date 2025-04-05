import logo from './logo.svg';
import React, { useState, useCallback } from 'react';
import WalletConnector from '../src/components/WallletConnect.js';
import './App.css';
import SwapInterface from './pages/swapInterface';

function App() {
  const [account, setAccount] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [chainId, setChainId] = useState(null);
  const [error, setError] = useState(''); // Wallet connection errors

  // --- Wallet Connection Handlers ---
  const handleConnect = useCallback((connectedAccount, connectedChainId) => {
    console.log("App: Wallet Connected", connectedAccount, connectedChainId);
    setAccount(connectedAccount);
    setChainId(connectedChainId);
    setIsConnected(true);
    setError(''); // Clear errors on successful connection
  }, []); // Empty dependency array - function identity is stable

  const handleDisconnect = useCallback(() => {
    console.log("App: Wallet Disconnected");
    setAccount(null);
    setIsConnected(false);
    setChainId(null);
    // Don't clear error here, disconnection might be due to an error
  }, []);

  const handleAccountChange = useCallback((newAccount) => {
    console.log("App: Account Changed", newAccount);
    setAccount(newAccount);
    // Fetch new balance/data if needed, potentially triggered within SwapInterface via useEffect
  }, []);

  const handleChainChange = useCallback((newChainId) => {
    console.log("App: Chain Changed", newChainId);
    setChainId(newChainId);
    // Application might need to reset state or re-fetch chain-specific data
  }, []);

  const handleError = useCallback((errorMessage) => {
    console.error("App: Wallet Error", errorMessage);
    setError(errorMessage);
    // Potentially disconnect if error is severe
    // handleDisconnect();
  }, []); // Consider adding handleDisconnect if needed inside

  return (
    <div className="App dark-mode"> {/* Apply dark mode to the whole app */}
    <header className="app-header">
      <h1>Interchain Swap Platform</h1> {/* App Title */}
      {/* Place Wallet Connector in the header */}
      <WalletConnector
        connectedAccount={account}
        isConnected={isConnected}
        chainId={chainId} // Pass chainId down if needed by connector UI
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onAccountChange={handleAccountChange}
        onChainChange={handleChainChange}
        onError={handleError}
      />
    </header>

    {/* Display Wallet Connection Error prominently */}
    {error && <div className="wallet-error-banner">{error}</div>}

    <main>
      {/* Pass wallet state down to the Swap Interface */}
      <SwapInterface
        account={account}
        isConnected={isConnected}
        chainId={chainId}
      />
    </main>

    {/* Add other app sections */}
    <footer>
      {/* Footer content */}
    </footer>
  </div>
  );
}

export default App;
