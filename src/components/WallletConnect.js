import React, { useEffect, useState } from 'react';
import './WalletConnect.css'; // Use the same CSS as before

// Helper function remains the same
const isMetaMaskInstalled = () => {
  const { ethereum } = window;
  return Boolean(ethereum && ethereum.isMetaMask);
};

// Props expected:
// - connectedAccount: string | null
// - isConnected: boolean
// - chainId: string | null
// - onConnect: (account: string, chainId: string) => void
// - onDisconnect: () => void
// - onAccountChange: (account: string) => void
// - onChainChange: (chainId: string) => void
// - onError: (errorMessage: string) => void

function WalletConnector({
  connectedAccount,
  isConnected,
//   chainId, // We might not need to display chainId directly here, but need it for onConnect
  onConnect,
  onDisconnect,
  onAccountChange,
  onChainChange,
  onError,
}) {
  const [metaMaskInstalled, setMetaMaskInstalled] = useState(false);

  // --- Check for MetaMask on initial load and listen for changes ---
  useEffect(() => {
    if (isMetaMaskInstalled()) {
      setMetaMaskInstalled(true);
      const ethereum = window.ethereum;

      // --- Helper to get chain ID ---
      const getChainId = async () => {
        try {
          const currentChainId = await ethereum.request({ method: 'eth_chainId' });
          return currentChainId;
        } catch (err) {
          console.error("Error getting chain ID:", err);
          onError("Could not get network chain ID.");
          return null;
        }
      };

      // --- Check initial connection ---
      const checkConnection = async () => {
        try {
          const accounts = await ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            const currentChainId = await getChainId();
            if (currentChainId) {
              console.log('Wallet already connected:', accounts[0], 'on chain:', currentChainId);
              // Only call onConnect if not already connected in parent state
              // to avoid potential loops if parent re-renders this component
              if (!isConnected || accounts[0] !== connectedAccount) {
                   onConnect(accounts[0], currentChainId);
              }
            }
          } else {
            console.log('Wallet not connected initially.');
             if (isConnected) { // Only call disconnect if parent thinks it's connected
                onDisconnect();
             }
          }
        } catch (err) {
          console.error("Error checking initial connection:", err);
          onError("Could not check wallet connection.");
        }
      };
      checkConnection();

      // --- Event Listeners ---
      const handleAccountsChanged = async (accounts) => {
        if (accounts.length === 0) {
          console.log('Wallet disconnected or locked.');
          onDisconnect();
        } else if (accounts[0] !== connectedAccount) {
          console.log('Account changed:', accounts[0]);
          onAccountChange(accounts[0]); // Parent might need to re-fetch chainId or it might come with chainChanged event
        }
      };

      const handleChainChanged = (newChainId) => {
        console.log('Network changed:', newChainId);
        onChainChange(newChainId);
      };

      // Add listeners
      ethereum.on('accountsChanged', handleAccountsChanged);
      ethereum.on('chainChanged', handleChainChanged);

      // Clean up listeners
      return () => {
        if (ethereum.removeListener) {
          ethereum.removeListener('accountsChanged', handleAccountsChanged);
          ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };

    } else {
      setMetaMaskInstalled(false);
    }
    // Dependencies: Include props that, if changed externally, should trigger re-check or re-listen
  }, [connectedAccount, isConnected, onConnect, onDisconnect, onAccountChange, onChainChange, onError]);


  // --- Connect Wallet Action ---
  const connectWalletAction = async () => {
    onError(''); // Clear previous errors reported by this component

    if (!isMetaMaskInstalled()) {
      onError('MetaMask is not installed. Please install it to continue.');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });

      if (accounts.length > 0 && currentChainId) {
        console.log('Wallet connected via button:', accounts[0], 'on chain:', currentChainId);
        onConnect(accounts[0], currentChainId);
      } else {
         throw new Error("Failed to get accounts or chain ID after request.");
      }
    } catch (err) {
      console.error("Error connecting wallet:", err);
      if (err.code === 4001) {
        onError('Connection request rejected by user.');
      } else {
         onError(`Failed to connect wallet: ${err.message || 'Unknown error'}`);
      }
       onDisconnect(); // Ensure state is cleared on failure
    }
  };

  // --- Render Logic ---
  const renderButton = () => {
     if (!metaMaskInstalled) {
      return (
        <button
          onClick={() => window.open('https://metamask.io/download/', '_blank')}
          className="wallet-button install-button"
        >
          Install MetaMask
        </button>
      );
    }

    if (isConnected && connectedAccount) {
       // Show connected state - maybe a disconnect button if desired,
       // but standard is relying on MetaMask internal disconnect
       return (
           <div className="wallet-info">
             <span>Connected:</span>
             <span className="wallet-address">
               {`${connectedAccount.substring(0, 6)}...${connectedAccount.substring(connectedAccount.length - 4)}`}
             </span>
            {/* Optional Disconnect - Triggers MetaMask prompt or just local state change
             <button onClick={onDisconnect} className="wallet-button disconnect-button">
                 Disconnect (Local)
             </button>
             */}
           </div>
       );
    }

    // Show connect button if MetaMask is installed but not connected
    return (
      <button onClick={connectWalletAction} className="wallet-button connect-button">
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="wallet-connector">
      {renderButton()}
      {/* Error display might be handled better in the parent component */}
    </div>
  );
}

export default WalletConnector;
