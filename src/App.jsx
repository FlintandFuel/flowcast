import { useState, useEffect } from "react";
import { auth, provider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

import Dashboard from "./tabs/Dashboard.jsx";
import Transactions from "./tabs/Transactions.jsx";
import Recurring from "./tabs/Recurring.jsx";
import WhatIf from "./tabs/WhatIf.jsx";
import Import from "./tabs/Import.jsx";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: "⬡" },
  { id: "transactions", label: "Transactions", icon: "≡" },
  { id: "recurring", label: "Recurring", icon: "↻" },
  { id: "whatif", label: "What-If", icon: "◈" },
  { id: "import", label: "Import", icon: "⇪" },
];

const LOGIN_ERROR_MESSAGES = {
  "auth/configuration-not-found": "Google sign-in isn't enabled for this app yet. Contact the app owner.",
  "auth/unauthorized-domain": "This site isn't authorized for sign-in yet. Contact the app owner.",
  "auth/popup-blocked": "Your browser blocked the sign-in popup. Allow popups for this site and try again.",
  "auth/popup-closed-by-user": "",
  "auth/cancelled-popup-request": "",
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleLogin = async () => {
    setLoginError("");
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error(e);
      const message = e.code in LOGIN_ERROR_MESSAGES ? LOGIN_ERROR_MESSAGES[e.code] : "Sign-in failed. Please try again.";
      setLoginError(message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-sm tracking-widest uppercase">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6">
        <h1 className="text-white text-3xl font-bold mb-2">FlowCast</h1>
        <p className="text-gray-500 text-sm mb-8 text-center">Know your numbers. Own your future.</p>
        <button
          onClick={handleLogin}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition min-h-[44px]"
        >
          Sign in with Google
        </button>
        {loginError && <p className="text-red-400 text-xs mt-4 text-center max-w-xs">{loginError}</p>}
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case "dashboard": return <Dashboard user={user} onNavigate={setActiveTab} />;
      case "transactions": return <Transactions user={user} />;
      case "recurring": return <Recurring user={user} />;
      case "whatif": return <WhatIf user={user} />;
      case "import": return <Import user={user} />;
      default: return null;
    }
  };

  return (
    <div className="h-screen bg-gray-950 flex flex-col max-w-md mx-auto">
      <div className="border-b border-gray-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <h1 className="text-white font-bold text-lg">FlowCast</h1>
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-xs">{user.displayName}</span>
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-white text-xs transition"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {renderTab()}
      </div>

      <div className="border-t border-gray-800 flex bg-gray-950 flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center py-2 px-1 transition min-h-[44px] ${
              activeTab === tab.id ? "text-blue-500" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            <span className="text-[10px] mt-0.5">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
