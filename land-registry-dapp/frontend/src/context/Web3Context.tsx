import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ethers, Contract } from "ethers";
import LandRegistryABI from "../contracts/LandRegistry.json";
import LandNFTABI from "../contracts/LandNFT.json";

// Placeholders for your deployment phase
const LAND_REGISTRY_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const LAND_NFT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

interface Web3ContextType {
    account: string | null;
    provider: ethers.BrowserProvider | null;
    landRegistry: Contract | null;
    landNFT: Contract | null;
    isAdmin: boolean;
    isRegistrar: boolean;
    loading: boolean;
    error: string | null;
    connectWallet: () => Promise<void>;
    disconnectWallet: () => void;
}

const Web3Context = createContext<Web3ContextType | null>(null);

export function Web3Provider({ children }: { children: ReactNode }) {
    const [account, setAccount] = useState<string | null>(null);
    const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
    const [landRegistry, setLandRegistry] = useState<Contract | null>(null);
    const [landNFT, setLandNFT] = useState<Contract | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isRegistrar, setIsRegistrar] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const connectWallet = async () => {
        if (!window.ethereum) {
            setError("MetaMask not found. Please install MetaMask.");
            return;
        }

        try {
            setLoading(true);
            const web3Provider = new ethers.BrowserProvider(window.ethereum);

            // Force MetaMask to show the account picker popup every time
            await web3Provider.send("wallet_requestPermissions", [{ eth_accounts: {} }]);
            const accounts = await web3Provider.send("eth_accounts", []);
            const web3Signer = await web3Provider.getSigner();

            // Initialize Contracts
            const registry = new ethers.Contract(LAND_REGISTRY_ADDRESS, LandRegistryABI.abi, web3Signer);
            const nft = new ethers.Contract(LAND_NFT_ADDRESS, LandNFTABI.abi, web3Signer);

            setAccount(accounts[0]);
            setProvider(web3Provider);
            setLandRegistry(registry);
            setLandNFT(nft);
            
            // We wrap the role checks in a try/catch so the app doesn't crash if contracts aren't deployed yet
            try {
                 const adminStatus = await registry.isAdmin(accounts[0]);
                 const registrarStatus = await registry.isRegistrar(accounts[0]);
                 setIsAdmin(adminStatus);
                 setIsRegistrar(registrarStatus);
            } catch (roleError) {
                 console.warn("Contracts not deployed or network mismatch. Roles default to false.");
                 setIsAdmin(false);
                 setIsRegistrar(false);
            }

            setError(null);
        } catch (err: any) {
            setError("Failed to connect wallet: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const disconnectWallet = async () => {
        // Revoke MetaMask permissions so next connect shows a fresh prompt
        if (window.ethereum) {
            try {
                await window.ethereum.request({
                    method: "wallet_revokePermissions",
                    params: [{ eth_accounts: {} }],
                });
            } catch (err) {
                console.warn("wallet_revokePermissions not supported, clearing local state only.");
            }
        }

        setAccount(null);
        setProvider(null);
        setLandRegistry(null);
        setLandNFT(null);
        setIsAdmin(false);
        setIsRegistrar(false);
    };

    useEffect(() => {
        if (window.ethereum) {
            window.ethereum.on("accountsChanged", (accounts: string[]) => {
                if (accounts.length === 0) {
                    disconnectWallet();
                } else {
                    connectWallet();
                }
            });
        }
    }, []);

    return (
        <Web3Context.Provider
            value={{ account, provider, landRegistry, landNFT, isAdmin, isRegistrar, loading, error, connectWallet, disconnectWallet }}
        >
            {children}
        </Web3Context.Provider>
    );
}

export function useWeb3() {
    const context = useContext(Web3Context);
    if (!context) throw new Error("useWeb3 must be used within a Web3Provider");
    return context;
}