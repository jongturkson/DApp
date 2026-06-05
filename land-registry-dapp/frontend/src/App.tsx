import { useState } from 'react';
import Navbar from './components/Navbar';
import RegisterLand from './pages/RegisterLand';
import VerifyOwnership from './pages/VerifyOwnership';
import MyParcels from './pages/MyParcels';

function App() {
  const [currentPage, setCurrentPage] = useState("home");

  const renderPage = () => {
    switch (currentPage) {
      case "register": return <RegisterLand />;
      case "verify": return <VerifyOwnership />;
      case "my-parcels": return <MyParcels />;
      default: return (
        <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 text-center max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">
            Cameroon Decentralized Land Registry
          </h1>
          <p className="text-lg text-slate-600 mb-8">
            Secure, transparent, and immutable land registration powered by Ethereum.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
              <button 
                onClick={() => setCurrentPage("register")}
                className="bg-slate-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-700 transition"
              >
                Registrar Dashboard
              </button>
              <button 
                onClick={() => setCurrentPage("verify")}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Verify a Parcel
              </button>
              <button 
                onClick={() => setCurrentPage("my-parcels")}
                className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
              >
                My Parcels
              </button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="p-8">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;