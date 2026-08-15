"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type IOSNavigator = Navigator & {
  standalone?: boolean;
};

export default function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Already running standalone (installed) — covers Chrome/Edge/Android.
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    // iOS Safari's own flag for "added to home screen".
    const isIOSStandalone = (window.navigator as IOSNavigator).standalone === true;

    if (standaloneQuery.matches || isIOSStandalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  // Nothing to show: already installed, or browser hasn't offered the prompt yet
  // (either it doesn't support it, like Safari, or criteria aren't met yet).
  if (isInstalled || !deferredPrompt) {
    return null;
  }

  return (
    <button
      onClick={handleInstallClick}
      className="inline-flex items-center justify-center rounded-full bg-forest px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:bg-forest/90"
    >
      Install App
    </button>
  );
}
