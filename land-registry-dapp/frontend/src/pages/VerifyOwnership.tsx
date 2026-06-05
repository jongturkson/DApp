import { useState } from "react";
import { Search, MapPin, Maximize, User, FileText, CheckCircle } from "lucide-react";
import { useWeb3 } from "../context/Web3Context";

export default function VerifyOwnership() {
    const { landRegistry } = useWeb3();
    const [parcelId, setParcelId] = useState("");
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!landRegistry) {
            setError("Please connect your wallet to access the blockchain network.");
            return;
        }

        try {
            setLoading(true);
            setError("");
            setResult(null);

            // Calls the verifyOwnership function from your smart contract
            const data = await landRegistry.verifyOwnership(parcelId);
            
            setResult({
                owner: data[0],
                location: data[1],
                area: data[2].toString(),
                documentCID: data[3],
                isRegistered: data[4]
            });
        } catch (err: any) {
            console.error(err);
            setError("Parcel not found. Please check the ID and try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-8 mt-6">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-extrabold text-slate-800 mb-4">Verify Land Ownership</h1>
                <p className="text-slate-600 text-lg">
                    Enter a Parcel ID to instantly verify its current owner and official registry details on the blockchain[cite: 35, 276].
                </p>
            </div>

            <form onSubmit={handleVerify} className="flex gap-4 mb-8">
                <input
                    type="number"
                    min="1"
                    placeholder="Enter Parcel ID (e.g., 1)"
                    value={parcelId}
                    onChange={(e) => setParcelId(e.target.value)}
                    required
                    className="flex-1 border border-slate-300 rounded-xl p-4 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition disabled:opacity-50 shadow-sm flex items-center gap-2"
                >
                    <Search size={24} />
                    {loading ? "Searching..." : "Verify"}
                </button>
            </form>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 text-center font-medium">
                    {error}
                </div>
            )}

            {result && (
                <div className="bg-white shadow-lg rounded-2xl p-8 border-t-4 border-green-500 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <CheckCircle className="text-green-500" />
                            Parcel #{parcelId} Verified
                        </h2>
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold tracking-wide uppercase">
                            Registered
                        </span>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="bg-blue-50 p-3 rounded-lg"><User className="text-blue-600" /></div>
                            <div>
                                <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider mb-1">Current Owner</p>
                                <p className="font-mono text-slate-800 font-medium break-all">{result.owner}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="bg-blue-50 p-3 rounded-lg"><MapPin className="text-blue-600" /></div>
                            <div>
                                <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider mb-1">Location</p>
                                <p className="text-slate-800 font-medium">{result.location}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="bg-blue-50 p-3 rounded-lg"><Maximize className="text-blue-600" /></div>
                            <div>
                                <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider mb-1">Area</p>
                                <p className="text-slate-800 font-medium">{result.area} m²</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="bg-blue-50 p-3 rounded-lg"><FileText className="text-blue-600" /></div>
                            <div>
                                <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider mb-1">Title Document</p>
                                <a
                                    href={`https://gateway.pinata.cloud/ipfs/${result.documentCID}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-600 hover:text-blue-800 font-medium underline flex items-center gap-1"
                                >
                                    View Official Document on IPFS
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}