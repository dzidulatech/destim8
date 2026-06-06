import React, { useState } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, ExternalLink } from 'lucide-react';
import { signInWithPopup, googleProvider, auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

interface LoginViewProps {
  onSignInSuccess: () => void;
}

export default function LoginView({ onSignInSuccess }: LoginViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authErrorType, setAuthErrorType] = useState<'unauthorized-domain' | 'storage' | 'blocked' | 'general' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setAuthErrorType(null);
    try {
      await signInWithPopup(auth, googleProvider);
      onSignInSuccess();
    } catch (err: any) {
      console.error("Google Auth execution failed:", err);
      const errCode = err?.code;
      const errMessage = err?.message || "";
      
      if (errCode === 'auth/unauthorized-domain' || errMessage.includes('unauthorized-domain')) {
        setAuthErrorType('unauthorized-domain');
        setError(`Unauthorized Domain: The browser preview domain "${window.location.hostname}" is not authorized in your Firebase Project configuration.`);
      } else if (errCode === 'auth/web-storage-unsupported' || errMessage.includes('web-storage-unsupported') || window.self !== window.top) {
        setAuthErrorType('storage');
        setError("Browser iframe restriction: The Google sign-in window was blocked from writing security tokens inside this nested preview iframe.");
      } else if (errCode === 'auth/popup-blocked' || errMessage.includes('popup-blocked')) {
        setAuthErrorType('blocked');
        setError("Pop-up blocked: Your web browser prevented the Google login window from opening.");
      } else {
        setAuthErrorType('general');
        setError(err?.message || "Sign-in was interrupted. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onSignInSuccess();
    } catch (err: any) {
      console.error("Email authentication failed:", err);
      let friendlyMessage = err?.message || "Authentication failed. Please check your credentials.";
      if (err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        friendlyMessage = "Invalid email or password. Please try again.";
      } else if (err?.code === 'auth/email-already-in-use') {
        friendlyMessage = "This email is already registered. Try signing in instead.";
      } else if (err?.code === 'auth/weak-password') {
        friendlyMessage = "Password must be at least 6 characters long.";
      } else if (err?.code === 'auth/invalid-email') {
        friendlyMessage = "Please enter a valid email address.";
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden font-sans">
      {/* Background Decorative Cosmic Accents */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Badge */}
      <header className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <span className="h-10 w-10 rounded-xl bg-sky-500 text-slate-900 font-black flex items-center justify-center shadow-lg shadow-sky-500/20 text-sm">
            DE
          </span>
          <div>
            <span className="font-extrabold text-[#f1f5f9] text-base flex items-center gap-1 leading-none tracking-tight">
              DzidEstimator
              <span className="text-[9px] font-black bg-slate-800 text-sky-400 px-1.5 py-0.5 rounded-xs uppercase tracking-wider">Cloud</span>
            </span>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Professional Contracting Suite</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Cloud Secure Encryption</span>
        </div>
      </header>

      {/* Hero Portal Content */}
      <main className="max-w-md w-full mx-auto my-auto py-12 z-10 flex flex-col items-stretch space-y-8" id="login-hero-container">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/85 border border-slate-700/50 text-[10px] font-bold text-sky-400 uppercase tracking-widest leading-none mb-1">
            <Sparkles className="h-3 w-3 animate-pulse" />
            Version 4.2 Auth Release
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#f1f5f9] tracking-tight leading-tight">
            Log in to <span className="text-sky-400 font-black">DzidEstimator</span>
          </h1>
          <p className="text-sm text-slate-400 max-w-sm mx-auto font-medium">
            Manage material ratios, labor pricing, site photos, and issue high-impact receipts instantly.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-2xl backdrop-blur-md">
          <div className="space-y-3">
            {[
              { title: "POP Ceilings, Drywall & Tiling", desc: "Formulas for bags, adhesive, grout, tape, and linear labor calculations." },
              { title: "Corporate Settings & PDF Quotes", desc: "Generate professional quotes with custom margins, logos, and signatures." },
              { title: "Client Ledgers & Receipts", desc: "Instantly create Mobile Money, Cash, or Wire Transfer payment receipts." }
            ].map((f, i) => (
              <div key={i} className="flex gap-3 items-start p-2.5 hover:bg-slate-800/30 rounded-xl transition-all">
                <span className="mt-1 h-5 w-5 shrink-0 rounded-md bg-slate-800/80 text-sky-400 flex items-center justify-center text-xs font-mono font-black">
                  {i+1}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{f.title}</h4>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-800/85 pt-4 space-y-4">
            {error && (
              <div className="p-4 bg-red-950/40 border border-red-900/50 rounded-2xl text-[11px] text-red-300 font-medium text-left animate-shake space-y-3">
                <p className="font-bold text-red-200">⚠️ Authentication Error</p>
                <p className="leading-relaxed">{error}</p>
                
                {authErrorType && (
                  <div className="pt-3 border-t border-red-900/40 text-[10px] text-slate-350 space-y-2">
                    <p className="font-bold text-sky-400 uppercase tracking-wider text-[9px]">How to resolve this issue:</p>
                    
                    {authErrorType === 'unauthorized-domain' && (
                      <div className="space-y-1.5">
                        <p className="text-slate-400">Since this is a custom preview domain, you can resolve this in your Firebase console:</p>
                        <ol className="list-decimal pl-3.5 space-y-1 text-slate-400 font-normal">
                          <li>Go to <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-sky-400 underline inline-flex items-center gap-0.5 font-bold hover:text-sky-300">Firebase Console <ExternalLink className="h-2.5 w-2.5" /></a></li>
                          <li>Open <b className="text-slate-200">Authentication &gt; Settings &gt; Authorized domains</b></li>
                          <li>Add <code className="bg-slate-950 px-1 py-0.5 rounded-sm text-emerald-400 font-mono select-all font-bold">{window.location.hostname}</code> to the list.</li>
                          <li>Alternatively, use <b className="text-slate-200">Email Sign-In below</b> to bypass Google Auth bounds entirely.</li>
                        </ol>
                      </div>
                    )}

                    {authErrorType === 'storage' && (
                      <div className="space-y-1.5">
                        <p className="text-slate-400">Embedded preview frames block cross-origin cookie storage by default. You can:</p>
                        <ul className="list-disc pl-3.5 space-y-1 text-slate-400 font-normal">
                          <li>Click the <b className="text-slate-200">"Open in New Tab"</b> icon at the top right of your AI Studio browser panel.</li>
                          <li>Or use the <b className="text-slate-200">Email fields below</b> to sign in easily without browser popup security limits.</li>
                        </ul>
                      </div>
                    )}

                    {authErrorType === 'blocked' && (
                      <div className="space-y-1.5">
                        <p className="text-slate-400">The browser prevented the auth window from popping up. You can:</p>
                        <ul className="list-disc pl-3.5 space-y-1 text-slate-400 font-normal">
                          <li>Click the pop-up blocker icon in your browser URL address bar and click "Always allow popups on this site".</li>
                          <li>Then click the Google Sign-in button again.</li>
                        </ul>
                      </div>
                    )}

                    {authErrorType === 'general' && (
                      <p className="text-slate-400">
                        If Google Auth fails, you can sign in instantly using the <b className="text-slate-200">Email and Password form below</b> (no actual email verification required).
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className={`w-full h-12 inline-flex items-center justify-center gap-3 bg-[#f1f5f9] hover:bg-white text-slate-950 text-xs font-extrabold rounded-2xl shadow-xl hover:shadow-sky-500/5 transition-all cursor-pointer select-none active:scale-98 ${loading ? 'opacity-80 cursor-wait' : ''}`}
            >
              {loading ? (
                <span className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#151f32"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#151f32"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#34a853"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#151f32"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              {loading ? "Authenticating Account..." : "Continue with Google Cloud"}
              {!loading && <ArrowRight className="h-4 w-4 text-slate-800" />}
            </button>

            {/* Divider */}
            <div className="relative py-2 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-850"></div>
              </div>
              <div className="relative bg-[#0c111e] text-slate-500 font-bold px-3 text-[10px] uppercase tracking-wider">
                or use email account
              </div>
            </div>

            {/* Email form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="contractor@example.com"
                    className="w-full h-11 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-hidden focus:ring-1 focus:ring-sky-500/50 focus:border-sky-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full h-11 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-hidden focus:ring-1 focus:ring-sky-500/50 focus:border-sky-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-450 px-1">
                <span>{isSignUp ? "Already have an account?" : "Need a professional account?"}</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                  }}
                  className="text-sky-400 hover:text-sky-300 hover:underline cursor-pointer font-bold focus:outline-hidden"
                >
                  {isSignUp ? "Sign In" : "Register"}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full h-11 inline-flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black rounded-xl transition-all disabled:opacity-40 disabled:hover:bg-sky-500 disabled:cursor-not-allowed cursor-pointer select-none active:scale-98"
              >
                {loading ? (
                  <span className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : isSignUp ? (
                  "Create Account & Sign In"
                ) : (
                  "Sign In with Email"
                )}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="h-10 z-10 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 font-semibold gap-2 border-t border-slate-900 pt-4">
        <p>© 2026 DzidEstimator Enterprise. Authored under standard GCP deployment guidelines.</p>
        <div className="flex gap-4">
          <span>POP</span>
          <span>Tiling</span>
          <span>Painting</span>
        </div>
      </footer>
    </div>
  );
}
