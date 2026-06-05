import { useState, useEffect, useCallback } from "react";
import {
    MapPin,
    Maximize,
    FileText,
    Send,
    RefreshCw,
    Loader2,
    ShieldCheck,
    Clock,
    X,
    AlertTriangle,
    LayoutDashboard,
} from "lucide-react";
import { useWeb3 } from "../context/Web3Context";

interface ParcelData {
    parcelId: string;
    owner: string;
    location: string;
    area: string;
    documentCID: string;
    metadataCID: string;
    isRegistered: boolean;
    registeredAt: string;
    lastTransferAt: string;
}

export default function MyParcels() {
    const { landRegistry, account } = useWeb3();
    const [parcels, setParcels] = useState<ParcelData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Transfer modal state
    const [transferModal, setTransferModal] = useState<{
        open: boolean;
        parcelId: string;
        location: string;
    }>({ open: false, parcelId: "", location: "" });
    const [newOwnerAddress, setNewOwnerAddress] = useState("");
    const [transferStatus, setTransferStatus] = useState("");
    const [transferLoading, setTransferLoading] = useState(false);

    const fetchParcels = useCallback(async () => {
        if (!landRegistry || !account) return;

        try {
            setLoading(true);
            setError("");

            // 1. Get all parcel IDs owned by the connected user
            const parcelIds: bigint[] = await landRegistry.getParcelsByOwner(account);

            if (parcelIds.length === 0) {
                setParcels([]);
                return;
            }

            // 2. Fetch full details for each parcel
            const parcelDetails: ParcelData[] = await Promise.all(
                parcelIds.map(async (id: bigint) => {
                    const detail = await landRegistry.getParcelDetails(id);
                    return {
                        parcelId: detail.parcelId.toString(),
                        owner: detail.owner,
                        location: detail.location,
                        area: detail.area.toString(),
                        documentCID: detail.documentCID,
                        metadataCID: detail.metadataCID,
                        isRegistered: detail.isRegistered,
                        registeredAt: detail.registeredAt.toString(),
                        lastTransferAt: detail.lastTransferAt.toString(),
                    };
                })
            );

            setParcels(parcelDetails);
        } catch (err: any) {
            console.error(err);
            setError("Failed to load parcels. Ensure your wallet is connected to the correct network.");
        } finally {
            setLoading(false);
        }
    }, [landRegistry, account]);

    useEffect(() => {
        fetchParcels();
    }, [fetchParcels]);

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!landRegistry) {
            setTransferStatus("Wallet not connected.");
            return;
        }

        try {
            setTransferLoading(true);
            setTransferStatus("Sending transfer transaction... (confirm in MetaMask)");

            const tx = await landRegistry.transferOwnership(
                transferModal.parcelId,
                newOwnerAddress
            );

            setTransferStatus("Transaction submitted. Waiting for confirmation...");
            await tx.wait();

            setTransferStatus("");
            setTransferModal({ open: false, parcelId: "", location: "" });
            setNewOwnerAddress("");

            // Refresh the list after successful transfer
            await fetchParcels();
        } catch (err: any) {
            console.error(err);
            const reason = err.reason || err.message || "Transaction failed.";
            setTransferStatus("Error: " + reason);
        } finally {
            setTransferLoading(false);
        }
    };

    const formatTimestamp = (ts: string) => {
        const date = new Date(Number(ts) * 1000);
        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    // ─── Not Connected State ───
    if (!account) {
        return (
            <div className="max-w-3xl mx-auto p-8 mt-10">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center shadow-sm">
                    <AlertTriangle className="mx-auto text-amber-500 mb-4" size={40} />
                    <h2 className="text-xl font-bold text-amber-800 mb-2">Wallet Not Connected</h2>
                    <p className="text-amber-700">
                        Please connect your MetaMask wallet to view your registered land parcels.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-8 mt-6">
            {/* ─── Header ─── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-800 flex items-center gap-3">
                        <LayoutDashboard className="text-blue-600" size={36} />
                        My Parcels
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">
                        Manage and transfer your registered land titles on the CamLand registry.
                    </p>
                </div>
                <button
                    onClick={fetchParcels}
                    disabled={loading}
                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-2.5 rounded-lg transition border border-slate-200 disabled:opacity-50"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            {/* ─── Error State ─── */}
            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 text-center font-medium mb-6">
                    {error}
                </div>
            )}

            {/* ─── Loading State ─── */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="text-blue-600 animate-spin mb-4" size={48} />
                    <p className="text-slate-500 text-lg font-medium">Loading your parcels from the blockchain...</p>
                </div>
            )}

            {/* ─── Empty State ─── */}
            {!loading && parcels.length === 0 && !error && (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                    <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <MapPin className="text-slate-400" size={36} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-700 mb-2">No Parcels Found</h2>
                    <p className="text-slate-500 max-w-md mx-auto">
                        You currently have no land parcels registered to your wallet address. Once a registrar
                        registers a parcel in your name, it will appear here.
                    </p>
                </div>
            )}

            {/* ─── Parcels Grid ─── */}
            {!loading && parcels.length > 0 && (
                <>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-3 mb-6 flex items-center gap-2">
                        <ShieldCheck className="text-blue-600" size={20} />
                        <span className="text-blue-800 font-medium text-sm">
                            {parcels.length} registered parcel{parcels.length > 1 ? "s" : ""} found for your wallet.
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {parcels.map((parcel) => (
                            <div
                                key={parcel.parcelId}
                                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow duration-300"
                            >
                                {/* Card Header */}
                                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
                                    <h3 className="text-white font-bold text-lg">
                                        Parcel #{parcel.parcelId}
                                    </h3>
                                    <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase backdrop-blur-sm">
                                        Registered
                                    </span>
                                </div>

                                {/* Card Body */}
                                <div className="p-6 space-y-4">
                                    {/* Location */}
                                    <div className="flex items-start gap-3">
                                        <div className="bg-blue-50 p-2 rounded-lg flex-shrink-0">
                                            <MapPin className="text-blue-600" size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Location</p>
                                            <p className="text-slate-800 font-medium text-sm">{parcel.location}</p>
                                        </div>
                                    </div>

                                    {/* Area */}
                                    <div className="flex items-start gap-3">
                                        <div className="bg-blue-50 p-2 rounded-lg flex-shrink-0">
                                            <Maximize className="text-blue-600" size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Area</p>
                                            <p className="text-slate-800 font-medium text-sm">{parcel.area} m²</p>
                                        </div>
                                    </div>

                                    {/* Registered Date */}
                                    <div className="flex items-start gap-3">
                                        <div className="bg-blue-50 p-2 rounded-lg flex-shrink-0">
                                            <Clock className="text-blue-600" size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Registered</p>
                                            <p className="text-slate-800 font-medium text-sm">{formatTimestamp(parcel.registeredAt)}</p>
                                        </div>
                                    </div>

                                    {/* Document Link */}
                                    <div className="flex items-start gap-3">
                                        <div className="bg-blue-50 p-2 rounded-lg flex-shrink-0">
                                            <FileText className="text-blue-600" size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Title Document</p>
                                            <a
                                                href={`https://gateway.pinata.cloud/ipfs/${parcel.documentCID}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-blue-600 hover:text-blue-800 font-medium text-sm underline"
                                            >
                                                View on IPFS
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Footer — Transfer Button */}
                                <div className="border-t border-slate-100 px-6 py-4">
                                    <button
                                        onClick={() =>
                                            setTransferModal({
                                                open: true,
                                                parcelId: parcel.parcelId,
                                                location: parcel.location,
                                            })
                                        }
                                        className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-lg transition shadow-sm"
                                    >
                                        <Send size={16} />
                                        Transfer Ownership
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* ─── Transfer Modal ─── */}
            {transferModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => {
                            if (!transferLoading) {
                                setTransferModal({ open: false, parcelId: "", location: "" });
                                setTransferStatus("");
                                setNewOwnerAddress("");
                            }
                        }}
                    />

                    {/* Modal */}
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 z-10">
                        {/* Close */}
                        <button
                            onClick={() => {
                                if (!transferLoading) {
                                    setTransferModal({ open: false, parcelId: "", location: "" });
                                    setTransferStatus("");
                                    setNewOwnerAddress("");
                                }
                            }}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
                        >
                            <X size={24} />
                        </button>

                        <h2 className="text-2xl font-bold text-slate-800 mb-1">
                            Transfer Ownership
                        </h2>
                        <p className="text-slate-500 text-sm mb-6">
                            Transfer <span className="font-semibold text-slate-700">Parcel #{transferModal.parcelId}</span>{" "}
                            ({transferModal.location}) to a new owner. This action is{" "}
                            <span className="text-red-600 font-semibold">irreversible</span>.
                        </p>

                        <form onSubmit={handleTransfer} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    New Owner's Ethereum Address
                                </label>
                                <input
                                    type="text"
                                    placeholder="0x..."
                                    value={newOwnerAddress}
                                    onChange={(e) => setNewOwnerAddress(e.target.value)}
                                    required
                                    disabled={transferLoading}
                                    className="w-full border border-slate-300 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                                />
                            </div>

                            {/* Warning */}
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                                <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
                                <p className="text-amber-800 text-sm">
                                    This will permanently transfer the land title NFT and all on-chain ownership records
                                    to the new address. Ensure the address is correct.
                                </p>
                            </div>

                            {/* Status */}
                            {transferStatus && (
                                <div
                                    className={`text-sm p-4 rounded-lg font-medium border ${
                                        transferStatus.startsWith("Error")
                                            ? "text-red-700 bg-red-50 border-red-200"
                                            : "text-blue-700 bg-blue-50 border-blue-200"
                                    }`}
                                >
                                    {transferStatus}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!transferLoading) {
                                            setTransferModal({ open: false, parcelId: "", location: "" });
                                            setTransferStatus("");
                                            setNewOwnerAddress("");
                                        }
                                    }}
                                    disabled={transferLoading}
                                    className="flex-1 border border-slate-300 text-slate-700 font-semibold py-3 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={transferLoading}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                                >
                                    {transferLoading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={16} />
                                            Confirm Transfer
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
