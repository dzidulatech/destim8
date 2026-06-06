import { useState, useEffect, CSSProperties } from 'react';
import { Home, Calculator, Settings, Code, Sparkles, HardHat, Calendar, Sun, Moon, Palette, Receipt, LogOut, Cloud } from 'lucide-react';
import { Estimate, BaselinesType, BusinessProfile, TradeKey, EstimateStatus, Client, PaymentReceipt } from './types';
import { INITIAL_BASELINES, INITIAL_BIZ_PROFILE } from './config';
import HomeView from './components/HomeView';
import EstimatorView from './components/EstimatorView';
import SettingsView from './components/SettingsView';
import FeaturesView from './components/FeaturesView';
import ReceiptsView from './components/ReceiptsView';
import LoginView from './components/LoginView';
import { auth, db, signOut, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

const THEME_PRESETS = [
  { id: 'blue', name: '🔵 Steel Blue', category: 'Default' },
  { id: 'emerald', name: '🟢 Emerald Forest', category: 'Default' },
  { id: 'amber', name: '🟡 Amber Gold', category: 'Vibrant' },
  { id: 'terracotta', name: '🟠 Terracotta Dust', category: 'Vibrant' },
  { id: 'charcoal', name: '⚫ Charcoal Tech', category: 'Minimalist' },
  { id: 'slate', name: '🌑 Minimalist Slate', category: 'Minimalist' }
];

const THEME_COLOR_MAP: Record<string, {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryBorder: string;
  accentText: string;
  accentRing: string;
}> = {
  blue: {
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    primaryLight: '#eff6ff',
    primaryBorder: '#bfdbfe',
    accentText: '#1e40af',
    accentRing: 'rgba(37, 99, 235, 0.15)'
  },
  emerald: {
    primary: '#059669',
    primaryHover: '#047857',
    primaryLight: '#ecfdf5',
    primaryBorder: '#a7f3d0',
    accentText: '#065f46',
    accentRing: 'rgba(5, 150, 105, 0.15)'
  },
  amber: {
    primary: '#d97706',
    primaryHover: '#b45309',
    primaryLight: '#fffbeb',
    primaryBorder: '#fde68a',
    accentText: '#92400e',
    accentRing: 'rgba(217, 119, 6, 0.15)'
  },
  terracotta: {
    primary: '#ea580c',
    primaryHover: '#c2410c',
    primaryLight: '#fff7ed',
    primaryBorder: '#fed7aa',
    accentText: '#9a3412',
    accentRing: 'rgba(234, 88, 12, 0.15)'
  },
  charcoal: {
    primary: '#4b5563',
    primaryHover: '#374151',
    primaryLight: '#f3f4f6',
    primaryBorder: '#e5e7eb',
    accentText: '#1f2937',
    accentRing: 'rgba(75, 85, 99, 0.15)'
  },
  slate: {
    primary: '#0f172a',
    primaryHover: '#1e293b',
    primaryLight: '#f8fafc',
    primaryBorder: '#cbd5e1',
    accentText: '#334155',
    accentRing: 'rgba(15, 23, 42, 0.1)'
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'estimate' | 'settings' | 'features' | 'receipts'>('home');
  const [recentEstimates, setRecentEstimates] = useState<Estimate[]>([]);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(INITIAL_BIZ_PROFILE);
  const [baselines, setBaselines] = useState<BaselinesType>(INITIAL_BASELINES);
  const [activeEstimate, setActiveEstimate] = useState<Estimate | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<PaymentReceipt[]>([]);

  // Auth States
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);

  const [tradeJobs, setTradeJobs] = useState<Record<string, Record<string, string>>>(() => {
    try {
      const saved = localStorage.getItem('estim8_trade_jobs');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return {
      pop: { full: "Full POP Ceiling", cornice: "Cornice & Plastering", skim: "Skimming" },
      tiling: { floor: "Floor Tiling", wall: "Wall Tiling" },
      painting: { interior: "Interior Painting", exterior: "Exterior Painting", decorative: "Decorative/Textured" }
    };
  });

  // Sync tradeJobs to local storage when changed
  useEffect(() => {
    localStorage.setItem('estim8_trade_jobs', JSON.stringify(tradeJobs));
  }, [tradeJobs]);

  const [tradeLabels, setTradeLabels] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('estim8_trade_labels');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return {
      pop: "POP Ceiling",
      tiling: "Tiling Finish",
      painting: "Painting"
    };
  });

  // Sync tradeLabels to local storage when changed
  useEffect(() => {
    localStorage.setItem('estim8_trade_labels', JSON.stringify(tradeLabels));
  }, [tradeLabels]);

  // Synchronous theme & dark states
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('estim8_theme') || 'blue');
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const d = localStorage.getItem('estim8_dark');
      return d ? JSON.parse(d) : false;
    } catch {
      return false;
    }
  });

  // Sync dark class on document root
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Cloud Sync Loop driven by user active account state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setAuthLoading(true);
        setSyncing(true);
        try {
          const uid = u.uid;

          // 1. Business Profile Sync
          const profileRef = doc(db, 'users', uid, 'profile', 'business');
          const profileSnap = await getDoc(profileRef).catch(e => handleFirestoreError(e, OperationType.GET, `users/${uid}/profile/business`));
          let resolvedProfile: BusinessProfile = INITIAL_BIZ_PROFILE;
          if (profileSnap && profileSnap.exists()) {
            resolvedProfile = profileSnap.data() as BusinessProfile;
            setBusinessProfile(resolvedProfile);
          } else {
            const localRaw = localStorage.getItem('estim8_profile');
            const localParsed = localRaw ? JSON.parse(localRaw) : INITIAL_BIZ_PROFILE;
            resolvedProfile = { ...INITIAL_BIZ_PROFILE, ...localParsed };
            await setDoc(profileRef, { ...resolvedProfile, ownerId: uid })
              .catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${uid}/profile/business`));
            setBusinessProfile(resolvedProfile);
          }

          // 2. Baselines Sync
          const baselinesRef = doc(db, 'users', uid, 'baselines', 'config');
          const baselinesSnap = await getDoc(baselinesRef).catch(e => handleFirestoreError(e, OperationType.GET, `users/${uid}/baselines/config`));
          if (baselinesSnap && baselinesSnap.exists()) {
            const dataBase = baselinesSnap.data() as any;
            setBaselines(dataBase.data);
          } else {
            const localRaw = localStorage.getItem('estim8_baselines');
            const localParsed = localRaw ? JSON.parse(localRaw) : INITIAL_BASELINES;
            await setDoc(baselinesRef, { data: localParsed, ownerId: uid })
              .catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${uid}/baselines/config`));
            setBaselines(localParsed);
          }

          // 3. Trade Config Sync
          const tradeRef = doc(db, 'users', uid, 'tradeConfig', 'data');
          const tradeSnap = await getDoc(tradeRef).catch(e => handleFirestoreError(e, OperationType.GET, `users/${uid}/tradeConfig/data`));
          if (tradeSnap && tradeSnap.exists()) {
            const tData = tradeSnap.data() as any;
            if (tData.tradeJobs) setTradeJobs(tData.tradeJobs);
            if (tData.tradeLabels) setTradeLabels(tData.tradeLabels);
          } else {
            await setDoc(tradeRef, { tradeJobs, tradeLabels, ownerId: uid })
              .catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${uid}/tradeConfig/data`));
          }

          // 4. Estimates Sync
          const estCol = collection(db, 'users', uid, 'estimates');
          const estSnap = await getDocs(estCol).catch(e => handleFirestoreError(e, OperationType.GET, `users/${uid}/estimates`));
          let dbEstimates: Estimate[] = [];
          if (estSnap && !estSnap.empty) {
            dbEstimates = estSnap.docs.map(doc => doc.data() as Estimate).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setRecentEstimates(dbEstimates);
          } else {
            const localRaw = localStorage.getItem('estim8_recent');
            const localParsed: Estimate[] = localRaw ? JSON.parse(localRaw) : [];
            if (localParsed.length > 0) {
              for (const est of localParsed) {
                await setDoc(doc(db, 'users', uid, 'estimates', est.id), { ...est, ownerId: uid })
                  .catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${uid}/estimates/${est.id}`));
              }
              setRecentEstimates(localParsed);
            } else {
              const defaults: Estimate[] = [
                {
                  id: "E8-20260603-0001",
                  clientName: "Ama Mensah",
                  projectName: "Living Room Renovation",
                  jobLocation: "Airport Residential, Accra",
                  trade: "tiling",
                  jobType: "floor",
                  unitType: "sqm",
                  laborRate: 60,
                  wastePercent: 5,
                  transportFee: 150,
                  linearMeters: 100,
                  rooms: [
                    { id: "r1", name: "Living Room", l: 600, w: 500 },
                    { id: "r2", name: "Hallway", l: 400, w: 200 }
                  ],
                  createdAt: new Date("2026-06-03T10:30:00Z").toISOString(),
                  materialTotal: 8400,
                  laborTotal: 2280,
                  grandTotal: 10830,
                  status: "Accepted"
                },
                {
                  id: "E8-20260603-0002",
                  clientName: "Kwame Boateng",
                  projectName: "Full Gypsum Ceilings",
                  jobLocation: "Osu, Accra",
                  trade: "pop",
                  jobType: "full",
                  unitType: "sqm",
                  laborRate: 45,
                  wastePercent: 5,
                  transportFee: 300,
                  linearMeters: 100,
                  rooms: [
                    { id: "r1", name: "Master Suite", l: 500, w: 450 },
                    { id: "r2", name: "Dining Hall", l: 400, w: 400 }
                  ],
                  createdAt: new Date("2026-06-03T14:15:00Z").toISOString(),
                  materialTotal: 9800,
                  laborTotal: 1732.5,
                  grandTotal: 11832.5,
                  status: "Draft"
                }
              ];
              for (const est of defaults) {
                await setDoc(doc(db, 'users', uid, 'estimates', est.id), { ...est, ownerId: uid })
                  .catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${uid}/estimates/${est.id}`));
              }
              setRecentEstimates(defaults);
            }
          }

          // 5. Clients Sync
          const clientCol = collection(db, 'users', uid, 'clients');
          const clientSnap = await getDocs(clientCol).catch(e => handleFirestoreError(e, OperationType.GET, `users/${uid}/clients`));
          if (clientSnap && !clientSnap.empty) {
            const dbClients = clientSnap.docs.map(doc => doc.data() as Client);
            setClients(dbClients);
          } else {
            const localRaw = localStorage.getItem('estim8_clients');
            const localParsed: Client[] = localRaw ? JSON.parse(localRaw) : [];
            if (localParsed.length > 0) {
              for (const cl of localParsed) {
                await setDoc(doc(db, 'users', uid, 'clients', cl.id), { ...cl, ownerId: uid })
                  .catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${uid}/clients/${cl.id}`));
              }
              setClients(localParsed);
            } else {
              const defaults: Client[] = [
                {
                  id: "C-1",
                  name: "Ama Mensah",
                  phone: "+233 24 456 7890",
                  defaultLocation: "Airport Residential, Accra",
                  projectHistory: [
                    {
                      estimateId: "E8-20260603-0001",
                      projectName: "Living Room Renovation",
                      date: new Date("2026-06-03T10:30:00Z").toISOString(),
                      total: 10830
                    }
                  ]
                },
                {
                  id: "C-2",
                  name: "Kwame Boateng",
                  phone: "+233 20 888 1234",
                  defaultLocation: "Osu, Accra",
                  projectHistory: [
                    {
                      estimateId: "E8-20260603-0002",
                      projectName: "Full Gypsum Ceilings",
                      date: new Date("2026-06-03T14:15:00Z").toISOString(),
                      total: 11832.5
                    }
                  ]
                }
              ];
              for (const cl of defaults) {
                await setDoc(doc(db, 'users', uid, 'clients', cl.id), { ...cl, ownerId: uid })
                  .catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${uid}/clients/${cl.id}`));
              }
              setClients(defaults);
            }
          }

          // 6. Payments Sync
          const payCol = collection(db, 'users', uid, 'payments');
          const paySnap = await getDocs(payCol).catch(e => handleFirestoreError(e, OperationType.GET, `users/${uid}/payments`));
          if (paySnap && !paySnap.empty) {
            const dbPayments = paySnap.docs.map(doc => doc.data() as PaymentReceipt);
            setPayments(dbPayments);
          } else {
            const localRaw = localStorage.getItem('estim8_payments');
            const localParsed: PaymentReceipt[] = localRaw ? JSON.parse(localRaw) : [];
            if (localParsed.length > 0) {
              for (const p of localParsed) {
                await setDoc(doc(db, 'users', uid, 'payments', p.id), { ...p, ownerId: uid })
                  .catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${uid}/payments/${p.id}`));
              }
              setPayments(localParsed);
            } else {
              const defaults: PaymentReceipt[] = [
                {
                  id: "RCP-20260603-0518",
                  estimateId: "E8-20260603-0001",
                  clientName: "Ama Mensah",
                  clientPhone: "+233 24 456 7890",
                  projectName: "Living Room Renovation (Tiling)",
                  amountPaid: 7500,
                  paymentMethod: "Mobile Money",
                  paymentDate: "2026-06-03",
                  transactionRef: "MTN-884920199",
                  receivedBy: resolvedProfile.name || "DzidEstimator Operator",
                  notes: "70% mobilization deposit advanced prior to tile purchase.",
                  totalEstimateAmount: 10830
                },
                {
                  id: "RCP-20260604-0912",
                  estimateId: "E8-20260603-0002",
                  clientName: "Kwame Boateng",
                  clientPhone: "+233 20 888 1234",
                  projectName: "Full Gypsum Ceilings (POP)",
                  amountPaid: 5000,
                  paymentMethod: "Bank Transfer",
                  paymentDate: "2026-06-04",
                  transactionRef: "FT-BB-002891",
                  receivedBy: resolvedProfile.name || "DzidEstimator Operator",
                  notes: "Initial advance for scaffolding and materials logistics.",
                  totalEstimateAmount: 11832.5
                }
              ];
              for (const p of defaults) {
                await setDoc(doc(db, 'users', uid, 'payments', p.id), { ...p, ownerId: uid })
                  .catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${uid}/payments/${p.id}`));
              }
              setPayments(defaults);
            }
          }
        } catch (err) {
          console.error("Cloud synchronization mapped fails:", err);
        } finally {
          setSyncing(false);
          setAuthLoading(false);
        }
      } else {
        setUser(null);
        setAuthLoading(false);
        setSyncing(false);
      }
    });

    return () => unsubscribe();
  }, [tradeJobs, tradeLabels]);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('estim8_theme', newTheme);
  };

  const handleDarkToggle = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    localStorage.setItem('estim8_dark', JSON.stringify(nextDark));
  };

  // Save changes helper functions
  const saveEstimatesToStorage = async (updated: Estimate[]) => {
    setRecentEstimates(updated);
    localStorage.setItem('estim8_recent', JSON.stringify(updated));
  };

  const handleUpdateClients = async (updatedList: Client[]) => {
    setClients(updatedList);
    localStorage.setItem('estim8_clients', JSON.stringify(updatedList));
  };

  const handleUpdatePayments = async (updatedList: PaymentReceipt[]) => {
    setPayments(updatedList);
    localStorage.setItem('estim8_payments', JSON.stringify(updatedList));
    if (user) {
      for (const p of updatedList) {
        await setDoc(doc(db, 'users', user.uid, 'payments', p.id), { ...p, ownerId: user.uid })
          .catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/payments/${p.id}`));
      }
    }
  };

  const handleSaveEstimate = async (estimate: Estimate, clientPhone?: string) => {
    const existsIdx = recentEstimates.findIndex(e => e.id === estimate.id);
    let updated: Estimate[];
    
    if (existsIdx > -1) {
      updated = [...recentEstimates];
      updated[existsIdx] = estimate;
    } else {
      updated = [estimate, ...recentEstimates];
    }
    
    await saveEstimatesToStorage(updated);
    setActiveEstimate(estimate); // set edited file

    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'estimates', estimate.id), { ...estimate, ownerId: user.uid })
        .catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/estimates/${estimate.id}`));
    }

    // Sync client database with latest estimate save details
    if (estimate.clientName && estimate.clientName.trim()) {
      const trimmedName = estimate.clientName.trim();
      const clientIndex = clients.findIndex(c => c.name.toLowerCase() === trimmedName.toLowerCase());
      
      const newHistoryItem = {
        estimateId: estimate.id,
        projectName: estimate.projectName || 'General Service Rendering',
        date: estimate.createdAt || new Date().toISOString(),
        total: estimate.grandTotal
      };

      let updatedClients = [...clients];
      let targetClient: Client;

      if (clientIndex > -1) {
        const existing = updatedClients[clientIndex];
        const updatedPhone = clientPhone?.trim() || existing.phone;
        
        let existingHistory = [...existing.projectHistory];
        const histIdx = existingHistory.findIndex(h => h.estimateId === estimate.id);
        
        if (histIdx > -1) {
          existingHistory[histIdx] = newHistoryItem;
        } else {
          existingHistory = [newHistoryItem, ...existingHistory];
        }

        targetClient = {
          ...existing,
          phone: updatedPhone,
          defaultLocation: estimate.jobLocation || existing.defaultLocation,
          projectHistory: existingHistory
        };
        updatedClients[clientIndex] = targetClient;
      } else {
        targetClient = {
          id: `C-${Date.now().toString().slice(-6)}`,
          name: trimmedName,
          phone: clientPhone?.trim() || '',
          defaultLocation: estimate.jobLocation || '',
          projectHistory: [newHistoryItem]
        };
        updatedClients = [targetClient, ...updatedClients];
      }

      await handleUpdateClients(updatedClients);
      if (user) {
        await setDoc(doc(db, 'users', user.uid, 'clients', targetClient.id), { ...targetClient, ownerId: user.uid })
          .catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/clients/${targetClient.id}`));
      }
    }
  };

  const handleDeleteEstimate = async (id: string) => {
    const filtered = recentEstimates.filter(e => e.id !== id);
    await saveEstimatesToStorage(filtered);
    if (activeEstimate?.id === id) {
      setActiveEstimate(null);
    }
    if (user) {
      await deleteDoc(doc(db, 'users', user.uid, 'estimates', id))
        .catch(e => handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/estimates/${id}`));
    }
  };

  const handleUpdateEstimateStatus = async (id: string, status: EstimateStatus) => {
    const target = recentEstimates.find(e => e.id === id);
    if (target && status === 'Accepted' && !target.sealed) {
      const updatedTarget: Estimate = { ...target, status: 'Accepted' };
      const updated = recentEstimates.map(e => e.id === id ? updatedTarget : e);
      await saveEstimatesToStorage(updated);
      setActiveEstimate(updatedTarget);
      setActiveTab('estimate');
      if (user) {
        await setDoc(doc(db, 'users', user.uid, 'estimates', id), { ...updatedTarget, ownerId: user.uid })
          .catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/estimates/${id}`));
      }
      return;
    }

    const updated = recentEstimates.map(e => e.id === id ? { ...e, status } : e);
    await saveEstimatesToStorage(updated);
    const nextEst = target ? { ...target, status } : null;
    if (activeEstimate?.id === id && nextEst) {
      setActiveEstimate(nextEst);
    }
    if (user && nextEst) {
      await setDoc(doc(db, 'users', user.uid, 'estimates', id), { ...nextEst, ownerId: user.uid })
        .catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/estimates/${id}`));
    }
  };

  const handleSelectEstimate = (estimate: Estimate) => {
    setActiveEstimate(estimate);
    setActiveTab('estimate');
  };

  const handleStartEstimate = (tradeKey?: TradeKey) => {
    if (tradeKey) {
      // Create skeleton estimate with specified trade key
      const skeleton: Estimate = {
        id: `E8-${Date.now().toString().slice(-6)}`,
        clientName: '',
        projectName: '',
        jobLocation: '',
        trade: tradeKey,
        jobType: tradeKey === 'pop' ? 'full' : tradeKey === 'tiling' ? 'floor' : 'interior',
        unitType: (tradeKey === 'pop') ? 'sqm' : 'sqm',
        laborRate: tradeKey === 'pop' ? 45 : tradeKey === 'tiling' ? 60 : 20,
        wastePercent: 5,
        transportFee: 0,
        linearMeters: 100,
        rooms: [{ id: 'r1', name: 'Living Room', l: 400, w: 400 }],
        createdAt: new Date().toISOString(),
        grandTotal: 0,
        materialTotal: 0,
        laborTotal: 0,
        status: 'Draft'
      };
      setActiveEstimate(skeleton);
    } else {
      setActiveEstimate(null); // start perfectly clean
    }
    setActiveTab('estimate');
  };

  const handleProfileChange = async (profile: BusinessProfile) => {
    setBusinessProfile(profile);
    localStorage.setItem('estim8_profile', JSON.stringify(profile));
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'profile', 'business'), { ...profile, ownerId: user.uid })
        .catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/profile/business`));
    }
  };

  const handleBaselinesChange = async (updatedBaselines: BaselinesType) => {
    setBaselines(updatedBaselines);
    localStorage.setItem('estim8_baselines', JSON.stringify(updatedBaselines));
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'baselines', 'config'), { data: updatedBaselines, ownerId: user.uid })
        .catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/baselines/config`));
    }
  };

  // Compile active theme variables
  const preset = THEME_COLOR_MAP[theme] || THEME_COLOR_MAP.blue;

  // Custom adaptation for minimalist themes in dark mode to guarantee high visual contrast
  const isMinimalist = theme === 'charcoal' || theme === 'slate';
  const primaryColor = isDark 
    ? (isMinimalist ? '#e2e8f0' : preset.primary)
    : preset.primary;
  const primaryHoverColor = isDark
    ? (isMinimalist ? '#ffffff' : preset.primaryHover)
    : preset.primaryHover;

  const styleVars = {
    '--primary': primaryColor,
    '--primary-hover': primaryHoverColor,
    '--primary-light': isDark ? '#1a2235' : preset.primaryLight,
    '--primary-border': isDark ? '#2a354b' : preset.primaryBorder,
    '--accent-text': isDark ? '#f1f5f9' : preset.accentText,
    '--accent-ring': preset.accentRing,

    '--bg-canvas': isDark ? '#0b0f19' : '#f8fafc',
    '--bg-card': isDark ? '#151f32' : '#ffffff',
    '--bg-panel': isDark ? '#1e293e' : '#f1f5f9',
    '--bg-input': isDark ? '#0b0f19' : '#ffffff',
    '--border-card': isDark ? '#22314d' : '#e2e8f0',
    '--text-main': isDark ? '#f1f5f9' : '#0f172a',
    '--text-muted': isDark ? '#94a3b8' : '#64748b',
  } as CSSProperties;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center space-y-4 font-sans text-slate-100">
        <div className="h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-semibold animate-pulse">Establishing Secure Database Sync...</p>
      </div>
    );
  }

  if (user === null || !user) {
    return <LoginView onSignInSuccess={() => {}} />;
  }

  return (
    <div 
      className={`min-h-screen max-w-full overflow-x-hidden bg-bg-canvas text-text-main flex flex-col antialiased ${isDark ? 'dark' : ''}`} 
      style={styleVars}
      id="applet-root"
    >
      {/* Visual Navigation Header */}
      <header className="sticky top-0 z-40 bg-bg-card border-b border-border-card shadow-xs max-w-full overflow-x-hidden" id="app-nav-header">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2.5 cursor-pointer min-w-0" onClick={() => setActiveTab('home')}>
            <span className="h-10 w-10 rounded-xl bg-primary text-white font-extrabold flex items-center justify-center shadow-md shadow-primary/10 shrink-0">
              DE
            </span>
            <div className="min-w-0">
              <span className="font-extrabold text-text-main text-sm sm:text-base flex items-center gap-1 leading-none">
                <span className="truncate max-w-[95px] sm:max-w-none">DzidEstimator</span>
                <span className="text-[9px] font-bold bg-bg-panel text-text-muted px-1.5 py-0.5 rounded-sm uppercase tracking-wider hidden sm:inline">Trades</span>
              </span>
              <p className="text-[10px] text-text-muted font-semibold mt-0.5 truncate max-w-[85px] sm:max-w-[180px]">{businessProfile.name}</p>
            </div>
          </div>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center gap-1" id="desktop-tabs-nav">
            {[
              { id: 'home' as const, label: 'Dashboard', icon: Home },
              { id: 'estimate' as const, label: 'Calculator', icon: Calculator },
              { id: 'receipts' as const, label: 'Payments & Receipts', icon: Receipt },
              { id: 'settings' as const, label: 'Formula Baselines', icon: Settings },
              { id: 'features' as const, label: 'Features Matrix', icon: Code },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-primary text-white shadow-xs font-extrabold scale-102' 
                      : 'text-text-muted hover:text-text-main hover:bg-bg-panel/70'
                  }`}
                  id={`nav-link-${tab.id}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Theme customizers in Header */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0" id="theme-selectors-header">
            {/* Cloud Sync State Display */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-bg-panel border border-border-card rounded-xl text-[10px] font-bold text-text-muted select-none">
              {syncing ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <Cloud className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="text-emerald-500">Cloud Connected</span>
                </>
              )}
            </div>

            {/* User Profile Info & Logout */}
            <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 sm:py-1.5 bg-bg-panel border border-border-card rounded-xl">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || "Operator"} 
                  className="h-4.5 w-4.5 rounded-full shrink-0 border border-emerald-500/10" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <span className="h-4.5 w-4.5 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center shrink-0">
                  {user.displayName?.slice(0, 1) || "U"}
                </span>
              )}
              <span className="text-[10px] font-bold text-text-muted hidden sm:inline max-w-[70px] truncate leading-none">
                {user.displayName?.split(" ")[0] || "Operator"}
              </span>
              <button 
                onClick={async () => {
                  try {
                    await signOut(auth);
                  } catch (err) {
                    console.error("Sign out fail:", err);
                  }
                }}
                className="p-1 cursor-pointer hover:bg-bg-card hover:text-red-400 text-text-muted rounded-md transition-all flex items-center justify-center shrink-0 border-none bg-transparent"
                title="Log Out of Cloud"
                id="btn-cloud-logout"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Palette selection dropmenu - Hidden on mobile/tablets, access in Settings view */}
            <div className="hidden lg:inline-flex items-center gap-1.5 bg-bg-panel text-text-main border border-border-card rounded-xl px-2.5 py-1.5">
              <Palette className="h-3.5 w-3.5 text-primary shrink-0" />
              <select
                value={theme}
                onChange={(e) => handleThemeChange(e.target.value)}
                className="bg-transparent text-xs font-black focus:outline-hidden cursor-pointer text-text-main pr-1"
                title="Select Theme Color Palette"
              >
                {THEME_PRESETS.map(p => (
                  <option key={p.id} value={p.id} className="text-neutral-800 bg-white">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Dark switch */}
            <button
              onClick={handleDarkToggle}
              className="p-1.5 sm:p-2 cursor-pointer bg-bg-panel hover:bg-border-card text-text-main border border-border-card rounded-xl transition-all flex items-center justify-center shrink-0"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-indigo-500" />
              )}
            </button>

            {/* Existing Calendar box */}
            <div className="hidden lg:flex items-center gap-2 text-xs font-bold text-text-muted bg-bg-panel border border-border-card rounded-xl px-3 py-2">
              <Calendar className="h-3.5 w-3.5 text-text-muted shrink-0" />
              <span>June 3, 2026</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8" id="app-main-content">
        {activeTab === 'home' && (
          <HomeView
            recentEstimates={recentEstimates}
            onSelectEstimate={handleSelectEstimate}
            onDeleteEstimate={handleDeleteEstimate}
            onStartEstimate={handleStartEstimate}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            tradeJobs={tradeJobs}
            onUpdateEstimateStatus={handleUpdateEstimateStatus}
            baselines={baselines}
            businessProfile={businessProfile}
            tradeLabels={tradeLabels}
            onUpdateTradeLabels={setTradeLabels}
            clients={clients}
            onUpdateClients={handleUpdateClients}
          />
        )}

        {activeTab === 'estimate' && (
          <EstimatorView
            baselines={baselines}
            businessProfile={businessProfile}
            onSaveEstimate={handleSaveEstimate}
            activeEstimate={activeEstimate}
            onClearActiveEstimate={() => setActiveEstimate(null)}
            tradeJobs={tradeJobs}
            tradeLabels={tradeLabels}
            clients={clients}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            businessProfile={businessProfile}
            onChangeProfile={handleProfileChange}
            baselines={baselines}
            onUpdateBaselines={handleBaselinesChange}
            tradeJobs={tradeJobs}
            onUpdateTradeJobs={setTradeJobs}
            tradeLabels={tradeLabels}
            onUpdateTradeLabels={setTradeLabels}
            theme={theme}
            onThemeChange={handleThemeChange}
            isDark={isDark}
            onDarkToggle={handleDarkToggle}
          />
        )}

        {activeTab === 'features' && (
          <FeaturesView />
        )}

        {activeTab === 'receipts' && (
          <ReceiptsView
            recentEstimates={recentEstimates}
            clients={clients}
            businessProfile={businessProfile}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            activeEstimate={activeEstimate}
            onClearActiveEstimate={() => setActiveEstimate(null)}
            onUpdateEstimates={saveEstimatesToStorage}
            payments={payments}
            onUpdatePayments={handleUpdatePayments}
          />
        )}
      </main>

      {/* Mobile Sticky Tab Navigation */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-bg-card border-t border-border-card z-40 px-4 py-2 flex items-center justify-around shadow-lg" id="app-nav-footer-mobile">
        {[
          { id: 'home' as const, label: 'Dashboard', icon: Home },
          { id: 'estimate' as const, label: 'Calculator', icon: Calculator },
          { id: 'receipts' as const, label: 'Receipts', icon: Receipt },
          { id: 'settings' as const, label: 'Baselines', icon: Settings },
          { id: 'features' as const, label: 'Capability', icon: Code },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 p-2 text-[10px] font-bold transition-all ${
                isSelected ? 'text-primary font-extrabold scale-102' : 'text-text-muted hover:text-text-main'
              }`}
              id={`mobile-nav-link-${tab.id}`}
            >
              <Icon className="h-4.5 w-4.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Footer Branding */}
      <footer className="bg-bg-card border-t border-border-card py-6 mb-12 md:mb-0" id="app-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-text-muted font-medium">
          <p>© 2026 DzidEstimator. All rights reserved.</p>
          <div className="flex gap-4">
            <span>POP Ceiling</span>
            <span>Tiling Crafts</span>
            <span>Professional Paint finishing</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
