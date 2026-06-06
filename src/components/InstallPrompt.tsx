import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, HelpCircle, CornerRightDown, Smartphone, ShieldCheck, Milestone, ArrowDown } from 'lucide-react';

interface InstallPromptProps {
  themeColor: string;
}

export default function InstallPrompt({ themeColor }: InstallPromptProps) {
  // PWA states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
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

    // 3. Listen for beforeinstallprompt event (Android / Desktop Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      
      // Auto show prompt if user hasn't explicitly dismissed this session
      const dismissed = sessionStorage.getItem('dzidestimator_prompt_dismissed');
      if (!dismissed && !isRunningStandalone) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If iOS Safari and not running in standalone mode, auto-prompt can be offered
    const dismissed = sessionStorage.getItem('dzidestimator_prompt_dismissed');
    if (isIosDevice && !isRunningStandalone && !dismissed) {
      // Small timeout to not disrupt page loading
      const timer = setTimeout(() => {
        setIsInstallable(true);
        setShowPrompt(true);
      }, 2000);
      return () => clearTimeout(timer);
    }

    // fallback: if not standalone, we can still show download guides or help
    if (!isRunningStandalone && !dismissed) {
      // Let it show so user can download/install
      const timer = setTimeout(() => {
        setIsInstallable(true);
        setShowPrompt(true);
      }, 3000);
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
    } else if (isIOS) {
      setShowGuide(true);
    } else {
      // General fall-back guide
      setShowGuide(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('dzidestimator_prompt_dismissed', 'true');
  };

  // If already running standalone (as installed app), don't render prompt banners
  if (isStandalone) {
    return null;
  }

  // Active styles based on theme
  const borderStyle = { borderColor: themeColor };

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
              <div className="text-center md:text-left">
                <h4 className="text-xs sm:text-sm font-black text-slate-100 uppercase tracking-wider flex items-center justify-center md:justify-start gap-1.5">
                  Install DzidEstimator App
                  <span className="text-[9px] bg-sky-400/15 text-sky-300 font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-widest animate-pulse border border-sky-500/10">
                    Offline Ready
                  </span>
                </h4>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed font-semibold">
                  Ensure ultra-fast calculation bills, instant PDFs, and client ledgers—right from your Android home screen, iPhone, or Desktop PC.
                </p>
              </div>
            </div>

            {/* Buttons Row */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-center">
              <button
                onClick={handleInstallClick}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black rounded-lg shadow-lg active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer border-none"
                style={{ backgroundColor: themeColor }}
              >
                <Smartphone className="h-3.5 w-3.5 shrink-0" />
                {deferredPrompt ? "Install Instantly" : (isIOS ? "How to Install on iPhone" : "Download App")}
              </button>

              <button
                onClick={() => setShowGuide(!showGuide)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700/60"
              >
                <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                Install Guide
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

          {/* Interactive PWA Installation Walkthrough Guide */}
          <AnimatePresence>
            {showGuide && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-3 sm:mt-4 max-w-7xl mx-auto border-t border-slate-800/80 pt-3 sm:pt-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-950/70 border border-slate-800/80 rounded-2xl">
                  {/* Option 1: Chrome / Android */}
                  <div className="space-y-2 p-3 bg-slate-900/40 rounded-xl border border-slate-800/30">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-sky-500/10 text-sky-400 font-extrabold text-xs flex items-center justify-center border border-sky-500/20">
                        1
                      </span>
                      <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider">Android / Chrome PC</h4>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                      Simply click the <strong className="text-sky-400">Install Instantly</strong> button above. A native installation card will slide down to save the file.
                    </p>
                    <div className="text-[10px] text-slate-500 italic mt-1 font-semibold">
                      Supports instant system notifications and offline-ready storage.
                    </div>
                  </div>

                  {/* Option 2: Safari / iOS */}
                  <div className="space-y-2 p-3 bg-slate-900/40 rounded-xl border border-slate-800/30 relative">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-amber-500/10 text-amber-500 font-extrabold text-xs flex items-center justify-center border border-amber-500/20">
                        2
                      </span>
                      <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider">iPhone / Safari Browser</h4>
                    </div>
                    <div className="text-[11px] text-slate-400 space-y-1.5 font-medium leading-relaxed">
                      <p className="flex items-center gap-1.5">
                        <span className="shrink-0">1. Tap Safari Share</span>
                        <span className="h-4 w-4 bg-slate-800 inline-flex items-center justify-center rounded text-slate-300 text-[10px]">📤</span>
                        <span>button.</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span>2. Select</span>
                        <strong className="text-amber-500">“Add to Home Screen”</strong>
                        <span className="shrink-0 h-4 w-4 bg-slate-800 inline-flex items-center justify-center rounded text-slate-300 text-[10px]">➕</span>
                      </p>
                      <p>3. Tap <strong className="text-emerald-400">“Add”</strong> in top right corner.</p>
                    </div>
                    <div className="absolute top-1 right-2 animate-bounce">
                      <CornerRightDown className="h-4 w-4 text-amber-500" />
                    </div>
                  </div>

                  {/* Option 3: General capabilities */}
                  <div className="space-y-2 p-3 bg-slate-900/40 rounded-xl border border-slate-800/30">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-400 font-extrabold text-xs flex items-center justify-center border border-emerald-500/20">
                        3
                      </span>
                      <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider">Why Install?</h4>
                    </div>
                    <div className="space-y-1.5 text-[11px] text-slate-400 font-medium">
                      <p className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span>Instant Loading without cellular data lag.</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Milestone className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                        <span>Clean fullscreen design, hiding bulky browser bars.</span>
                      </p>
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
