import { motion } from 'motion/react';
import { Layers, Zap, PenTool, CheckCircle, FileSpreadsheet, Send, TrendingUp, Sliders, ShieldCheck, HeartHandshake } from 'lucide-react';

export default function FeaturesView() {
  const features = [
    {
      title: "🏗️ Multi-Trade Architecture",
      icon: Layers,
      color: "text-blue-500 bg-blue-50/50 border-blue-100",
      desc: "Built-in intelligence structures for POP Gypsum Ceilings, floor/wall Tile laying, and premium interior/exterior Painting, completely covering critical finishing milestones."
    },
    {
      title: "📏 Adaptive Dimension Sizing",
      icon: Zap,
      color: "text-amber-500 bg-amber-50/50 border-amber-100",
      desc: "Input raw complex rooms in centimeter lengths or switch to high-speed aggregate Linear meters depending on the selected craftsmanship standard."
    },
    {
      title: "⚙️ Custom Ratios & Baselines",
      icon: Sliders,
      color: "text-neutral-700 bg-neutral-100/50 border-neutral-200",
      desc: "Edit material formulas dynamically. Program how many buckets, cement bags, binders, spacers, or liters of thinning solvents are required per 100 square meters."
    },
    {
      title: "📑 Professional PDF Quotations",
      icon: FileSpreadsheet,
      color: "text-purple-500 bg-purple-50/50 border-purple-100",
      desc: "Compile detailed, elegant customer invoices in high-contrast styling ready for printing or instant PDF download. Perfect for immediate submission."
    },
    {
      title: "💬 Instant WhatsApp Sharing",
      icon: Send,
      color: "text-emerald-500 bg-emerald-50/50 border-emerald-100",
      desc: "Tap a button to compose beautifully formatted summary texts containing total measures, material items, transport fees, deposit obligations, and balance expectations."
    },
    {
      title: "💰 Smart Deposit Calculator",
      icon: TrendingUp,
      color: "text-red-500 bg-red-50/50 border-red-100",
      desc: "Configure 50%, 60%, 70%, or 80% contract deposit thresholds instantly to mobilize material procurement, clearly breaking down initial vs final balance due."
    },
    {
      title: "🚛 Logistics & Haulage Tracking",
      icon: PenTool,
      color: "text-indigo-500 bg-indigo-50/50 border-indigo-100",
      desc: "Allocate distinct flat-rate trucking, freight mobilization, or delivery surcharges so logistics fees are transparently accounted to the overall quote."
    },
    {
      title: "📉 Absolute Waste Contingency",
      icon: ShieldCheck,
      color: "text-teal-500 bg-teal-50/50 border-teal-100",
      desc: "Enforce standard 5%, 8%, or 10% material waste allowance to guarantee that natural site cuts, trims, breaks, and handling damages do not dilute your margins."
    },
    {
      title: "💎 Total White-Label Branding",
      icon: HeartHandshake,
      color: "text-pink-500 bg-pink-50/50 border-pink-100",
      desc: "Edit contractor profile cards in settings to update business legal names, locations, contact phone lines, and slogans so bills are uniquely branded."
    }
  ];

  return (
    <div className="space-y-8" id="features-showcase-container">
      {/* Page Header */}
      <div className="space-y-2 border-b border-neutral-200 pb-5" id="features-header">
        <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
          System Capability Matrix
        </h2>
        <p className="text-xs text-neutral-500 max-w-xl leading-relaxed">
          DzidEstimator is built with highly customizable formulas and custom contractor settings to provide precise material bills and white-labeled customer quotations in seconds.
        </p>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="features-card-grid">
        {features.map((feat, idx) => {
          const IconComponent = feat.icon;
          return (
            <div 
              key={idx}
              className="p-5 rounded-2xl border border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-xs transition-colors space-y-4"
              id={`feature-card-${idx}`}
            >
              <div className="flex items-center gap-3">
                <span className={`p-2 rounded-xl text-lg flex items-center justify-center border ${feat.color}`}>
                  <IconComponent className="h-4.5 w-4.5" />
                </span>
                <h4 className="font-bold text-neutral-900 text-sm">
                  {feat.title}
                </h4>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed">
                {feat.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Trust and validation footer banner */}
      <div className="p-6 rounded-2xl border border-neutral-200/80 bg-neutral-25 flex flex-col md:flex-row items-start md:items-center justify-between gap-4" id="features-trust-card">
        <div className="space-y-1">
          <h5 className="text-xs font-bold text-neutral-800">Need specific custom materials added?</h5>
          <p className="text-news-gray text-neutral-500 text-[11px] leading-relaxed max-w-xl">
            Contractors can easily adjust formulas to scale quantities perfectly. Go to Settings and load your specific trade configurations to edit, add cost rates, or re-structure the material requirements.
          </p>
        </div>
        <div className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1 shrink-0">
          ✓ Accra Retail Sourced Price Indices
        </div>
      </div>
    </div>
  );
}
