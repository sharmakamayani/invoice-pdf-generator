"use client";

import { useEffect, useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InstallEvent = any;

export default function PWARegister() {
  const [installPrompt, setInstallPrompt] = useState<InstallEvent | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {/* offline support unavailable */});
    }
    const onPrompt = (e: InstallEvent) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!installPrompt) return null;

  return (
    <button
      onClick={async () => {
        installPrompt.prompt();
        await installPrompt.userChoice;
        setInstallPrompt(null);
      }}
      className="fixed bottom-4 right-4 z-50 bg-indigo-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
    >
      ⬇ Install app
    </button>
  );
}
