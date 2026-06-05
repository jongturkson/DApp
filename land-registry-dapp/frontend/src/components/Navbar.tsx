import { Wallet } from 'lucide-react';
import { useWeb3 } from '../context/Web3Context';

export default function Navbar() {
    const { account, connectWallet, disconnectWallet, loading } = useWeb3();

    const formatAddress = (address: string) => {
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };

    return (
        <nav className="bg-white shadow-md px-6 py-4 flex justify-between items-center border-b-4 border-blue-900">
            <div className="flex items-center gap-2">
                <div className="text-2xl font-extrabold text-blue-900 tracking-tight">
                    CamLand Registry
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                {account ? (
                    <div className="flex items-center gap-3">
                        <span className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-mono font-medium border border-slate-200">
                            {formatAddress(account)}
                        </span>
                        <button
                            onClick={disconnectWallet}
                            className="text-sm font-semibold text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition"
                        >
                            Disconnect
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={connectWallet}
                        disabled={loading}
                        className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
                    >
                        <Wallet size={20} />
                        {loading ? "Connecting..." : "Connect Wallet"}
                    </button>
                )}
            </div>
        </nav>
    );
}