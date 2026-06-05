import { useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import { uploadDocumentToIPFS, uploadMetadataToIPFS } from "../utils/ipfs";

export default function RegisterLand() {
    const { landRegistry, isRegistrar } = useWeb3();
    const [form, setForm] = useState({ ownerAddress: "", location: "", area: "" });
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<{ parcelId: string; txHash: string } | null>(null);

    // Block non-registrars [cite: 251]
    if (!isRegistrar) {
        return (
            <div className="p-8 mt-10 max-w-2xl mx-auto bg-red-50 border border-red-200 text-center text-red-600 rounded-lg shadow-sm">
                <h2 className="text-xl font-bold">Access Denied</h2>
                <p className="mt-2">Only authorized registrars can register land parcels.</p>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) { setStatus("Please select a document file."); return; }
        if (!landRegistry) { setStatus("Wallet not connected."); return; }

        try {
            setLoading(true);
            setSuccess(null);

            // 1. Upload PDF
            setStatus("1/4: Uploading document to IPFS...");
            const docCID = await uploadDocumentToIPFS(file);

            // 2. Build & Upload Metadata
            setStatus("2/4: Generating & pinning NFT metadata...");
            const metadata = {
                name: `Cameroon Land Title`,
                description: `Official land title registered on the CamLand decentralized registry.`,
                image: `ipfs://${docCID}`,
                attributes: [
                    { trait_type: "Location", value: form.location },
                    { trait_type: "Area (sqm)", value: parseInt(form.area) }
                ]
            };
            const metaCID = await uploadMetadataToIPFS(metadata);

            // 3. Send Transaction
            setStatus("3/4: Sending transaction to blockchain... (confirm in MetaMask)");
            const tx = await landRegistry.registerLand(
                form.ownerAddress,
                form.location,
                parseInt(form.area),
                docCID,
                metaCID
            );

            // 4. Wait for Confirmation
            setStatus("4/4: Transaction submitted. Waiting for network confirmation...");
            const receipt = await tx.wait();

            setStatus("");
            setSuccess({ parcelId: "View Dashboard", txHash: receipt.hash });
            setForm({ ownerAddress: "", location: "", area: "" });
            setFile(null);

        } catch (err: any) {
            setStatus("Error: " + (err.reason || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-8 mt-6">
            <h1 className="text-3xl font-extrabold mb-6 text-slate-800">Register New Land Parcel</h1>

            {success && (
                <div className="bg-green-50 border border-green-300 rounded-lg p-5 mb-6 shadow-sm">
                    <h2 className="text-green-800 font-bold text-lg">✅ Land Registered Successfully!</h2>
                    <a
                        href={`https://sepolia.etherscan.io/tx/${success.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline text-sm mt-2 block"
                    >
                        View Transaction on Etherscan
                    </a>
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white shadow-sm border border-slate-200 rounded-xl p-8 space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Owner's Ethereum Address</label>
                    <input
                        type="text"
                        placeholder="0x..."
                        value={form.ownerAddress}
                        onChange={e => setForm({ ...form, ownerAddress: e.target.value })}
                        required
                        className="w-full border border-slate-300 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Location Description</label>
                    <input
                        type="text"
                        placeholder="e.g. Plot 12, Avenue du 20 Mai, Yaoundé"
                        value={form.location}
                        onChange={e => setForm({ ...form, location: e.target.value })}
                        required
                        className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Area (square meters)</label>
                    <input
                        type="number"
                        placeholder="500"
                        min="1"
                        value={form.area}
                        onChange={e => setForm({ ...form, area: e.target.value })}
                        required
                        className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Land Title Document (PDF)</label>
                    <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={e => e.target.files && setFile(e.target.files[0])}
                        required
                        className="w-full border border-slate-300 rounded-lg p-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                </div>

                {status && (
                    <div className="text-sm text-blue-700 bg-blue-50 p-4 rounded-lg font-medium border border-blue-200">
                        {status}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg transition disabled:opacity-50 shadow-sm"
                >
                    {loading ? "Processing Registration..." : "Register Land Parcel"}
                </button>
            </form>
        </div>
    );
}