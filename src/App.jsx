import { useState, useEffect } from "react";
import { auth, provider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { demoUser } from "./demoData.js";

import Dashboard from "./tabs/Dashboard.jsx";
import Transactions from "./tabs/Transactions.jsx";
import Recurring from "./tabs/Recurring.jsx";
import WhatIf from "./tabs/WhatIf.jsx";
import Import from "./tabs/Import.jsx";
import { DashboardIcon, TransactionsIcon, RecurringIcon, WhatIfIcon, ImportIcon } from "./components/icons.jsx";

const tabs = [
  { id: "dashboard", label: "Dashboard", Icon: DashboardIcon },
  { id: "transactions", label: "Transactions", Icon: TransactionsIcon },
  { id: "recurring", label: "Recurring", Icon: RecurringIcon },
  { id: "whatif", label: "What-If", Icon: WhatIfIcon },
  { id: "import", label: "Import", Icon: ImportIcon },
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
  const [demoMode, setDemoMode] = useState(false);

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
    setDemoMode(false);
    await signOut(auth);
  };

  const effectiveUser = user || (demoMode ? demoUser : null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white/40 text-sm tracking-widest uppercase">Loading...</div>
      </div>
    );
  }

  if (!effectiveUser) {
    return (
      <div className="relative min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-blue-500/15 blur-[100px]" />
        <h1 className="relative text-transparent bg-clip-text bg-gradient-to-br from-white to-blue-200 text-5xl font-bold mb-3 tracking-tight">
          FlowCast
        </h1>
        <p className="relative text-white/50 text-sm mb-10 text-center">Know your numbers. Own your future.</p>
        <button
          onClick={handleLogin}
          className="relative bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white px-7 py-3 rounded-xl font-medium transition min-h-[44px] shadow-lg shadow-blue-500/25"
        >
          Sign in with Google
        </button>
        <button
          onClick={() => setDemoMode(true)}
          className="relative text-white/50 hover:text-white text-sm mt-4 underline underline-offset-2"
        >
          View Demo
        </button>
        {loginError && <p className="relative text-red-400 text-xs mt-4 text-center max-w-xs">{loginError}</p>}
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case "dashboard": return <Dashboard user={effectiveUser} onNavigate={setActiveTab} />;
      case "transactions": return <Transactions user={effectiveUser} />;
      case "recurring": return <Recurring user={effectiveUser} />;
      case "whatif": return <WhatIf user={effectiveUser} />;
      case "import": return <Import user={effectiveUser} />;
      default: return null;
    }
  };

  return (
    <div className="h-screen bg-gray-950 flex flex-col max-w-md mx-auto">
      {demoMode && (
        <div className="bg-amber-500 text-gray-950 text-xs font-medium text-center py-1.5 flex-shrink-0">
          Demo Mode — sample data, changes aren't saved
        </div>
      )}
      <div className="border-b border-white/[0.08] px-4 py-3 flex items-center justify-between flex-shrink-0">
        <h1 className="text-white font-bold text-lg tracking-tight">FlowCast</h1>
        <div className="flex items-center gap-3">
          <span className="text-white/50 text-xs">{effectiveUser.displayName}</span>
          <button
            onClick={handleLogout}
            className="text-white/50 hover:text-white text-xs transition"
          >
            {demoMode ? "Exit Demo" : "Logout"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {renderTab()}
      </div>

      <div className="border-t border-white/[0.08] flex bg-gray-950 flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 transition min-h-[44px] ${
              activeTab === tab.id ? "text-blue-500" : "text-white/40 hover:text-white/70"
            }`}
          >
            <tab.Icon />
            <span className="text-[10px]">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
