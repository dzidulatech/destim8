import React, { useState } from 'react';
import { Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

interface LoginViewProps {
  onSignInSuccess: () => void;
}

export default function LoginView({ onSignInSuccess }: LoginViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

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
              <div className="p-4 bg-red-950/40 border border-red-900/50 rounded-2xl text-[11px] text-red-300 font-medium text-left animate-shake space-y-2">
                <p className="font-bold text-red-200">⚠️ Authentication Error</p>
                <p className="leading-relaxed">{error}</p>
              </div>
            )}

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
                    className="w-full h-11 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-[#0ea5e9] focus:ring-1 focus:ring-sky-500/50 focus:border-sky-500 transition-colors"
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
                    className="w-full h-11 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-[#0ea5e9] focus:ring-1 focus:ring-sky-500/50 focus:border-sky-500 transition-colors"
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
