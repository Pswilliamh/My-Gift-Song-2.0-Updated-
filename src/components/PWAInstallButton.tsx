import React, { useState } from 'react';
import { Download, Smartphone, Monitor, CheckCircle2, X, ExternalLink, Sparkles } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'light' | 'dark';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'light' }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // Hide install button if already running in standalone installed mode
  if (isInstalled && !justInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        setJustInstalled(true);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  const isLight = variant === 'light';

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={
          isLight
            ? 'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-slate-900 text-xs font-mono font-bold shadow-xs transition-all cursor-pointer'
            : 'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#1c1815] hover:bg-[#2a231d] border border-[#FFD700]/40 text-[#FFD700] text-xs font-mono font-bold shadow-[0_0_12px_rgba(255,215,0,0.15)] transition-all cursor-pointer'
        }
        title="Install MyGiftSong App with Custom Icon to Android or Desktop"
      >
        <img
          src="/pwa-192x192.png"
          alt="MyGiftSong App Icon"
          className="w-5 h-5 rounded-md object-cover border border-amber-400/60 shadow-2xs"
        />
        <Download size={13} className={isLight ? 'text-amber-700' : 'text-[#FFD700]'} />
        <span>{isInstallable ? 'Install App' : 'Install Android / Desktop'}</span>
      </button>

      {showInstallModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
          onClick={() => setShowInstallModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white text-slate-900 border border-slate-200 p-6 shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowInstallModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
              aria-label="Close install guide"
            >
              <X size={16} />
            </button>

            {/* App Icon Showcase Header */}
            <div className="flex items-center gap-4 pb-5 border-b border-slate-200">
              <div className="relative shrink-0">
                <img
                  src="/pwa-512x512.png"
                  alt="MyGiftSong App Icon"
                  className="w-20 h-20 rounded-2xl shadow-lg border-2 border-amber-400 object-cover"
                />
                <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded-md shadow">
                  PWA
                </span>
              </div>
              <div>
                <div className="inline-flex items-center gap-1 text-[11px] font-mono font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md mb-1">
                  <Sparkles size={11} />
                  <span>Android &amp; Desktop App Ready</span>
                </div>
                <h3 className="text-xl font-display font-bold text-slate-900">
                  Install MyGiftSong App
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Add Haddi’s Song Studio directly to your Android Home Screen or Desktop with the custom golden guitar icon.
                </p>
              </div>
            </div>

            {/* Icon Variants Preview (Android Adaptive Circle vs Desktop Rounded Square) */}
            <div className="grid grid-cols-2 gap-3 my-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                <img
                  src="/pwa-maskable-512x512.png"
                  alt="Android Adaptive Icon"
                  className="w-12 h-12 rounded-full shadow-md border border-amber-400/50 object-cover shrink-0"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    <Smartphone size={12} className="text-amber-600" />
                    Android Home Icon
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Adaptive maskable icon for Android launcher
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <img
                  src="/pwa-192x192.png"
                  alt="Desktop App Icon"
                  className="w-12 h-12 rounded-xl shadow-md border border-amber-400/50 object-cover shrink-0"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    <Monitor size={12} className="text-amber-600" />
                    Desktop Shortcut
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Standalone window for Windows, Mac &amp; ChromeOS
                  </p>
                </div>
              </div>
            </div>

            {/* Direct Install or Step-by-Step Instructions */}
            {isInstallable ? (
              <div className="my-4">
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await install();
                    if (ok) setShowInstallModal(false);
                  }}
                  className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-mono font-bold text-sm uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Download size={16} />
                  <span>Install Now to Device</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3 my-4 text-xs text-slate-700">
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                    <Smartphone size={14} className="text-amber-600" />
                    <span>On Android (Chrome / Edge / Samsung Internet):</span>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1">
                    <li>
                      Open this app in its own browser tab using the button below.
                    </li>
                    <li>
                      Tap the browser menu <strong>(⋮)</strong> in the top-right corner.
                    </li>
                    <li>
                      Tap <strong>“Install app”</strong> or <strong>“Add to Home screen”</strong> — the golden MyGiftSong icon will appear on your Android home screen!
                    </li>
                  </ol>
                </div>

                <div className="p-3 rounded-xl bg-slate-100 border border-slate-200">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                    <Monitor size={14} className="text-slate-700" />
                    <span>On Desktop (Chrome / Edge on Windows, Mac, Linux):</span>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1">
                    <li>
                      Open this app in a full browser tab (outside the preview frame).
                    </li>
                    <li>
                      Click the <strong>Install MyGiftSong</strong> icon <span className="inline-block px-1.5 py-0.5 bg-white rounded border border-slate-300 font-mono text-[10px]">⊕</span> on the right side of your address bar.
                    </li>
                    <li>
                      Click <strong>Install</strong> to place the MyGiftSong app icon on your Desktop &amp; Taskbar.
                    </li>
                  </ol>
                </div>

                {(isIOS || !isAndroid) && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="font-bold text-slate-900 mb-1">
                      On iPhone / iPad (Safari):
                    </p>
                    <p className="text-slate-600">
                      Tap the <strong>Share</strong> button in Safari, scroll down, and tap <strong>Add to Home Screen</strong>.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <a
                href={typeof window !== 'undefined' ? window.location.href : '/'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-amber-500 text-white hover:text-slate-950 text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer"
              >
                <span>Open in Full Tab to Install</span>
                <ExternalLink size={13} />
              </a>

              <div className="flex items-center gap-2">
                <a
                  href="/pwa-512x512.png"
                  download="mygiftsong-app-icon.png"
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-mono font-semibold transition"
                >
                  <Download size={13} />
                  <span>Save Icon PNG</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowInstallModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-bold transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-mono font-bold text-white shadow-lg border border-amber-400">
      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
      <span>Offline Mode — Cached studio assets active</span>
    </div>
  );
};
