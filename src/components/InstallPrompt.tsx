import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, HelpCircle, CornerRightDown, Smartphone, ShieldCheck, Milestone, ArrowDown, ExternalLink, HelpCircle as QuestionIcon, AlertTriangle } from 'lucide-react';

interface InstallPromptProps {
  themeColor: string;
}

export default function InstallPrompt({ themeColor }: InstallPromptProps) {
  // PWA states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // 1. Detect if already installed/standalone
    const isRunningStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    
    setIsStandalone(isRunningStandalone);

    // 2. Detect iOS device
    const userAgent = window.navigator.userAgent || '';
    const isIosDevice = /iPad|iPhone|iPod/.test(userAgent) && !('MSStream' in window);
    setIsIOS(isIosDevice);

    // 3. Detect restricted In-App browsers (Instagram, WhatsApp, Facebook, Line, Twitter, in-app WebViews)
    const isInApp = /FBAN|FBAV|Instagram|Twitter|Pinterest|Snapchat|Line|IAB|WebView|Messenger|WhatsApp|GSA/i.test(userAgent) || 
                   (userAgent.includes('wv') && !userAgent.includes('Chrome'));
    setIsInAppBrowser(isInApp);

    // 4. Listen for beforeinstallprompt event (Android / Desktop Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      
      const dismissed = sessionStorage.getItem('dzidestimator_prompt_dismissed');
      if (!dismissed && !isRunningStandalone) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If iOS Safari or general browser, show prompt after load to guide user
    const dismissed = sessionStorage.getItem('dzidestimator_prompt_dismissed');
    if (!isRunningStandalone && !dismissed) {
      const timer = setTimeout(() => {
        setIsInstallable(true);
        setShowPrompt(true);
      }, 1500);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA Installation outcome: ${outcome}`);
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallable(false);
        setShowPrompt(false);
      }
    } else {
      setShowGuide(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('dzidestimator_prompt_dismissed', 'true');
  };

  if (isStandalone) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="w-full bg-linear-to-r from-slate-900/95 to-[#0b1424]/95 border-b border-sky-500/10 text-white p-3 sm:p-4 shadow-2xl relative z-50 backdrop-blur-md"
        >
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 px-4">
            {/* Left info badge */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl shrink-0 border border-sky-500/20 shadow-inner">
                <Download className="h-5 w-5 animate-bounce" />
              </div>
              <div className="text-center md:text-left min-w-0">
                <h4 className="text-xs sm:text-sm font-black text-slate-100 uppercase tracking-wider flex items-center justify-center md:justify-start gap-1.5 flex-wrap">
                  Install DzidEstimator Desktop / Mobile App
                  <span className="text-[9px] bg-sky-400/15 text-sky-300 font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-widest animate-pulse border border-sky-500/10">
                    Offline Ready
                  </span>
                </h4>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed font-semibold">
                  Save calculations directly to your phone's home screen. Fast, secure, zero data lag.
                </p>
              </div>
            </div>

            {/* Buttons Row */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-center shrink-0">
              {isInAppBrowser ? (
                <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded-lg text-[11px] font-bold">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  Open in Chrome to Install!
                </div>
              ) : (
                <button
                  onClick={handleInstallClick}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black rounded-lg shadow-lg active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer border-none"
                  style={{ backgroundColor: themeColor }}
                >
                  <Smartphone className="h-3.5 w-3.5 shrink-0" />
                  {deferredPrompt ? "Install instantly" : "Add to Home Screen"}
                </button>
              )}

              <button
                onClick={() => setShowGuide(!showGuide)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700/60"
              >
                <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                Troubleshoot Direct Download
              </button>

              <button
                onClick={handleDismiss}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-all cursor-pointer border-none bg-transparent ml-1"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Interactive PWA Installation and Desktop explanation Walkthrough Help-Center */}
          <AnimatePresence>
            {showGuide && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-3 sm:mt-4 max-w-7xl mx-auto border-t border-slate-800/80 pt-3 sm:pt-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-950/75 border border-slate-850 rounded-2xl">
                  {/* Option 1: Chrome / Android (How to get on home screen) */}
                  <div className="space-y-2.5 p-3 bg-slate-900/60 rounded-xl border border-slate-800/40">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-sky-500/10 text-sky-450 font-extrabold text-xs flex items-center justify-center border border-sky-500/20">
                        1
                      </span>
                      <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Smartphone className="h-3.5 w-3.5 text-sky-400" />
                        Android / Google Chrome
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                      If the automatic installer prompt is blocked or doesn't show:
                    </p>
                    <div className="text-[11px] text-slate-300 space-y-1 font-semibold leading-relaxed pl-1 border-l border-sky-900">
                      <p>1. Open <strong className="text-sky-300">Google Chrome</strong> and go to your Vercel Link.</p>
                      <p>2. Tap the <strong className="text-sky-300">Three Dots (⋮)</strong> menu in the top right.</p>
                      <p>3. Select <span className="text-emerald-400">“Add to Home Screen”</span> or <span className="text-emerald-400">“Install app”</span>.</p>
                    </div>
                  </div>

                  {/* Option 2: Safari / iOS (Apple rules) */}
                  <div className="space-y-2.5 p-3 bg-slate-900/60 rounded-xl border border-slate-800/40 relative">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-amber-500/10 text-amber-500 font-extrabold text-xs flex items-center justify-center border border-amber-500/20">
                        2
                      </span>
                      <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <CornerRightDown className="h-3.5 w-3.5 text-amber-500" />
                        iPhone / Apple Safari
                      </h4>
                    </div>
                    <div className="text-[11px] text-slate-400 space-y-1.5 font-medium leading-relaxed">
                      <p>iOS doesn't support Chrome PWA installs—you must use Safari:</p>
                      <div className="pl-1 border-l border-amber-900/40 space-y-1 text-slate-300 font-semibold">
                        <p className="flex items-center gap-1">
                          <span>1. Open Vercel URL in </span>
                          <strong className="text-amber-400">Safari</strong>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span>2. Tap share button 📤</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span>3. Select </span>
                          <strong className="text-emerald-400">“Add to Home Screen”</strong>
                          <span> ➕</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Option 3: Crucial WebView Diagnostic alert */}
                  <div className="space-y-2.5 p-3 bg-slate-900/60 rounded-xl border border-slate-800/40">
                    <div className="flex items-center gap-2">
                       <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-400 font-extrabold text-xs flex items-center justify-center border border-emerald-500/20">
                        3
                      </span>
                      <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-450" />
                        The "In-App Browser" Barrier
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                      {isInAppBrowser ? (
                        <span className="text-amber-300 font-bold">
                          ⚠️ You are viewing this app inside another program (like WhatsApp / Github / Facebook Messenger) which BLOCKS adding the app shortcut. Tap the top-right button of this screen and select "Open in Chrome" first!
                        </span>
                      ) : (
                        <span>
                          If you are visiting this link from a WhatsApp message or GitHub App, your phone uses a restricted preview. To install, you must copy the link and open it in a true <strong>Google Chrome</strong> or <strong>Safari</strong> browser window!
                        </span>
                      )}
                    </p>
                    <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/40 text-[10px] text-slate-300">
                      <strong>💡 Standard PWAs do not download `.apk` setup files.</strong> Instead, the browser securely puts a lightweight, blazing-fast native shortcut directly on your mobile desktop.
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
