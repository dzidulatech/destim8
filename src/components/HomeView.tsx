import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  PlusCircle, FileText, ChevronRight, HardHat, Sparkles, Trash2, 
  ArrowUpRight, Coins, Hammer, TrendingUp, Share2, Copy, Check, X, 
  Smartphone, MessageSquare, ExternalLink, CheckCircle2, Users, Phone, MapPin, UserPlus, Receipt
} from 'lucide-react';
import { Estimate, EstimateStatus, BaselinesType, BusinessProfile, Client } from '../types';
import { getCurrencyInfo, formatCurrencyValue } from '../currency';

interface HomeViewProps {
  recentEstimates: Estimate[];
  onSelectEstimate: (estimate: Estimate) => void;
  onDeleteEstimate: (id: string) => void;
  onStartEstimate: (trade?: string) => void;
  onNavigateToTab: (tab: 'home' | 'estimate' | 'settings' | 'features' | 'receipts') => void;
  tradeJobs: Record<string, Record<string, string>>;
  onUpdateEstimateStatus: (id: string, status: EstimateStatus) => void;
  baselines: BaselinesType;
  businessProfile: BusinessProfile;
  tradeLabels: Record<string, string>;
  onUpdateTradeLabels?: (labels: Record<string, string>) => void;
  clients: Client[];
  onUpdateClients: (updated: Client[]) => void;
}

export default function HomeView({
  recentEstimates,
  onSelectEstimate,
  onDeleteEstimate,
  onStartEstimate,
  onNavigateToTab,
  tradeJobs,
  onUpdateEstimateStatus,
  baselines,
  businessProfile,
  tradeLabels,
  clients,
  onUpdateClients
}: HomeViewProps) {

  const [activeFilter, setActiveFilter] = useState<'All' | EstimateStatus>('All');

  // Dynamic payment tracking for status indicators
  const [payments, setPayments] = useState<any[]>([]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('estim8_payments');
      if (stored) {
        setPayments(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load payments in HomeView:", e);
    }
  }, []);
  
  // Quick WhatsApp sharing states
  const [selectedShareEstimate, setSelectedShareEstimate] = useState<Estimate | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [shareDepositPercent, setShareDepositPercent] = useState<number>(60);
  
  // Custom non-blocking delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // CRM Clients Database States
  const [subSection, setSubSection] = useState<'quotes' | 'clients'>('clients');
  const [clientSearch, setClientSearch] = useState<string>('');
  const [showAddClientForm, setShowAddClientForm] = useState<boolean>(false);
  const [newClientName, setNewClientName] = useState<string>('');
  const [newClientPhone, setNewClientPhone] = useState<string>('');
  const [newClientLocation, setNewClientLocation] = useState<string>('');
  const [clientDeleteConfirmId, setClientDeleteConfirmId] = useState<string | null>(null);

  const formatCurrency = (num: number) => {
    return formatCurrencyValue(num, businessProfile.currency || 'GHS');
  };

  // Reconstruct exact materials lists
  const calculateMaterialsForEstimate = (est: Estimate) => {
    let totalMeasure = 0;
    if (est.unitType === 'lm') {
      totalMeasure = est.linearMeters;
    } else {
      totalMeasure = est.rooms.reduce((acc, r) => {
        const area = (r.l * r.w) / 10000; // cm² to m²
        return acc + area;
      }, 0);
    }

    const tradeBaselines = baselines[est.trade]?.[est.jobType] || {};
    
    return Object.keys(tradeBaselines).map(itemName => {
      const base = tradeBaselines[itemName];
      if (!base) return { name: itemName, qty: 0, price: 0, cost: 0, unit: '' };
      
      let calculatedQty = base.fixed ? base.qty : (base.qty / 100) * totalMeasure;
      if (!base.fixed) {
        calculatedQty = calculatedQty * (1 + est.wastePercent / 100);
      }
      
      const cost = calculatedQty * base.price;
      
      return {
        name: itemName,
        qty: calculatedQty,
        price: base.price,
        cost: cost,
        unit: base.unit
      };
    });
  };

  const getTradeLabel = (trade: string) => {
    return tradeLabels[trade] || trade;
  };

  const generateWhatsAppMessageForEstimate = (est: Estimate) => {
    const tradeLabel = getTradeLabel(est.trade);
    const jobLabel = tradeJobs[est.trade]?.[est.jobType] || est.jobType;
    const measureUnit = est.unitType === 'sqm' ? 'm²' : 'm';
    
    let totalMeasure = 0;
    if (est.unitType === 'lm') {
      totalMeasure = est.linearMeters;
    } else {
      totalMeasure = est.rooms.reduce((acc, r) => {
        const area = (r.l * r.w) / 10000;
        return acc + area;
      }, 0);
    }

    const cur = businessProfile.currency || 'GHS';
    const { symbol, locale } = getCurrencyInfo(cur);

    const materialsList = calculateMaterialsForEstimate(est);
    const depositAmount = est.grandTotal * (shareDepositPercent / 100);
    const balanceDue = est.grandTotal - depositAmount;

    let msg = `*${businessProfile.name.toUpperCase()}*\n`;
    if (businessProfile.slogan) msg += `_${businessProfile.slogan}_\n`;
    msg += `----------------------------------------\n`;
    msg += `*Trade Estimation & Quotation*\n\n`;
    msg += `*Client:* ${est.clientName || 'Valued Client'}\n`;
    msg += `*Project:* ${est.projectName || 'Not Specified'}\n`;
    msg += `*Location:* ${est.jobLocation || 'Accra, Ghana'}\n`;
    msg += `*Service:* ${tradeLabel} (${jobLabel})\n`;
    msg += `*Total Measure:* ${totalMeasure.toFixed(2)} ${measureUnit}\n`;
    msg += `*Status:* [${est.status || 'Draft'}]\n`;
    msg += `----------------------------------------\n\n`;
    
    msg += `*Material Items Summary:*\n`;
    materialsList.forEach(m => {
      if (m.cost > 0) {
        if (est.materialsBoughtBy === 'Client') {
          msg += `• ${m.name}: ${m.qty.toFixed(1)} ${m.unit} (Client Supplied)\n`;
        } else {
          msg += `• ${m.name}: ${m.qty.toFixed(1)} ${m.unit} @ ${symbol} ${m.price.toLocaleString(locale, { minimumFractionDigits: 2 })} = ${symbol} ${m.cost.toLocaleString(locale, { minimumFractionDigits: 2 })}\n`;
        }
      }
    });
    if (est.materialsBoughtBy === 'Client') {
      msg += `*Materials Total:* Client Supplied / Provided ($0.00)\n`;
    }

    msg += `\n*Labor Cost:* ${symbol} ${est.laborTotal.toLocaleString(locale, { minimumFractionDigits: 2 })}\n`;
    if (est.transportFee > 0) {
      msg += `*Logistics/Transport:* ${symbol} ${est.transportFee.toLocaleString(locale, { minimumFractionDigits: 2 })}\n`;
    }
    
    msg += `----------------------------------------\n`;
    msg += `*GRAND TOTAL:* ${symbol} ${est.grandTotal.toLocaleString(locale, { minimumFractionDigits: 2 })}\n`;
    msg += `*Required Deposit (${shareDepositPercent}%):* *${symbol} ${depositAmount.toLocaleString(locale, { minimumFractionDigits: 2 })}*\n`;
    msg += `*Balance Upon Completion:* ${symbol} ${balanceDue.toLocaleString(locale, { minimumFractionDigits: 2 })}\n\n`;
    
    const DEFAULT_TERMS = `1. This estimation incorporates a physical material waste contingent index of {wastePercent}% to allow for product cuts or damages during install.
2. Payment of the specified {depositPercent}% contract mobilization advance is required prior to shipping and delivery of physical supplies to site.
3. Remaining balance must be cleared fully on immediate successful client verification of structural completions.
4. Notice: If this estimate is longer than 3 months, it needs to be updated due to material cost fluctuations.`;

    const termsTemplate = businessProfile.termsAndConditions || DEFAULT_TERMS;
    const finalTerms = termsTemplate
      .replace(/{wastePercent}/g, String(est.wastePercent))
      .replace(/{depositPercent}/g, String(shareDepositPercent));

    msg += `_Terms & Conditions:_\n${finalTerms}\n\n`;
    msg += `Contact: ${businessProfile.phone}`;
    
    return msg;
  };

  const handleCopyToClipboard = (est: Estimate) => {
    const rawMsg = generateWhatsAppMessageForEstimate(est);
    navigator.clipboard.writeText(rawMsg).then(() => {
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2500);
    });
  };

  const filteredEstimates = activeFilter === 'All'
    ? recentEstimates
    : recentEstimates.filter(e => e.status === activeFilter);

  const getTradeName = (trade: string) => {
    if (trade === 'pop') return 'POP Ceiling';
    if (trade === 'tiling') return 'Tiling';
    if (trade === 'painting') return 'Painting';
    return trade;
  };

  const getTradeIcon = (trade: string) => {
    if (trade === 'pop') return "🏗️";
    if (trade === 'tiling') return "📐";
    return "🎨";
  };

  const totalEstimatesCount = recentEstimates.length;
  const totalEstimatesValue = recentEstimates.reduce((sum, est) => sum + est.grandTotal, 0);
  const totalMaterialsValue = recentEstimates.reduce((sum, est) => sum + (est.materialTotal || 0), 0);
  const totalLaborValue = recentEstimates.reduce((sum, est) => sum + (est.laborTotal || 0), 0);

  return (
    <div className="space-y-8" id="home-view-container">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-neutral-900 dark:bg-neutral-950 p-8 text-white shadow-xl aspect-auto" id="hero-banner">
        {/* Decorative Grid Accent */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        
        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary-light backdrop-blur-xs ring-1 ring-primary/30">
              <Sparkles className="h-3 w-3 text-primary-light" />
              <span>Trades Estimator</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight" id="main-title">
              Estim<span className="text-primary">8</span>
            </h1>
            <p className="text-neutral-400 text-sm md:text-base max-w-md">
              Precision material estimates, labor calculators, and professional white-label quotes for Ghanaian construction trades.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            <button
              onClick={() => onStartEstimate()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover active:scale-95 transition-all shadow-lg shadow-primary/20"
              id="start-estimate-btn"
            >
              <PlusCircle className="h-4 w-4" />
              Start New Estimate
            </button>
            <button
              onClick={() => onNavigateToTab('features')}
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-800/80 px-5 py-3 text-sm font-semibold text-neutral-200 hover:bg-neutral-700/80 hover:text-white backdrop-blur-xs transition-colors ring-1 ring-neutral-700"
              id="view-features-btn"
            >
              Explore Features
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard Grid */}
      {recentEstimates.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="analytics-grid">
          <div className="p-4 rounded-2xl border border-border-card bg-bg-card flex items-center gap-3 shadow-xs">
            <span className="p-2.5 rounded-xl text-lg flex items-center justify-center bg-blue-500/10 text-primary border border-primary/10 shrink-0">
              <TrendingUp className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Est. Revenue</span>
              <span className="text-xs md:text-sm font-black text-text-main truncate block">
                {formatCurrency(totalEstimatesValue)}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-border-card bg-bg-card flex items-center gap-3 shadow-xs">
            <span className="p-2.5 rounded-xl text-lg flex items-center justify-center bg-emerald-500/10 text-emerald-600 border border-emerald-500/10 shrink-0">
              <Coins className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Material Bills</span>
              <span className="text-xs md:text-sm font-black text-emerald-600 truncate block">
                {formatCurrency(totalMaterialsValue)}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-border-card bg-bg-card flex items-center gap-3 shadow-xs">
            <span className="p-2.5 rounded-xl text-lg flex items-center justify-center bg-amber-500/10 text-amber-600 border border-amber-500/10 shrink-0">
              <Hammer className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Labour Share</span>
              <span className="text-xs md:text-sm font-black text-amber-600 truncate block">
                {formatCurrency(totalLaborValue)}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-border-card bg-bg-card flex items-center gap-3 shadow-xs col-span-2 lg:col-span-1">
            <span className="p-2.5 rounded-xl text-lg flex items-center justify-center bg-neutral-500/10 text-text-muted border border-border-card shrink-0">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Saved Slips</span>
              <span className="text-xs md:text-sm font-black text-text-main block truncate">
                {totalEstimatesCount} active quotes
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Trade Select cards */}
      <div id="trade-quick-select" className="space-y-4">
        <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider">Fast-Start estimation</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(tradeLabels).map(([key, label]) => {
            const defaultIcons: Record<string, string> = {
              pop: "🏗️",
              tiling: "📐",
              painting: "🎨"
            };
            const defaultDescs: Record<string, string> = {
              pop: "Full ceilings, cornices, smoothing ratio calculation.",
              tiling: "Floor/wall tiles, adhesive bag & spatial volume.",
              painting: "Primer bucket, thinned coats, masking, sanding sheets."
            };
            const icon = defaultIcons[key] || "🛠️";
            const desc = defaultDescs[key] || "Custom professional estimation metrics configured.";
            return (
              <button
                key={key}
                onClick={() => onStartEstimate(key)}
                className="group relative flex flex-col justify-between items-start text-left p-5 rounded-2xl border border-border-card bg-bg-card hover:border-primary hover:shadow-md active:scale-98 transition-all cursor-pointer min-h-[140px]"
                id={`quick-start-${key}`}
              >
                <div className="absolute top-4 right-4 text-xs text-text-muted group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-2xl mb-3 block">{icon}</span>
                  <h4 className="text-base font-bold text-text-main group-hover:text-primary transition-colors">{label}</h4>
                  <p className="text-xs text-text-muted mt-1 line-clamp-2">{desc}</p>
                </div>
              </button>
            );
          })}
          
          <button
            onClick={() => onNavigateToTab('settings')}
            className="group relative flex flex-col justify-between items-start text-left p-5 rounded-2xl border border-dashed border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10 active:scale-98 transition-all cursor-pointer min-h-[140px]"
            id="quick-start-add-custom-trade"
          >
            <div className="absolute top-4 right-4 text-xs text-primary">
              <PlusCircle className="h-4 w-4" />
            </div>
            <div>
              <span className="text-2xl mb-3 block">✨</span>
              <h4 className="text-base font-bold text-primary group-hover:underline">Add Custom Trade</h4>
              <p className="text-xs text-text-muted mt-1 leading-normal">Configure wood cabinetry, brick laying, plumbing, or any other professional trade.</p>
            </div>
          </button>
        </div>
      </div>

      {/* Tab/Selector Header */}
      <div className="flex items-center gap-3 border-b border-border-card pb-2" id="dashboard-crm-tabs">
        <button
          onClick={() => setSubSection('clients')}
          className={`px-4 py-2 text-sm font-extrabold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            subSection === 'clients'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text-main'
          }`}
          id="tab-clients-trigger"
        >
          <Users className="h-4 w-4" />
          1. Clients Directory &amp; Registration
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black">
            {clients.length}
          </span>
        </button>
        <button
          onClick={() => setSubSection('quotes')}
          className={`px-4 py-2 text-sm font-extrabold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            subSection === 'quotes'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text-main'
          }`}
          id="tab-quotes-trigger"
        >
          <FileText className="h-4 w-4" />
          2. Recent Calculations
        </button>
      </div>

      {subSection === 'quotes' ? (
        <div className="space-y-4" id="recent-estimates-section">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
              <FileText className="h-5 w-5 text-text-muted" />
              Recent Calculations
            </h2>
            {recentEstimates.length > 0 && (
              <span className="text-xs bg-bg-panel text-text-muted px-2 py-1 rounded-sm font-medium border border-border-card">
                {recentEstimates.length} saved
              </span>
            )}
          </div>

          {recentEstimates.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none" id="status-filters-scroller">
              {(['All', 'Draft', 'Sent', 'Accepted', 'Completed'] as const).map((filter) => {
                const count = filter === 'All' 
                  ? recentEstimates.length 
                  : recentEstimates.filter(e => e.status === filter).length;
                const isSelected = activeFilter === filter;
                
                return (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border select-none ${
                      isSelected 
                        ? 'bg-primary text-white border-primary shadow-xs font-extrabold scale-102' 
                        : 'bg-bg-card hover:bg-bg-panel text-text-muted border-border-card'
                    }`}
                    id={`filter-pill-${filter}`}
                  >
                    <span>{filter}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-bg-panel text-text-muted border border-border-card/20'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {recentEstimates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 rounded-3xl border border-dashed border-border-card bg-bg-card text-center" id="empty-estimates-container">
            <div className="h-12 w-12 rounded-2xl bg-bg-panel flex items-center justify-center text-text-muted mb-4 ring-8 ring-bg-canvas/50">
              <HardHat className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-text-main text-base">No Estimates Yet</h3>
            <p className="text-text-muted text-xs mt-1 max-w-xs">
              Generate materials formulas and custom contractor labor outputs for POP, tiling, or painters in seconds.
            </p>
            <button
              onClick={() => onStartEstimate()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover px-4 py-2.5 text-xs font-semibold text-white transition-colors"
              id="empty-action-estimate"
            >
              Create first estimate
            </button>
          </div>
        ) : filteredEstimates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 rounded-3xl border border-dashed border-border-card bg-bg-card text-center" id="empty-filtered-estimates-container">
            <div className="h-12 w-12 rounded-2xl bg-bg-panel flex items-center justify-center text-text-muted mb-4">
              <FileText className="h-6 w-6 text-text-muted" />
            </div>
            <h3 className="font-semibold text-text-main text-base">No Matches Found</h3>
            <p className="text-text-muted text-xs mt-1 max-w-xs">
              There are no saved estimates styled with status value "{activeFilter}" right now.
            </p>
            <button
              onClick={() => setActiveFilter('All')}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-bg-panel hover:bg-border-card border border-border-card px-4 py-2.5 text-xs font-semibold text-text-main transition-colors"
              id="clear-filter-action"
            >
              Show All Estimates
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="estimates-list">
            {filteredEstimates.map((est) => (
              <div
                key={est.id}
                className="group relative flex flex-col justify-between p-5 rounded-2xl border border-border-card bg-bg-card hover:border-text-muted hover:shadow-xs transition-all"
                id={`estimate-card-${est.id}`}
              >
                <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10" onClick={(e) => e.stopPropagation()}>
                  {deleteConfirmId === est.id ? (
                    <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 rounded-md p-1 animate-fade-in" id={`confirm-delete-block-${est.id}`}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteEstimate(est.id);
                          setDeleteConfirmId(null);
                        }}
                        className="px-2 py-1 text-[9px] font-black bg-red-600 hover:bg-red-550 text-white rounded-md transition-colors cursor-pointer"
                        title="Confirm Delete"
                        id={`delete-confirm-btn-${est.id}`}
                      >
                        Delete?
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(null);
                        }}
                        className="p-1 text-text-muted hover:text-text-main hover:bg-bg-panel rounded-md transition-colors cursor-pointer"
                        title="Cancel"
                        id={`delete-cancel-btn-${est.id}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(est.id);
                      }}
                      className="p-1.5 text-text-muted hover:text-red-500 rounded-lg hover:bg-bg-panel transition-colors cursor-pointer md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                      title="Delete"
                      id={`delete-btn-${est.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-3 cursor-pointer" onClick={() => onSelectEstimate(est)}>
                  <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                    <div className="text-xs font-black text-text-muted bg-bg-panel border border-border-card px-2 py-0.5 rounded-sm">
                      {est.id}
                    </div>
                    {/* Interactive inline status selection trigger */}
                    {est.sealed ? (
                      <div className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-1 rounded-full border text-emerald-800 bg-emerald-50 border-emerald-200">
                        <span>🔒 Sealed Contract</span>
                      </div>
                    ) : (
                      <select
                        value={est.status || 'Draft'}
                        onChange={(e) => onUpdateEstimateStatus(est.id, e.target.value as EstimateStatus)}
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border cursor-pointer font-sans transition-all focus:outline-hidden ${
                          est.status === 'Draft' 
                            ? 'text-amber-600 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20' 
                            : est.status === 'Sent'
                            ? 'text-blue-600 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20'
                            : est.status === 'Accepted'
                            ? 'text-emerald-700 bg-emerald-55/10 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'text-indigo-650 bg-indigo-55/10 border-indigo-500/20 hover:bg-indigo-500/20'
                        }`}
                      >
                        <option value="Draft">📝 Draft</option>
                        <option value="Sent">✉️ Sent</option>
                        <option value="Accepted">✅ Accepted</option>
                        <option value="Completed">🎉 Completed</option>
                      </select>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-lg flex items-center justify-center p-2 rounded-xl bg-bg-canvas border border-border-card">
                      {getTradeIcon(est.trade)}
                    </span>
                    <div>
                      <h4 className="font-bold text-text-main text-sm group-hover:text-primary transition-colors">
                        {getTradeName(est.trade)} • {tradeJobs[est.trade]?.[est.jobType] || est.jobType}
                      </h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-2 border-y border-border-card text-xs">
                    <div>
                      <span className="text-text-muted block font-normal text-[10px]">Client</span>
                      <span className="font-bold text-text-main truncate block max-w-[130px]" title={est.clientName || 'N/A'}>
                        {est.clientName || 'Unnamed Client'}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block font-normal text-[10px]">Location</span>
                      <span className="font-bold text-text-main truncate block max-w-[130px]" title={est.jobLocation || 'N/A'}>
                        {est.jobLocation || 'Not Specified'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[10px] text-text-muted font-bold">
                      Date: {new Date(est.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="text-right">
                      {est.sealed && est.agreedPrice ? (
                        <div className="text-right">
                          <span className="text-[8px] text-emerald-600 font-extrabold uppercase block leading-none mb-0.5">Agreed Contract</span>
                          <span className="text-base font-black text-emerald-600 block leading-none">
                            {formatCurrency(est.agreedPrice)}
                          </span>
                        </div>
                      ) : (
                        <div className="text-base font-black text-primary">
                          {formatCurrency(est.grandTotal)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card bottom direct utility bar */}
                <div className="flex items-center justify-between pt-3 mt-1 border-t border-border-card/60 gap-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectEstimate(est)}
                      className="px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg transition-colors cursor-pointer"
                      title={
                        est.sealed 
                          ? "View sealed contract details, parameters, and printable PDF documents" 
                          : est.status === 'Accepted'
                          ? "Contract is approved! Click to seal the final price and freeze modifications"
                          : "View dynamic list of materials and customize settings"
                      }
                      id={`view-btn-${est.id}`}
                    >
                      {est.sealed ? (
                        <span className="flex items-center gap-1">🔍 View Contract</span>
                      ) : est.status === 'Accepted' ? (
                        <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-extrabold animate-pulse">🔐 Seal Contract Price</span>
                      ) : (
                        <span>✏️ Open &amp; Edit</span>
                      )}
                    </button>

                    {/* Record payment shortcut ONLY for Sealed estimates */}
                    {(() => {
                      const basePrice = est.agreedPrice !== undefined ? est.agreedPrice : est.grandTotal;
                      const paidForEst = payments
                        .filter((p: any) => p.estimateId === est.id)
                        .reduce((sum: number, p: any) => sum + p.amountPaid, 0);
                      const isFullyPaid = basePrice - paidForEst <= 0.01;

                      return est.sealed && (est.status === 'Accepted' || est.status === 'Completed') && (
                        isFullyPaid ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-300/30 rounded-lg select-none">
                            ✅ Fully Paid-Off
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              onSelectEstimate(est);
                              onNavigateToTab('receipts');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-black bg-emerald-600/15 text-emerald-800 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/25 rounded-lg transition-colors cursor-pointer"
                            title="Log client deposit or full payment and send receipt for this sealed contract"
                            id={`record-payment-btn-${est.id}`}
                          >
                            <Receipt className="h-3 w-3" />
                            <span>Collect Cash</span>
                          </button>
                        )
                      );
                    })()}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedShareEstimate(est);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-all cursor-pointer border border-emerald-500/20 focus:outline-hidden"
                    title="Generate text quotation and forward to WhatsApp client"
                    id={`share-btn-${est.id}`}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Share Quote</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      ) : (
        <div className="space-y-6 animate-fade-in" id="clients-crm-section">
          {/* Header & Filter Search Container */}
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-bg-card border border-border-card p-4 rounded-2xl animate-fade-in" id="clients-action-bar">
            {/* Search inputs */}
            <div className="relative flex-1" id="crm-search-box">
              <input
                type="text"
                placeholder="🔍 Search clients by name, phone, or project location..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="w-full h-10 px-3 pl-9 border border-border-card rounded-xl text-xs text-text-main focus:outline-hidden focus:ring-2 focus:ring-primary/20 bg-bg-panel/50"
                id="client-search-input"
              />
            </div>

            {/* Manual ADD Button */}
            <button
              onClick={() => {
                setShowAddClientForm(!showAddClientForm);
                // Clear any residue inputs
                setNewClientName('');
                setNewClientPhone('');
                setNewClientLocation('');
              }}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all cursor-pointer shadow-xs select-none"
              id="crm-add-client-btn"
            >
              <UserPlus className="h-4 w-4" />
              <span>Register New Client</span>
            </button>
          </div>

          {/* New Client Manual Registration Card */}
          {showAddClientForm && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-bg-card border border-primary/20 rounded-2xl p-5 space-y-4 shadow-sm"
              id="crm-registration-form-panel"
            >
              <div className="flex items-center justify-between border-b border-border-card pb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <UserPlus className="h-4 w-4" /> Create New CRM Client Account
                </h3>
                <button 
                  onClick={() => setShowAddClientForm(false)}
                  className="text-text-muted hover:text-text-main text-xs font-bold"
                  id="crm-cancel-header-btn"
                >
                  ✕ Close
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="crm-register-inputs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Client Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Paul Adom"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="w-full h-10 px-3 border border-border-card rounded-xl text-xs text-text-main focus:ring-2 focus:ring-primary/20 bg-bg-panel"
                    id="crm-register-name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +233 50 123 4567"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="w-full h-10 px-3 border border-border-card rounded-xl text-xs text-text-main focus:ring-2 focus:ring-primary/20 bg-bg-panel"
                    id="crm-register-phone"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Primary Project Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Kumasi, Ghana"
                    value={newClientLocation}
                    onChange={(e) => setNewClientLocation(e.target.value)}
                    className="w-full h-10 px-3 border border-border-card rounded-xl text-xs text-text-main focus:ring-2 focus:ring-primary/20 bg-bg-panel"
                    id="crm-register-location"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2" id="crm-registration-footer-actions">
                <button
                  type="button"
                  onClick={() => setShowAddClientForm(false)}
                  className="px-4 py-2 border border-border-card text-xs font-bold text-text-muted hover:text-text-main rounded-xl cursor-pointer"
                  id="crm-cancel-register"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!newClientName.trim()) {
                      alert('Customer Name is a required field!');
                      return;
                    }

                    // Prevent duplicates
                    if (clients.some(c => c.name.toLowerCase() === newClientName.trim().toLowerCase())) {
                      alert('A client with this name already exists in your directory!');
                      return;
                    }

                    const newClientObj: Client = {
                      id: `C-${Date.now().toString().slice(-6)}`,
                      name: newClientName.trim(),
                      phone: newClientPhone.trim(),
                      defaultLocation: newClientLocation.trim(),
                      projectHistory: []
                    };

                    onUpdateClients([newClientObj, ...clients]);
                    setShowAddClientForm(false);
                    // Clear inputs
                    setNewClientName('');
                    setNewClientPhone('');
                    setNewClientLocation('');
                  }}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-black rounded-xl cursor-pointer"
                  id="crm-save-register"
                >
                  Register Account
                </button>
              </div>
            </motion.div>
          )}

          {/* Client directory output list */}
          {(() => {
            const query = clientSearch.toLowerCase().trim();
            const filtered = clients.filter(c => 
              c.name.toLowerCase().includes(query) ||
              (c.phone && c.phone.toLowerCase().includes(query)) ||
              (c.defaultLocation && c.defaultLocation.toLowerCase().includes(query))
            );

            if (filtered.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-12 px-4 rounded-3xl border border-dashed border-border-card bg-bg-card text-center" id="empty-crm-display">
                  <span className="text-3xl mb-3 block">👥</span>
                  <h4 className="font-bold text-text-main text-sm">No Client Profiles Match</h4>
                  <p className="text-text-muted text-xs mt-1 max-w-xs">
                    Try refining your spelling search parameters or register a new profile manually.
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="crm-cards-display-grid font-sans">
                {filtered.map(client => {
                  // Get client initials
                  const initials = client.name
                    ? client.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                    : 'C';

                  return (
                    <div 
                      key={client.id}
                      className="bg-bg-card border border-border-card p-5 rounded-2xl flex flex-col justify-between hover:border-text-muted transition-all"
                      id={`client-card-${client.id}`}
                    >
                      {/* Card Header Info */}
                      <div className="space-y-3" id={`client-header-${client.id}`}>
                        <div className="flex items-start justify-between">
                          {/* Left Avatar + Name Block */}
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-extrabold text-xs tracking-wider shrink-0" id={`client-initials-${client.id}`}>
                              {initials}
                            </div>
                            <div className="text-left">
                              <h3 className="text-sm font-bold text-text-main">{client.name}</h3>
                              <span className="text-[10px] text-text-muted uppercase font-black tracking-wider">
                                Client Account ID: {client.id}
                              </span>
                            </div>
                          </div>

                          {/* Close/Delete Action */}
                          <div onClick={(e) => e.stopPropagation()}>
                            {clientDeleteConfirmId === client.id ? (
                              <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 rounded-md p-1 animate-fade-in" id={`client-delete-block-${client.id}`}>
                                <button
                                  onClick={() => {
                                    onUpdateClients(clients.filter(c => c.id !== client.id));
                                    setClientDeleteConfirmId(null);
                                  }}
                                  className="px-2 py-1 text-[9px] font-black bg-red-600 hover:bg-red-550 text-white rounded-md cursor-pointer"
                                  id={`client-delete-confirm-btn-${client.id}`}
                                >
                                  Delete Profile
                                </button>
                                <button
                                  onClick={() => setClientDeleteConfirmId(null)}
                                  className="p-1 text-text-muted hover:text-text-main hover:bg-bg-panel rounded-md cursor-pointer"
                                  id={`client-delete-cancel-btn-${client.id}`}
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setClientDeleteConfirmId(client.id)}
                                className="p-1 text-text-muted hover:text-red-500 hover:bg-bg-panel rounded-lg transition-colors cursor-pointer"
                                title="Delete Client Profile Record"
                                id={`client-card-trash-btn-${client.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Contacts Detail */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border-card/50 text-[11px] text-text-muted" id={`client-details-grid-${client.id}`}>
                          <div className="flex items-center gap-1.5 justify-start" id={`client-phone-row-${client.id}`}>
                            <Phone className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                            {client.phone ? (
                              <a 
                                href={`tel:${client.phone}`}
                                className="font-bold hover:text-primary transition-colors hover:underline text-left block"
                              >
                                {client.phone}
                              </a>
                            ) : (
                              <span className="italic text-neutral-400 text-left">No contact phone added</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 justify-start text-left" id={`client-loc-row-${client.id}`}>
                            <MapPin className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                            <span className="truncate font-semibold text-text-main text-left" title={client.defaultLocation || 'N/A'}>
                              {client.defaultLocation || 'No default site location'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Project Invoice history Accordion block */}
                      <div className="mt-4 pt-3.5 border-t border-border-card font-sans" id={`client-history-block-${client.id}`}>
                        <span className="text-[10px] font-black uppercase text-text-muted block tracking-wide mb-1.5 text-left">
                          💼 Work History Ledger ({client.projectHistory?.length || 0})
                        </span>

                        {client.projectHistory && client.projectHistory.length > 0 ? (
                          <div className="space-y-1.5 max-h-[140px] overflow-y-auto scrollbar-none pr-1 animate-fade-in" id={`client-history-list-${client.id}`}>
                            {client.projectHistory.map((item, idx) => (
                              <div 
                                key={idx}
                                className="flex items-center justify-between p-2 rounded-xl bg-bg-panel/60 border border-border-card/40 text-[11px] hover:bg-bg-panel transition-all"
                                id={`client-history-item-${client.id}-${idx}`}
                              >
                                <div className="space-y-0.5 max-w-[70%] text-left">
                                  <span className="font-bold text-text-main truncate block text-left" title={item.projectName}>
                                    {item.projectName}
                                  </span>
                                  <span className="text-[9px] text-text-muted block text-left">
                                    Code: {item.estimateId} • {new Date(item.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                                  </span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-bold text-primary block">
                                    {formatCurrency(item.total)}
                                  </span>
                                  
                                  {/* Auto worksheet recall link */}
                                  {(() => {
                                    const estReference = recentEstimates.find(re => re.id === item.estimateId);
                                    if (estReference) {
                                      return (
                                        <button
                                          onClick={() => {
                                            onSelectEstimate(estReference);
                                            onNavigateToTab('estimate');
                                          }}
                                          className="text-[9px] font-bold text-primary hover:underline cursor-pointer"
                                          title="Open original materials breakdown and specs worksheet"
                                        >
                                          Open Worksheet ➜
                                        </button>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] italic text-neutral-400 py-1 text-left">No past quotes associated with this customer page yet.</p>
                        )}
                      </div>

                      {/* Direct start new quote & payments buttons for this specific client */}
                      <div className="mt-3.5 pt-2 border-t border-border-card/40 flex flex-col sm:flex-row gap-2" id={`client-action-footer-${client.id}`}>
                        <button
                          onClick={() => {
                            // Synthesize mock template or just seed estimator state with this customer info on trigger
                            const customEstSeed: Estimate = {
                              id: `EST-${Date.now().toString().slice(-6)}`,
                              clientName: client.name,
                              projectName: `${client.name}'s Service Contract`,
                              jobLocation: client.defaultLocation || 'Site Address',
                              trade: 'pop',
                              jobType: 'full',
                              unitType: 'sqm',
                              laborRate: 45,
                              wastePercent: 5,
                              transportFee: 0,
                              linearMeters: 100,
                              rooms: [{ id: '1', name: 'Living Room', l: 400, w: 400 }],
                              createdAt: new Date().toISOString(),
                              grandTotal: 0,
                              materialTotal: 0,
                              laborTotal: 0,
                              status: 'Draft',
                              photos: []
                            };
                            onSelectEstimate(customEstSeed);
                            onNavigateToTab('estimate');
                          }}
                          className="flex-1 py-1.5 bg-bg-panel hover:bg-primary/5 text-primary text-[11px] font-black rounded-xl border border-border-card flex items-center justify-center gap-1 transition-all cursor-pointer"
                          id={`client-seed-quote-btn-${client.id}`}
                        >
                          <PlusCircle className="h-3 w-3" />
                          <span>New Quote</span>
                        </button>

                        <button
                          onClick={() => {
                            onNavigateToTab('receipts');
                          }}
                          className="flex-1 py-1.5 bg-primary/5 hover:bg-primary/10 text-primary text-[11px] font-black rounded-xl border border-primary/10 flex items-center justify-center gap-1 transition-all cursor-pointer"
                          id={`client-record-payment-btn-${client.id}`}
                        >
                          <Receipt className="h-3 w-3" />
                          <span>Record Payment</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Useful tips banner */}
      <div className="rounded-2xl border border-amber-200/50 bg-amber-500/10 p-5 flex gap-4" id="market-tip">
        <span className="text-xl shrink-0">💡</span>
        <div className="space-y-1">
          <h5 className="text-xs font-bold text-amber-500 uppercase tracking-widest">Market Cost Advice</h5>
          <p className="text-xs text-text-muted leading-relaxed max-w-2xl dark:text-neutral-300">
            Material rate listings fluctuate weekly in Accra and Kumasi. Go to the <strong>Settings</strong> tab anytime to modify default commodity pricing (per bag, roll, or bucket) to guarantee your estimates are exactly aligned with real retail conditions.
          </p>
        </div>
      </div>

      {/* QUICK SHARE WHATSAPP MODAL POPUP */}
      {selectedShareEstimate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" id="share-quote-overlay">
          <div 
            className="bg-bg-card border border-border-card rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-slide-up"
            id="share-modal-container"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-border-card flex items-center justify-between bg-bg-panel">
              <div className="flex items-center gap-2">
                <span className="text-xl">✉️</span>
                <div>
                  <h3 className="font-bold text-text-main text-sm">Send Quote to Client</h3>
                  <p className="text-[10px] text-text-muted mt-0.5">Generate structured text quotation for instant WhatsApp sending</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedShareEstimate(null);
                  setCopiedSuccess(false);
                }}
                className="p-1.5 text-text-muted hover:text-text-main rounded-xl hover:bg-bg-panel transition-colors cursor-pointer"
                id="close-share-modal-btn"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Content / Dynamic Preview */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Quick Settings */}
              <div className="bg-bg-panel p-3.5 rounded-2xl border border-border-card/60 space-y-2">
                <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Set Contract Advance Deposit</span>
                <div className="flex items-center gap-1.5">
                  {[50, 60, 70, 80].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setShareDepositPercent(pct)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        shareDepositPercent === pct
                          ? 'bg-primary text-white font-extrabold shadow-sm'
                          : 'bg-bg-card hover:bg-border-card text-text-muted border border-border-card'
                      }`}
                      id={`share-pct-toggle-${pct}`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-text-muted leading-relaxed">
                  Adjusting the advance percentage dynamically updates the required mobilization deposit and remaining balances inside the text below.
                </p>
              </div>

              {/* Status Indicator inside the modal */}
              <div className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-1.5 text-text-muted">
                  <Smartphone className="h-4 w-4 text-emerald-600" />
                  <span>Interactive Text Summary</span>
                </div>
                {copiedSuccess && (
                  <span className="text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-md font-semibold text-[10px] flex items-center gap-1">
                    <Check className="h-3 w-3" /> Copied successfully!
                  </span>
                )}
              </div>

              {/* Textarea representation styled as an immersive chat screen */}
              <div className="relative rounded-2xl bg-neutral-950 text-neutral-200 border border-neutral-800 p-4 font-mono text-[11px] leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap select-text shadow-inner">
                {generateWhatsAppMessageForEstimate(selectedShareEstimate)}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-5 border-t border-border-card bg-bg-panel flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleCopyToClipboard(selectedShareEstimate)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-bg-card hover:bg-border-card border border-border-card px-4 py-3 text-xs font-bold text-text-main transition-colors cursor-pointer active:scale-98"
                id="copy-share-text-btn"
              >
                <Copy className="h-4 w-4 text-text-muted" />
                Copy Quote Text
              </button>
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(generateWhatsAppMessageForEstimate(selectedShareEstimate))}`}
                target="_blank"
                rel="noreferrer noopener"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] px-4 py-3 text-xs font-extrabold text-white transition-all shadow-md shadow-emerald-500/10 text-center active:scale-98"
                id="trigger-whatsapp-send-btn"
              >
                <MessageSquare className="h-4 w-4" />
                Send on WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
