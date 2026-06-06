import { useState, useEffect, FormEvent, ChangeEvent, DragEvent } from 'react';
import { Save, HelpCircle, FileText, CheckCircle2, ChevronRight, Settings, Info, Building, MapPin, Phone, MessageSquare, Trash2, Plus, PlusCircle, Image, Upload, Coins, Download, Database, Palette, Check, Sun, Moon } from 'lucide-react';
import { TradeKey, BaselinesType, BusinessProfile } from '../types';
import { TRADE_CONFIG } from '../config';
import { SUPPORTED_CURRENCIES } from '../currency';

interface SettingsViewProps {
  businessProfile: BusinessProfile;
  onChangeProfile: (profile: BusinessProfile) => void;
  baselines: BaselinesType;
  onUpdateBaselines: (baselines: BaselinesType) => void;
  tradeJobs: Record<string, Record<string, string>>;
  onUpdateTradeJobs: (jobs: Record<string, Record<string, string>>) => void;
  tradeLabels: Record<string, string>;
  onUpdateTradeLabels: (labels: Record<string, string>) => void;
  theme: string;
  onThemeChange: (theme: string) => void;
  isDark: boolean;
  onDarkToggle: () => void;
}

export default function SettingsView({
  businessProfile,
  onChangeProfile,
  baselines,
  onUpdateBaselines,
  tradeJobs,
  onUpdateTradeJobs,
  tradeLabels,
  onUpdateTradeLabels,
  theme,
  onThemeChange,
  isDark,
  onDarkToggle
}: SettingsViewProps) {
  // Local profile states
  const [bizName, setBizName] = useState(businessProfile.name);
  const [bizLocation, setBizLocation] = useState(businessProfile.location);
  const [bizPhone, setBizPhone] = useState(businessProfile.phone);
  const [bizSlogan, setBizSlogan] = useState(businessProfile.slogan);
  const [bizTerms, setBizTerms] = useState(businessProfile.termsAndConditions || '');
  const [bizLogo, setBizLogo] = useState(businessProfile.logo || '');
  const [bizCurrency, setBizCurrency] = useState<string>(businessProfile.currency || 'GHS');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Please select an image smaller than 2MB to keep the profile lightweight.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setBizLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type.indexOf("image/") === -1) {
        alert("Please drop a valid image file.");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert("Please select an image smaller than 2MB to keep the profile lightweight.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setBizLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExportBackup = () => {
    try {
      const estimatesObjStr = localStorage.getItem('estim8_recent');
      const estimates = estimatesObjStr ? JSON.parse(estimatesObjStr) : [];
      
      const clientsObjStr = localStorage.getItem('estim8_clients');
      const clients = clientsObjStr ? JSON.parse(clientsObjStr) : [];
      
      const profile = businessProfile;
      const savedBaselines = baselines;
      const trade_jobs = tradeJobs;
      const trade_labels = tradeLabels;
      
      const paymentsObjStr = localStorage.getItem('estim8_payments');
      const payments = paymentsObjStr ? JSON.parse(paymentsObjStr) : [];
      
      const backupData = {
        app: "DzidEstimator",
        exportDate: new Date().toISOString(),
        data: {
          estimates,
          clients,
          profile,
          baselines: savedBaselines,
          tradeJobs: trade_jobs,
          tradeLabels: trade_labels,
          payments
        }
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      const currentDate = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `dzidestimator_backup_${currentDate}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to generate backup export", e);
      alert("An error occurred while creating your application backup file.");
    }
  };

  const handleImportBackup = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed || (parsed.app !== "DzidEstimator" && parsed.app !== "Estim8") || !parsed.data) {
          alert("Invalid backup file! The uploaded JSON must be an authentic backup file generated by DzidEstimator.");
          return;
        }

        const confirmRestore = confirm(
          "🚨 WARNING 🚨\n\nRestoring this backup file will completely overwrite your existing records (Estimates, Clients, Branding Profiles, Baseline Formulas, and Payment Receipts/Invoices).\n\nDo you want to proceed?"
        );

        if (!confirmRestore) {
          e.target.value = '';
          return;
        }

        const data = parsed.data;

        if (data.estimates) localStorage.setItem('estim8_recent', JSON.stringify(data.estimates));
        if (data.clients) localStorage.setItem('estim8_clients', JSON.stringify(data.clients));
        if (data.profile) localStorage.setItem('estim8_profile', JSON.stringify(data.profile));
        if (data.baselines) localStorage.setItem('estim8_baselines', JSON.stringify(data.baselines));
        if (data.tradeJobs) localStorage.setItem('estim8_trade_jobs', JSON.stringify(data.tradeJobs));
        if (data.tradeLabels) localStorage.setItem('estim8_trade_labels', JSON.stringify(data.tradeLabels));
        if (data.payments) localStorage.setItem('estim8_payments', JSON.stringify(data.payments));

        alert("🎉 Backup Restored Successfully!\n\nThe configuration and workspaces have been updated. The application will now reload to apply the data.");
        window.location.reload();
      } catch (err) {
        console.error("Failed to parse backup file", err);
        alert("Failed to parse backup JSON. Please check if the file is corrupted.");
      }
    };

    reader.readAsText(file);
  };

  // Active settings trade
  const [activeTrade, setActiveTrade] = useState<TradeKey>('pop');
  
  // Local copy of baselines to edit
  const [localBaselines, setLocalBaselines] = useState<BaselinesType>(JSON.parse(JSON.stringify(baselines)));

  // Add material form states
  const [newMatName, setNewMatName] = useState('');
  const [newMatUnit, setNewMatUnit] = useState('Bags');
  const [newMatPrice, setNewMatPrice] = useState<number>(0);
  const [newMatQtys, setNewMatQtys] = useState<Record<string, number>>({});

  // Add job type form states
  const [newJobName, setNewJobName] = useState('');

  // Add new trade form states
  const [newTradeName, setNewTradeName] = useState('');
  const [newTradeJobName, setNewTradeJobName] = useState('');

  const handleAddNewTrade = (e: FormEvent) => {
    e.preventDefault();
    const nameTrimmed = newTradeName.trim();
    const jobTrimmed = newTradeJobName.trim() || 'General Specialty';
    
    if (!nameTrimmed) {
      alert("Please enter a valid Trade Category Name.");
      return;
    }

    const tradeKey = nameTrimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    if (tradeLabels[tradeKey] || tradeJobs[tradeKey]) {
      alert(`The trade category "${nameTrimmed}" already exists!`);
      return;
    }

    const jobKey = jobTrimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_');

    // 1. Update trade labels
    const updatedLabels = {
      ...tradeLabels,
      [tradeKey]: nameTrimmed
    };
    onUpdateTradeLabels(updatedLabels);

    // 2. Update trade jobs
    const updatedJobs = {
      ...tradeJobs,
      [tradeKey]: {
        [jobKey]: jobTrimmed
      }
    };
    onUpdateTradeJobs(updatedJobs);

    // 3. Update baselines
    const updatedBaselines = {
      ...localBaselines,
      [tradeKey]: {
        [jobKey]: {
          "General Logistics": { qty: 1, price: 100, unit: "Session", fixed: true }
        }
      }
    };
    setLocalBaselines(updatedBaselines);
    onUpdateBaselines(updatedBaselines);

    // 4. Update state selection
    setActiveTrade(tradeKey);
    setNewTradeName('');
    setNewTradeJobName('');

    alert(`Successfully created dynamic trade "${nameTrimmed}" with initial specialty "${jobTrimmed}"! You can now customize materials list and baseline pricing in the table above.`);
  };

  // Sync state if prop changes
  useEffect(() => {
    setLocalBaselines(JSON.parse(JSON.stringify(baselines)));
  }, [baselines]);

  useEffect(() => {
    setBizName(businessProfile.name);
    setBizLocation(businessProfile.location);
    setBizPhone(businessProfile.phone);
    setBizSlogan(businessProfile.slogan);
    setBizTerms(businessProfile.termsAndConditions || '');
    setBizLogo(businessProfile.logo || '');
    setBizCurrency(businessProfile.currency || 'GHS');
  }, [businessProfile]);

  const handleProfileSave = () => {
    onChangeProfile({
      name: bizName,
      location: bizLocation,
      phone: bizPhone,
      slogan: bizSlogan,
      termsAndConditions: bizTerms,
      logo: bizLogo,
      currency: bizCurrency
    });
    alert("Business Profile updated successfully!");
  };

  const handleBaselineChange = (
    tradeKey: TradeKey, 
    jobKey: string, 
    materialName: string, 
    field: 'price' | 'qty', 
    value: number
  ) => {
    const updated = { ...localBaselines };
    
    // In original code: updating price updates it across all jobs for that trade, 
    // to keep it consistent
    if (field === 'price') {
      const jobKeys = Object.keys(tradeJobs[tradeKey] || {});
      jobKeys.forEach(j => {
        if (updated[tradeKey]?.[j]?.[materialName]) {
          updated[tradeKey][j][materialName].price = value;
        }
      });
    } else {
      // Qty is specific to a job type
      if (updated[tradeKey]?.[jobKey]?.[materialName]) {
        updated[tradeKey][jobKey][materialName].qty = value;
      }
    }
    
    setLocalBaselines(updated);
  };

  const handleRemoveMaterial = (materialName: string) => {
    const tradeLabel = tradeLabels[activeTrade] || activeTrade;
    if (confirm(`Are you sure you want to remove "${materialName}" from all jobs under ${tradeLabel}?`)) {
      const updated = { ...localBaselines };
      const jobs = Object.keys(updated[activeTrade] || {});
      jobs.forEach(jobKey => {
        if (updated[activeTrade]?.[jobKey]?.[materialName]) {
          delete updated[activeTrade][jobKey][materialName];
        }
      });
      setLocalBaselines(updated);
    }
  };

  const handleAddMaterial = (e: FormEvent) => {
    e.preventDefault();
    const nameTrimmed = newMatName.trim();
    if (!nameTrimmed) {
      alert("Please enter a valid material name.");
      return;
    }

    const firstJob = activeJobs[0];
    const existingMaterials = Object.keys(localBaselines[activeTrade]?.[firstJob] || {});
    if (existingMaterials.some(m => m.toLowerCase() === nameTrimmed.toLowerCase())) {
      alert(`The material "${nameTrimmed}" already exists in this trade context!`);
      return;
    }

    const updated = { ...localBaselines };
    activeJobs.forEach(jobKey => {
      if (!updated[activeTrade][jobKey]) {
        updated[activeTrade][jobKey] = {};
      }
      updated[activeTrade][jobKey][nameTrimmed] = {
        qty: newMatQtys[jobKey] || 0,
        price: newMatPrice,
        unit: newMatUnit
      };
    });

    setLocalBaselines(updated);
    setNewMatName('');
    setNewMatPrice(0);
    setNewMatUnit('Bags');
    
    // Clear quantities
    const clearedQtys: Record<string, number> = {};
    activeJobs.forEach(j => {
      clearedQtys[j] = 0;
    });
    setNewMatQtys(clearedQtys);

    alert(`Successfully added "${nameTrimmed}" to all job configurations. Make sure to click "Save Ratios & Prices" below to commit changes.`);
  };

  const handleAddJobType = (e: FormEvent) => {
    e.preventDefault();
    const nameTrimmed = newJobName.trim();
    if (!nameTrimmed) {
      alert("Please enter a valid job specialty name.");
      return;
    }

    const jobKey = nameTrimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    if (tradeJobs[activeTrade]?.[jobKey]) {
      alert(`The job specialty "${nameTrimmed}" already exists in this trade!`);
      return;
    }

    const updatedJobs = {
      ...tradeJobs,
      [activeTrade]: {
        ...tradeJobs[activeTrade],
        [jobKey]: nameTrimmed
      }
    };
    onUpdateTradeJobs(updatedJobs);

    const updatedBaselines = { ...localBaselines };
    if (!updatedBaselines[activeTrade]) {
      updatedBaselines[activeTrade] = {};
    }

    const firstJobKey = activeJobs[0] || 'full';
    const firstJobMaterials = localBaselines[activeTrade]?.[firstJobKey] || {};
    
    updatedBaselines[activeTrade][jobKey] = {};
    Object.entries(firstJobMaterials).forEach(([matName, matObj]) => {
      const typedObj = matObj as { price: number; unit: string };
      updatedBaselines[activeTrade][jobKey][matName] = {
        qty: 0,
        price: typedObj.price,
        unit: typedObj.unit
      };
    });

    setLocalBaselines(updatedBaselines);
    setNewJobName('');
    alert(`Successfully added specialty "${nameTrimmed}". You can now set its custom material ratios in the table above and click 'Save Ratios & Prices'.`);
  };

  const handleSaveBaselines = () => {
    onUpdateBaselines(localBaselines);
    alert("Market Pricing & Materials Allocation Baselines saved and updated successfully!");
  };

  const getJobLabel = (trade: TradeKey, jobKey: string) => {
    return tradeJobs[trade]?.[jobKey] || jobKey;
  };

  const activeJobs = Object.keys(tradeJobs[activeTrade] || {});
  const currencyCode = businessProfile.currency || 'GHS';

  // Dynamically query actual list of materials from the first job type in local baselines
  const materialKeys = Object.keys(localBaselines[activeTrade]?.[activeJobs[0]] || {});

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="settings-view-workspace">
      {/* Profile Form (Left Column) */}
      <div className="lg:col-span-5 space-y-6" id="settings-profile-panel">
        <div className="rounded-2xl border border-border-card bg-bg-card p-5 space-y-4 shadow-xs">
          <h3 className="text-sm font-black text-text-main flex items-center gap-2">
            <Building className="h-4.5 w-4.5 text-text-muted" />
            White-Label Settings
          </h3>
          <p className="text-[11px] text-text-muted leading-normal">
            Customize branding to render your business name, address, and quotation conditions at the header of PDF Quote receipts.
          </p>

          <div className="space-y-4 pt-1">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1">
                <Building className="h-3 w-3" /> Contractor Name
              </label>
              <input
                type="text"
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                placeholder="e.g. Elite Plastering Services"
                className="w-full h-10 px-3 bg-bg-input border border-border-card rounded-xl text-xs text-text-main"
                id="profile-name-input"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Contact Location Address
              </label>
              <input
                type="text"
                value={bizLocation}
                onChange={(e) => setBizLocation(e.target.value)}
                placeholder="e.g. Spintex Road, Accra"
                className="w-full h-10 px-3 bg-bg-input border border-border-card rounded-xl text-xs text-text-main"
                id="profile-location-input"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1">
                <Phone className="h-3 w-3" /> Phone Number / Helpline
              </label>
              <input
                type="text"
                value={bizPhone}
                onChange={(e) => setBizPhone(e.target.value)}
                placeholder="e.g. +233 24 000 0000"
                className="w-full h-10 px-3 bg-bg-input border border-border-card rounded-xl text-xs text-text-main"
                id="profile-phone-input"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> Slogan / Catchphrase
              </label>
              <input
                type="text"
                value={bizSlogan}
                onChange={(e) => setBizSlogan(e.target.value)}
                placeholder="e.g. Precision Finishing In Every Project"
                className="w-full h-10 px-3 bg-bg-input border border-border-card rounded-xl text-xs text-text-main"
                id="profile-slogan-input"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1">
                <Coins className="h-3 w-3" /> Base Currency Settings
              </label>
              <select
                value={bizCurrency}
                onChange={(e) => setBizCurrency(e.target.value)}
                className="w-full h-10 px-3 bg-bg-input border border-border-card rounded-xl text-xs text-text-main font-bold focus:outline-hidden cursor-pointer"
                id="profile-currency-input"
              >
                {SUPPORTED_CURRENCIES.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2" id="profile-logo-container">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1">
                <Image className="h-3 w-3" /> Contractor Logo / Branding Image
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Logo Preview */}
                <div className="sm:col-span-4 flex flex-col items-center justify-center border border-border-card bg-bg-panel/20 rounded-xl p-3 h-28 relative group">
                  {bizLogo ? (
                    <>
                      <img 
                        src={bizLogo} 
                        alt="Contractor Logo" 
                        className="max-h-20 max-w-full object-contain rounded-md"
                        referrerPolicy="no-referrer"
                        id="biz-logo-preview"
                      />
                      <button
                        type="button"
                        onClick={() => setBizLogo('')}
                        className="absolute -top-1.5 -right-1.5 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                        title="Remove Logo"
                        id="btn-remove-logo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center space-y-1 text-text-muted">
                      <Image className="h-7 w-7 mx-auto stroke-[1.5] opacity-50" />
                      <span className="text-[9px] uppercase font-bold tracking-wider block">No Logo</span>
                    </div>
                  )}
                </div>

                {/* Upload Zone & URL Input */}
                <div className="sm:col-span-8 space-y-2">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('logo-file-input')?.click()}
                    className={`border border-dashed rounded-xl p-3 text-center cursor-pointer transition-all h-[4.75rem] flex flex-col justify-center items-center gap-1 ${
                      isDragging 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border-card hover:border-text-muted/65 bg-bg-panel/10'
                    }`}
                    id="logo-drag-drop-zone"
                  >
                    <input
                      type="file"
                      id="logo-file-input"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Upload className="h-4 w-4 text-text-muted stroke-[2]" />
                    <p className="text-[10px] text-text-muted leading-tight">
                      <span className="font-bold text-primary">Click to upload</span> or drag and drop logo
                    </p>
                    <p className="text-[8px] text-text-muted/70">PNG, JPG, or SVG up to 2MB</p>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={bizLogo}
                      onChange={(e) => setBizLogo(e.target.value)}
                      placeholder="Or paste external image URL..."
                      className="w-full h-8 pl-3 pr-8 bg-bg-input border border-border-card rounded-lg text-[10px] text-text-main focus:outline-hidden"
                      id="profile-logo-url-input"
                    />
                    {bizLogo && (
                      <button
                        type="button"
                        onClick={() => setBizLogo('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main text-[10px]"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" /> Terms and contractual Conditions
              </label>
              <textarea
                value={bizTerms}
                onChange={(e) => setBizTerms(e.target.value)}
                placeholder="Enter estimate terms..."
                rows={6}
                className="w-full p-3 bg-bg-input border border-border-card rounded-xl text-xs text-text-main font-sans leading-relaxed focus:ring-1 focus:ring-primary focus:outline-hidden"
                id="profile-terms-input"
              />
              <span className="block text-[9px] text-text-muted leading-normal mt-1">
                Placeholders: Use <code>{"{wastePercent}"}</code> and <code>{"{depositPercent}"}</code> to dynamically replace them with active project values in printable slips.
              </span>
            </div>

            <button
              type="button"
              onClick={handleProfileSave}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-white px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-xs"
              id="profile-save-btn"
            >
              Update Profile Branding
            </button>
          </div>
        </div>

        {/* Theme & Visual Customization Card */}
        <div className="rounded-2xl border border-border-card bg-bg-card p-5 space-y-4 shadow-xs" id="settings-theme-panel">
          <h3 className="text-sm font-black text-text-main flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Palette className="h-4.5 w-4.5 text-text-muted" />
              Theme &amp; Customization
            </span>
            <span className="text-[9px] font-black uppercase bg-primary-light text-primary border border-primary-border/40 px-2 py-0.5 rounded-sm">
              6 Themes Active
            </span>
          </h3>
          
          <p className="text-[11px] text-text-muted leading-normal">
            Personalize the visual identity of DzidEstimator. Choose from professional default setups, vibrant contractor highlights, or minimalist carbon palettes.
          </p>

          {/* Quick Dark Mode Toggle inside panel */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-bg-panel/40 border border-border-card/50">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-text-main flex items-center gap-1.5">
                {isDark ? <Moon className="h-3.5 w-3.5 text-indigo-400" /> : <Sun className="h-3.5 w-3.5 text-amber-500" />}
                Active Interface Mode
              </span>
              <p className="text-[10px] text-text-muted">Toggle between standard light and midnight dark modes.</p>
            </div>
            <button
              type="button"
              onClick={onDarkToggle}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-250 ease-in-out focus:outline-hidden ${isDark ? 'bg-primary' : 'bg-neutral-300'}`}
              role="switch"
              aria-checked={isDark}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-250 ease-in-out ${isDark ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Expanded color palette choices */}
          <div className="space-y-3">
            {[
              {
                title: 'Default Trades (Corporate)',
                items: [
                  { id: 'blue', name: 'Steel Blue', desc: 'Classic blue for structural & ceiling engineering contracts', color: '#2563eb' },
                  { id: 'emerald', name: 'Emerald Forest', desc: 'Teal emerald for nature, landscaping & premium finishes', color: '#059669' }
                ]
              },
              {
                title: 'Vibrant Colors (Artisanal Accent)',
                items: [
                  { id: 'amber', name: 'Amber Gold', desc: 'Warm builder yellow-gold for solar and timber specialists', color: '#d97706' },
                  { id: 'terracotta', name: 'Terracotta Dust', desc: 'Fired orange-red clay tone for masonry & tile finishes', color: '#ea580c' }
                ]
              },
              {
                title: 'Minimalist & Mono (Ultra Clean Focus)',
                items: [
                  { id: 'charcoal', name: 'Charcoal Tech', desc: 'Industrial steel gray offering neat structure and serious focus', color: '#4b5563' },
                  { id: 'slate', name: 'Minimalist Slate', desc: 'Strict elite slate styling with solid black outlines', color: '#0f172a' }
                ]
              }
            ].map((section, sIdx) => (
              <div key={sIdx} className="space-y-2">
                <span className="text-[9px] font-extrabold text-text-muted uppercase tracking-wider block">
                  {section.title}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {section.items.map((item) => {
                    const isSelected = theme === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onThemeChange(item.id)}
                        className={`text-left p-3 rounded-xl border transition-all relative flex flex-col justify-between cursor-pointer select-none h-24 ${
                          isSelected 
                            ? 'border-primary bg-primary-light/50 ring-2 ring-primary/20 scale-[1.01]' 
                            : 'border-border-card hover:border-text-muted/65 bg-bg-panel/10 hover:bg-bg-panel/30'
                        }`}
                        id={`theme-btn-${item.id}`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <span 
                              className="h-3.5 w-3.5 rounded-full border border-black/10 shrink-0" 
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-xs font-black text-text-main">{item.name}</span>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </div>
                        
                        <p className="text-[10px] text-text-muted leading-snug mt-2.5 line-clamp-2">
                          {item.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* App Data Backup & Portability Card */}
        <div className="rounded-2xl border border-border-card bg-bg-card p-5 space-y-4 shadow-xs animate-fade-in" id="settings-backup-panel">
          <h3 className="text-sm font-black text-text-main flex items-center gap-2">
            <Database className="h-4.5 w-4.5 text-text-muted" />
            <span>Data Portability & Backup</span>
          </h3>
          <p className="text-[11px] text-text-muted leading-normal">
            Export all DzidEstimator application state including client records, estimates, white-label branding configurations, custom formula baselines, and historical receipts to a JSON archive.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Download Button */}
            <button
              type="button"
              onClick={handleExportBackup}
              className="py-2.5 px-4 bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              id="download-backup-btn"
            >
              <Download className="h-4 w-4" />
              <span>Download Backup</span>
            </button>

            {/* Upload Button */}
            <div className="relative">
              <input
                type="file"
                id="restore-backup-upload"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => document.getElementById('restore-backup-upload')?.click()}
                className="w-full py-2.5 px-4 bg-bg-panel hover:bg-border-card text-text-main border border-border-card text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                id="restore-backup-btn"
              >
                <Upload className="h-4 w-4 text-text-muted" />
                <span>Restore Backup</span>
              </button>
            </div>
          </div>
          <p className="text-[9px] text-text-muted/80 leading-snug">
            Tip: Restoring a backup will overwrite the current active browser records. Download a safety backup of your current setup first to preserve your workspace.
          </p>
        </div>

        {/* Info card to guide baseline allocations */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-2 animate-fade-in" id="info-baseline-guides">
          <h5 className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 leading-none">
            <Info className="h-4 w-4 shrink-0 text-primary" />
            Allocation Formulas Explained
          </h5>
          <p className="text-xs text-text-main/90 leading-relaxed dark:text-neutral-300">
            Materials ratios are mapped per <strong>100 square meters (m²)</strong> or <strong>100 linear meters (m)</strong>. For instance, allocating a base quantity of <code>60 Bags</code> of POP Cement means 0.6 bags will be utilized to install a single square meter of Full POP Ceiling. Change ratios here to customize physical formulas to your exact real-life specifications.
          </p>
        </div>
      </div>

      {/* Materials baselines configuration (Right Column) */}
      <div className="lg:col-span-7 space-y-6" id="settings-baselines-panel">
        <div className="rounded-2xl border border-border-card bg-bg-card p-5 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-black text-text-main flex items-center gap-2">
              <Settings className="h-4.5 w-4.5 text-text-muted" />
              Formula allocation ratios
            </h3>

            {/* Select Trade switch */}
            <select
              value={activeTrade}
              onChange={(e) => {
                setActiveTrade(e.target.value as TradeKey);
                setNewMatQtys({});
              }}
              className="h-9 px-3 bg-bg-input border border-border-card rounded-lg text-xs font-bold text-text-main focus:outline-hidden cursor-pointer"
              id="settings-trade-select"
            >
              {Object.entries(tradeLabels).map(([key, label]) => {
                const defaultIcons: Record<string, string> = {
                  pop: "🏗️",
                  tiling: "📐",
                  painting: "🎨"
                };
                const icon = defaultIcons[key] || "🛠️";
                return (
                  <option key={key} value={key} className="text-neutral-800 bg-white">
                    {icon} {label}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="overflow-x-auto border border-border-card/50 rounded-xl" id="baseline-table-scroller">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-card bg-bg-panel/40 text-[10px] uppercase tracking-wider font-bold text-text-muted">
                  <th className="py-2.5 px-3">Material / Item</th>
                  <th className="py-2.5 px-2 text-center">Market Price ({currencyCode})</th>
                  {activeJobs.map((jKey) => (
                    <th key={jKey} className="py-2.5 px-2 text-center font-semibold">
                      {jKey === 'full' ? 'Full Ceiling' : jKey === 'cornice' ? 'Cornice' : jKey === 'skim' ? 'Skim' : jKey === 'floor' ? 'Floor' : jKey === 'wall' ? 'Wall' : getJobLabel(activeTrade, jKey)}
                      <span className="block text-[8px] font-normal lowercase text-text-muted">qty per 100u</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-card/50 text-text-main">
                {materialKeys.map((mat) => {
                  // Price from first job type (or fallback to any)
                  const firstJob = activeJobs[0];
                  const priceVal = localBaselines[activeTrade]?.[firstJob]?.[mat]?.price || 0;
                  const unitLabel = localBaselines[activeTrade]?.[firstJob]?.[mat]?.unit || '';

                  return (
                    <tr key={mat} className="hover:bg-bg-panel/20 group/row select-none">
                      <td className="py-2.5 px-3 font-bold text-text-main flex items-center justify-between min-w-[140px]">
                        <div>
                          {mat}
                          <span className="block text-[9px] font-normal text-text-muted mt-0.5">{unitLabel}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMaterial(mat)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-md opacity-0 group-hover/row:opacity-100 transition-opacity ml-2 pointer-events-auto cursor-pointer"
                          title={`Delete ${mat} material`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                      
                      <td className="py-2.5 px-2 text-center">
                        <div className="inline-flex items-center gap-1 border border-border-card rounded-lg bg-bg-panel/20 px-1.5 py-1">
                          <span className="text-[10px] text-text-muted">{currencyCode}</span>
                          <input
                            type="number"
                            value={priceVal}
                            onChange={(e) => handleBaselineChange(activeTrade, firstJob, mat, 'price', parseFloat(e.target.value) || 0)}
                            className="w-12 text-center text-xs font-mono font-bold focus:outline-hidden bg-transparent"
                            title="Edit Commodity Price"
                            min={0}
                          />
                        </div>
                      </td>

                      {activeJobs.map((jobKey) => {
                        const cellData = localBaselines[activeTrade]?.[jobKey]?.[mat];
                        if (!cellData) {
                          return (
                            <td key={jobKey} className="py-2.5 px-2 text-center text-text-muted/40">
                              -
                            </td>
                          );
                        }

                        return (
                          <td key={jobKey} className="py-2.5 px-2 text-center">
                            <input
                              type="number"
                              value={cellData.qty}
                              onChange={(e) => handleBaselineChange(activeTrade, jobKey, mat, 'qty', parseFloat(e.target.value) || 0)}
                              className="w-12 h-8 text-center text-xs border border-border-card rounded-lg bg-bg-input focus:ring-1 focus:ring-primary px-1 font-mono text-text-main"
                              title={`Allocated qty of ${mat}`}
                              min={0}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border-card pt-4 space-y-4">
            {/* Dynamic Add Material Flow */}
            <form onSubmit={handleAddMaterial} className="space-y-3">
              <h4 className="text-[11px] font-black text-text-main flex items-center gap-1.5 uppercase tracking-wider">
                <Plus className="h-3.5 w-3.5 text-primary" /> Add Dynamic Material
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Material Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Scaffolding Sheet"
                    value={newMatName}
                    onChange={(e) => setNewMatName(e.target.value)}
                    className="w-full h-8 px-2.5 bg-bg-input text-text-main border border-border-card rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Packaging Unit</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sheets, Bags"
                    value={newMatUnit}
                    onChange={(e) => setNewMatUnit(e.target.value)}
                    className="w-full h-8 px-2.5 bg-bg-input text-text-main border border-border-card rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Market Price ({currencyCode})</label>
                  <input
                    type="number"
                    placeholder="e.g. 150"
                    value={newMatPrice || ''}
                    onChange={(e) => setNewMatPrice(parseFloat(e.target.value) || 0)}
                    className="w-full h-8 px-2.5 bg-bg-input text-text-main border border-border-card rounded-lg text-xs font-mono"
                    min={0}
                  />
                </div>
              </div>

              <div className="bg-bg-panel/40 p-3 rounded-lg border border-border-card/60 space-y-2">
                <span className="text-[9px] font-bold text-text-muted uppercase tracking-wide block">Default Quantity allocations per 100 units metrics:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {activeJobs.map(jobKey => (
                    <div key={jobKey} className="space-y-1">
                      <label className="text-[9px] font-bold text-text-muted truncate block uppercase tracking-tight">
                        {jobKey === 'full' ? 'Full Ceiling' : jobKey === 'cornice' ? 'Cornice' : jobKey === 'skim' ? 'Skim' : jobKey === 'floor' ? 'Floor' : jobKey === 'wall' ? 'Wall' : getJobLabel(activeTrade, jobKey)}
                      </label>
                      <input
                        type="number"
                        placeholder="0.0"
                        value={newMatQtys[jobKey] || ''}
                        onChange={(e) => setNewMatQtys({ ...newMatQtys, [jobKey]: parseFloat(e.target.value) || 0 })}
                        className="w-full h-8 px-2 bg-bg-input text-text-main border border-border-card rounded-md text-xs font-mono"
                        min={0}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 bg-bg-panel hover:bg-border-card text-text-main border border-border-card py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5 text-primary" />
                Inject Material Into {tradeLabels[activeTrade] || activeTrade}
              </button>
            </form>

            {/* Dynamic Add Job Specialty Flow */}
            <div className="border-t border-border-card/60 pt-4 space-y-3">
              <h4 className="text-[11px] font-black text-text-main flex items-center gap-1.5 uppercase tracking-wider">
                <Plus className="h-3.5 w-3.5 text-primary" /> Add Custom Job Specialty to {tradeLabels[activeTrade] || activeTrade}
              </h4>
              <form onSubmit={handleAddJobType} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-9 space-y-1">
                  <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Specialty / Job Specialty Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Columns Plastering, Terrazzo, External Textured, etc."
                    value={newJobName}
                    onChange={(e) => setNewJobName(e.target.value)}
                    className="w-full h-8 px-2.5 bg-bg-input text-text-main border border-border-card rounded-lg text-xs"
                    id="new-job-name-input"
                  />
                </div>
                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    className="w-full h-8 inline-flex items-center justify-center gap-1.5 bg-bg-panel hover:bg-border-card text-text-main border border-border-card px-3 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    id="new-job-submit-btn"
                  >
                    <Plus className="h-3.5 w-3.5 text-primary" />
                    Create Specialty
                  </button>
                </div>
              </form>
            </div>

            {/* Dynamic Add New Trade Entirely Flow */}
            <div className="border-t border-border-card/60 pt-4 space-y-3">
              <h4 className="text-[11px] font-black text-text-main flex items-center gap-1.5 uppercase tracking-wider">
                <PlusCircle className="h-4 w-4 text-primary shrink-0" /> Add New Custom Trade Category
              </h4>
              
              <form onSubmit={handleAddNewTrade} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Trade Category Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Wood Carpentry, Roofing, Plumbing, Concrete Layout"
                      value={newTradeName}
                      onChange={(e) => setNewTradeName(e.target.value)}
                      className="w-full h-9 px-3 bg-bg-input text-text-main border border-border-card rounded-lg text-xs font-medium"
                      id="new-trade-name-input"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Initial Specialty/Job Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Frame Installation (Defaults to 'General Specialty')"
                      value={newTradeJobName}
                      onChange={(e) => setNewTradeJobName(e.target.value)}
                      className="w-full h-9 px-3 bg-bg-input text-text-main border border-border-card rounded-lg text-xs font-medium"
                      id="new-trade-job-name-input"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1.5 bg-bg-panel hover:bg-border-card text-text-main border border-border-card py-2 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    id="new-trade-submit-btn"
                  >
                    <Plus className="h-3.5 w-3.5 text-primary" />
                    Add Custom Trade Category
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-border-card">
            <button
              onClick={handleSaveBaselines}
              className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-white px-5 py-3 text-xs font-bold transition-all cursor-pointer shadow-md shadow-primary/10"
              id="baseline-save-btn"
            >
              <Save className="h-4 w-4" />
              Save Ratios &amp; Prices
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
