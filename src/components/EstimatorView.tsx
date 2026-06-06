import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Save, MapPin, User, File, Coins, Hammer, Info, RotateCcw, AlertCircle, Building, Camera, Image, Upload, XCircle, Phone } from 'lucide-react';
import { Room, Estimate, TradeKey, BaselinesType, BusinessProfile, EstimateStatus, Client } from '../types';
import { TRADE_CONFIG, DEFAULT_LABOR_RATES } from '../config';
import { getCurrencyInfo } from '../currency';
import ReceiptPreview from './ReceiptPreview';

interface EstimatorViewProps {
  baselines: BaselinesType;
  businessProfile: BusinessProfile;
  onSaveEstimate: (estimate: Estimate, clientPhone?: string) => void;
  activeEstimate: Estimate | null;
  onClearActiveEstimate: () => void;
  tradeJobs: Record<string, Record<string, string>>;
  tradeLabels: Record<string, string>;
  clients: Client[];
  onNavigateToTab?: (tab: 'home' | 'estimate' | 'settings' | 'features' | 'receipts') => void;
}

export default function EstimatorView({
  baselines,
  businessProfile,
  onSaveEstimate,
  activeEstimate,
  onClearActiveEstimate,
  tradeJobs,
  tradeLabels,
  clients,
  onNavigateToTab
 }: EstimatorViewProps) {
  // Local state for the inputs
  const [trade, setTrade] = useState<TradeKey>('pop');
  const [jobType, setJobType] = useState<string>('full');
  const [clientName, setClientName] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [jobLocation, setJobLocation] = useState<string>('');
  const [status, setStatus] = useState<EstimateStatus>('Draft');
  const [agreedPrice, setAgreedPrice] = useState<number | ''>('');
  const [sealed, setSealed] = useState<boolean>(false);
  const [materialsBoughtBy, setMaterialsBoughtBy] = useState<'Contractor' | 'Client'>('Contractor');
  const [viewMode, setViewMode] = useState<'editor' | 'pdf'>('editor');
  
  const [unitType, setUnitType] = useState<'sqm' | 'lm'>('sqm');
  const [laborRate, setLaborRate] = useState<number>(45);
  const [wastePercent, setWastePercent] = useState<number>(5);
  const [transportFee, setTransportFee] = useState<number>(0);
  
  const [linearMeters, setLinearMeters] = useState<number>(100);
  const [rooms, setRooms] = useState<Room[]>([
    { id: '1', name: 'Living Room', l: 400, w: 400 } // pre-populate with one room
  ]);

  const cur = businessProfile.currency || 'GHS';
  const { symbol, locale } = getCurrencyInfo(cur);

  const [photos, setPhotos] = useState<string[]>([]);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState<boolean>(false);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-save feedback states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loadedEstimateId, setLoadedEstimateId] = useState<string | null>(null);

  // Sync with active estimate if loaded from home screen
  useEffect(() => {
    if (activeEstimate && activeEstimate.id !== loadedEstimateId) {
      setTrade(activeEstimate.trade);
      setJobType(activeEstimate.jobType);
      setClientName(activeEstimate.clientName);
      setProjectName(activeEstimate.projectName);
      setJobLocation(activeEstimate.jobLocation || '');
      setUnitType(activeEstimate.unitType);
      setLaborRate(activeEstimate.laborRate);
      setWastePercent(activeEstimate.wastePercent);
      setTransportFee(activeEstimate.transportFee);
      setLinearMeters(activeEstimate.linearMeters);
      setRooms(activeEstimate.rooms);
      setStatus(activeEstimate.status || 'Draft');
      setPhotos(activeEstimate.photos || []);
      setAgreedPrice(activeEstimate.agreedPrice !== undefined ? activeEstimate.agreedPrice : '');
      setSealed(activeEstimate.sealed || false);
      setMaterialsBoughtBy(activeEstimate.materialsBoughtBy || 'Contractor');
      setLoadedEstimateId(activeEstimate.id);
      setLastSaved(null); // Clear previous visual saved stamp since new item is loaded
      if (activeEstimate.sealed) {
        setViewMode('pdf');
      } else {
        setViewMode('editor');
      }

      // Find client with matching name
      const matched = clients.find(c => c.name.toLowerCase() === activeEstimate.clientName.toLowerCase());
      if (matched) {
        setSelectedClientId(matched.id);
        setClientPhone(matched.phone || '');
      } else {
        setSelectedClientId('new');
        setClientPhone('');
      }
    } else if (!activeEstimate && loadedEstimateId !== null) {
      setLoadedEstimateId(null);
      setLastSaved(null);
      setAgreedPrice('');
      setSealed(false);
      setMaterialsBoughtBy('Contractor');
      setViewMode('editor');
    }
  }, [activeEstimate, loadedEstimateId, clients]);

  // Handle Trade select change
  const handleTradeChange = (newTrade: TradeKey) => {
    setTrade(newTrade);
    // Auto selected first job of new trade
    const standardJobKeys = Object.keys(tradeJobs[newTrade] || {});
    const firstJob = standardJobKeys[0] || 'full';
    setJobType(firstJob);
    
    // Auto determine default labor rate
    const standardRate = DEFAULT_LABOR_RATES[newTrade]?.[firstJob] || 45;
    setLaborRate(standardRate);

    // Override measuring unit type for cornice automatically
    if (newTrade === 'pop' && firstJob === 'cornice') {
      setUnitType('lm');
    } else {
      setUnitType('sqm');
    }
  };

  // Handle Job select change
  const handleJobTypeChange = (newJob: string) => {
    setJobType(newJob);
    const standardRate = DEFAULT_LABOR_RATES[trade]?.[newJob] || 45;
    setLaborRate(standardRate);

    if (trade === 'pop' && newJob === 'cornice') {
      setUnitType('lm');
    } else {
      setUnitType('sqm');
    }
  };

  // Handle unit radio click
  const handleUnitTypeChange = (unit: 'sqm' | 'lm') => {
    setUnitType(unit);
  };

  // Room list actions
  const addRoom = () => {
    const nextId = (rooms.length + 1).toString();
    const cleanRoomName = rooms.length === 0 ? 'Living Room' : `Room ${nextId}`;
    setRooms([...rooms, { id: nextId, name: cleanRoomName, l: 400, w: 400 }]);
  };

  const removeRoom = (id: string) => {
    setRooms(rooms.filter(r => r.id !== id));
  };

  const updateRoom = (id: string, field: 'name' | 'l' | 'w', value: any) => {
    setRooms(rooms.map(r => {
      if (r.id === id) {
        return { ...r, [field]: value };
      }
      return r;
    }));
  };

  const resetForm = () => {
    setTrade('pop');
    setJobType('full');
    setClientName('');
    setClientPhone('');
    setSelectedClientId('');
    setProjectName('');
    setJobLocation('');
    setUnitType('sqm');
    setLaborRate(45);
    setWastePercent(5);
    setTransportFee(0);
    setLinearMeters(100);
    setRooms([{ id: '1', name: 'Living Room', l: 400, w: 400 }]);
    setStatus('Draft');
    setAgreedPrice('');
    setSealed(false);
    setMaterialsBoughtBy('Contractor');
    setPhotos([]);
    onClearActiveEstimate();
    setLoadedEstimateId(null);
    setLastSaved(null);
    triggerToast('success', 'Form inputs reset successfully');
  };

  // AUTO-SAVE FEATURE (PERSISTS TO LOCALSTORAGE VIA PARENT CALLBACK EVERY FEW SECONDS)
  useEffect(() => {
    if (sealed) {
      return;
    }

    // Only auto-save if something has actually changed/user has modified the blank state
    const isDirty = clientName.trim() !== '' || 
                    projectName.trim() !== '' || 
                    jobLocation.trim() !== '' || 
                    rooms.length !== 1 || 
                    rooms[0]?.name !== 'Living Room' || 
                    rooms[0]?.l !== 400 || 
                    rooms[0]?.w !== 400 || 
                    photos.length > 0;

    if (!activeEstimate && !isDirty) {
      return;
    }

    // Capture the latest calculated parameters inside effect
    const totalMeasureVal = getMeasurementTotal();
    const tradeBaselinesVal = baselines[trade]?.[jobType] || {};
    const materialsBreakdownVal = Object.keys(tradeBaselinesVal).map(itemName => {
      const base = tradeBaselinesVal[itemName];
      if (!base) return { name: itemName, qty: 0, price: 0, cost: 0, unit: '' };
      let calculatedQty = base.fixed ? base.qty : (base.qty / 100) * totalMeasureVal;
      if (!base.fixed) {
        calculatedQty = calculatedQty * (1 + wastePercent / 100);
      }
      return {
        name: itemName,
        qty: calculatedQty,
        price: base.price,
        cost: calculatedQty * base.price,
        unit: base.unit
      };
    });
    const materialTotalVal = materialsBreakdownVal.reduce((sum, item) => sum + item.cost, 0);
    const laborTotalVal = totalMeasureVal * laborRate;
    const grandTotalVal = (materialsBoughtBy === 'Client' ? 0 : materialTotalVal) + laborTotalVal + transportFee;

    const delayTimer = setTimeout(() => {
      setIsSaving(true);
      
      const saveTimer = setTimeout(() => {
        // Build fresh estimate object preserving or assigning unique ID
        const activeId = activeEstimate?.id || `E8-QT-${Date.now().toString().slice(-6)}`;
        const estimateObj: Estimate = {
          id: activeId,
          clientName: clientName || `Customer-${activeId.slice(-4)}`,
          projectName: projectName || 'General Service Rendering',
          jobLocation: jobLocation || 'Site',
          trade,
          jobType,
          unitType,
          laborRate,
          wastePercent,
          transportFee,
          linearMeters,
          rooms,
          createdAt: activeEstimate?.createdAt || new Date().toISOString(),
          grandTotal: grandTotalVal,
          materialTotal: materialTotalVal,
          laborTotal: laborTotalVal,
          status,
          photos,
          agreedPrice: agreedPrice !== '' ? Number(agreedPrice) : undefined,
          sealed,
          materialsBoughtBy
        };

        // Silent save call to parent
        onSaveEstimate(estimateObj);
        setLoadedEstimateId(activeId); // Update loaded ID so sync effect doesn't get triggered
        setLastSaved(new Date());
        setIsSaving(false);
      }, 500);

      return () => clearTimeout(saveTimer);
    }, 2500); // 2.5 seconds debounce while typing

    return () => clearTimeout(delayTimer);
  }, [
    clientName,
    projectName,
    jobLocation,
    trade,
    jobType,
    unitType,
    laborRate,
    wastePercent,
    transportFee,
    linearMeters,
    rooms,
    photos,
    status,
    agreedPrice,
    sealed,
    materialsBoughtBy
  ]);

  const handleSealEstimate = () => {
    if (!agreedPrice || Number(agreedPrice) <= 0) {
      triggerToast('error', 'Please enter a valid compulsory Agreed Price first!');
      return;
    }
    
    setSealed(true);
    
    const activeId = activeEstimate?.id || `E8-QT-${Date.now().toString().slice(-6)}`;
    
    const totalMeasureVal = getMeasurementTotal();
    const tradeBaselinesVal = baselines[trade]?.[jobType] || {};
    const materialsBreakdownVal = Object.keys(tradeBaselinesVal).map(itemName => {
      const base = tradeBaselinesVal[itemName];
      if (!base) return { name: itemName, qty: 0, price: 0, cost: 0, unit: '' };
      let calculatedQty = base.fixed ? base.qty : (base.qty / 100) * totalMeasureVal;
      if (!base.fixed) {
        calculatedQty = calculatedQty * (1 + wastePercent / 100);
      }
      return {
        name: itemName,
        qty: calculatedQty,
        price: base.price,
        cost: calculatedQty * base.price,
        unit: base.unit
      };
    });
    const materialTotal = materialsBreakdownVal.reduce((sum, item) => sum + item.cost, 0);
    const laborTotal = totalMeasureVal * laborRate;
    const grandTotal = (materialsBoughtBy === 'Client' ? 0 : materialTotal) + laborTotal + transportFee;

    const estimateObj: Estimate = {
      id: activeId,
      clientName: clientName || `Customer-${activeId.slice(-4)}`,
      projectName: projectName || 'General Service Rendering',
      jobLocation: jobLocation || 'Site',
      trade,
      jobType,
      unitType,
      laborRate,
      wastePercent,
      transportFee,
      linearMeters,
      rooms,
      createdAt: activeEstimate?.createdAt || new Date().toISOString(),
      grandTotal,
      materialTotal,
      laborTotal,
      status: 'Accepted',
      photos,
      agreedPrice: Number(agreedPrice),
      sealed: true,
      materialsBoughtBy
    };
    
    onSaveEstimate(estimateObj, clientPhone);
    triggerToast('success', 'Estimate sealed and locked successfully! Opening payment and receipts workspace...');
    
    if (onNavigateToTab) {
      onNavigateToTab('receipts');
    }
  };

  // Helper to trigger toast notifications
  const triggerToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // PHOTO & CAMERA MANAGEMENT HANDLERS
  const [expandedPhotoUrl, setExpandedPhotoUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);

  const handleStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      });
      setCameraStream(stream);
      setShowCamera(true);
      triggerToast('success', 'Camera feed started successfully!');
    } catch (err: any) {
      console.error(err);
      triggerToast('error', 'Camera access was rejected or is unavailable.');
    }
  };

  const handleStopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const handleCapturePhoto = () => {
    const video = document.getElementById('contractor-camera-feed') as HTMLVideoElement | null;
    if (video) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhotos((prev) => [...prev, dataUrl]);
        triggerToast('success', 'Attached captured site photo to estimate.');
      }
    }
    handleStopCamera();
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      selectedFiles.forEach((file: any) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setPhotos((prev) => [...prev, event.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
      triggerToast('success', `Added ${selectedFiles.length} photo(s) to this calculation record.`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter((f: any) => f.type.startsWith('image/'));
      droppedFiles.forEach((file: any) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setPhotos((prev) => [...prev, event.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
      if (droppedFiles.length > 0) {
        triggerToast('success', `Imported ${droppedFiles.length} photo(s).`);
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    triggerToast('success', 'Photo removed.');
  };

  // CALCULATIONS ENGINE
  const getMeasurementTotal = () => {
    if (unitType === 'lm') {
      return linearMeters;
    }
    // Convert cm to m for area, sum up rooms area
    return rooms.reduce((acc, r) => {
      const area = (r.l * r.w) / 10000; // cm² to m²
      return acc + area;
    }, 0);
  };

  const calculateMaterials = () => {
    const totalMeasure = getMeasurementTotal();
    const tradeBaselines = baselines[trade]?.[jobType] || {};
    
    return Object.keys(tradeBaselines).map(itemName => {
      const base = tradeBaselines[itemName];
      if (!base) return { name: itemName, qty: 0, price: 0, cost: 0, unit: '' };
      
      // Fixed items (like boards) don't scale or multiply
      let calculatedQty = base.fixed ? base.qty : (base.qty / 100) * totalMeasure;
      
      // Proportional items get waste contingency coefficient applied
      if (!base.fixed) {
        calculatedQty = calculatedQty * (1 + wastePercent / 100);
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

  const materialsBreakdown = calculateMaterials();
  const materialTotal = materialsBreakdown.reduce((sum, item) => sum + item.cost, 0);
  
  const totalMeasure = getMeasurementTotal();
  const laborTotal = totalMeasure * laborRate;
  const grandTotal = (materialsBoughtBy === 'Client' ? 0 : materialTotal) + laborTotal + transportFee;

  // Auto-set agreedPrice to grandTotal when status is set to Accepted but agreedPrice is empty
  useEffect(() => {
    if (status === 'Accepted' && !sealed && (agreedPrice === '' || Number(agreedPrice) <= 0)) {
      setAgreedPrice(Math.round(grandTotal));
    }
  }, [status, sealed, grandTotal, agreedPrice]);

  const handleSave = () => {
    if (sealed) {
      triggerToast('error', 'This estimate is Sealed and Locked. No edits can be saved.');
      return;
    }

    if (!clientName.trim()) {
      triggerToast('error', 'Customer Name is required to save an estimate!');
      setTimeout(() => {
        document.getElementById('client-name-input')?.focus();
      }, 50);
      return;
    }

    if (status === 'Accepted' && !sealed) {
      triggerToast('error', 'Compulsory: Since the status is "Accepted", you must enter the Agreed Price and click "Seal & Lock Estimate" below!');
      return;
    }

    const estimateObj: Estimate = {
      id: activeEstimate?.id || `EST-${Date.now().toString().slice(-6)}`,
      clientName: clientName.trim(),
      projectName: projectName.trim() || 'General Service Rendering',
      jobLocation: jobLocation.trim() || 'Site',
      trade,
      jobType,
      unitType,
      laborRate,
      wastePercent,
      transportFee,
      linearMeters,
      rooms,
      createdAt: activeEstimate?.createdAt || new Date().toISOString(),
      grandTotal,
      materialTotal,
      laborTotal,
      status,
      photos,
      agreedPrice: agreedPrice !== '' ? Number(agreedPrice) : undefined,
      sealed,
      materialsBoughtBy
    };

    onSaveEstimate(estimateObj, clientPhone);
    triggerToast('success', `Estimate for ${estimateObj.clientName} saved successfully!`);
    setViewMode('pdf');
  };

  return (
    <div className="space-y-6" id="estimator-workspace-parent">
      {/* Toast Notification */}
      {notification && (
        <div 
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold ${notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-805' : 'bg-red-50 border-red-200 text-red-805'}`}
          id="toast-notification"
        >
          {notification.type === 'success' ? '✅' : '❌'}
          {notification.message}
        </div>
      )}

      {/* View Mode Switching Tabs Selector */}
      {!(status === 'Accepted' && !sealed) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-neutral-100 p-1.5 rounded-2xl border border-neutral-200/60" id="estimator-view-mode-tabs">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black tracking-wide transition-all flex items-center justify-center gap-1.5 ${
                viewMode === 'editor'
                  ? 'bg-white text-neutral-900 shadow-xs border border-neutral-205 shadow-neutral-100'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
              id="workspace-tab-editor"
            >
              ✏️ Calculator Estimator
            </button>
            <button
              type="button"
              onClick={() => {
                if (!clientName.trim()) {
                  triggerToast('error', 'Customer Name is required to load PDF Quotation View!');
                  return;
                }
                setViewMode('pdf');
              }}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black tracking-wide transition-all flex items-center justify-center gap-1.5 ${
                viewMode === 'pdf'
                  ? 'bg-white text-neutral-900 shadow-xs border border-neutral-205 shadow-neutral-100'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
              id="workspace-tab-pdf"
            >
              📑 PDF Quote Preview
            </button>
          </div>

          {clientName && (
            <div className="text-[10px] text-neutral-500 font-extrabold uppercase tracking-widest px-3 text-right hidden sm:block">
              Project: {projectName || 'General Service'} • Client: {clientName}
            </div>
          )}
        </div>
      )}

      {status === 'Accepted' && !sealed ? (
        <div className="max-w-xl mx-auto space-y-6 animate-fade-in py-4" id="workspace-unsealed-contract-sealing">
          <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-8 space-y-6 shadow-sm">
            
            {/* Header Block */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 text-amber-605 text-xl font-bold border border-amber-200" id="seal-header-shield">
                🔒
              </div>
              <h2 className="text-sm font-black text-neutral-900 tracking-wide uppercase">Seal &amp; Lock Approved Contract</h2>
              <p className="text-[11px] text-neutral-500 leading-relaxed max-w-sm mx-auto">
                This estimate has been marked as <span className="font-extrabold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">Accepted</span>. Sealing confirms the final contract price and freezes parameter editing for strict financial auditing.
              </p>
            </div>

            {/* Reference summary panel */}
            <div className="rounded-2xl border border-neutral-100 bg-neutral-25/40 p-4.5 space-y-3.5" id="seal-reference-summary-bg">
              <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-100 pb-1.5">
                Calculation Reference Details
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs">
                <div>
                  <span className="text-neutral-400 block text-[9px] uppercase tracking-wide">Customer Name</span>
                  <strong className="text-neutral-900 font-bold max-w-[150px] truncate block" title={clientName || 'N/A'}>
                    {clientName || 'N/A'}
                  </strong>
                  <span className="text-neutral-500 text-[10px] block truncate">{projectName || 'General Service'}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[9px] uppercase tracking-wide">Site Location</span>
                  <strong className="text-neutral-900 font-bold truncate block">{jobLocation || 'Site'}</strong>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[9px] uppercase tracking-wide">Trade Specialty</span>
                  <strong className="text-neutral-905 font-bold uppercase">{trade} • {jobType}</strong>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[9px] uppercase tracking-wide">Calculated Cost Sum</span>
                  <strong className="text-neutral-905 font-extrabold font-mono text-xs">
                    {symbol}{Number(grandTotal).toLocaleString(locale, { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>
            </div>

            {/* Core sealing inputs */}
            <div className="space-y-6" id="sealing-control-form">
              
              {/* Who is buying materials selection */}
              <div className="space-y-3" id="materials-buyer-question-panel">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                  Who is purchasing the construction materials? *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="materials-buyer-options">
                  <button
                    type="button"
                    onClick={() => {
                      setMaterialsBoughtBy('Contractor');
                      setAgreedPrice(Math.round(materialTotal + laborTotal + transportFee));
                    }}
                    className={`flex flex-col text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      materialsBoughtBy === 'Contractor'
                        ? 'border-neutral-900 bg-neutral-950 text-white shadow-xs'
                        : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800'
                    }`}
                    id="materials-buyer-contractor-btn"
                  >
                    <span className="text-xs font-black block">🏗️ Contractor (We Buy)</span>
                    <span className={`text-[10px] mt-1 block leading-normal ${materialsBoughtBy === 'Contractor' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                      We purchase all supplies. Materials total ({symbol}{materialTotal.toLocaleString(locale, { minimumFractionDigits: 2 })}) is included in calculations.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMaterialsBoughtBy('Client');
                      setAgreedPrice(Math.round(laborTotal + transportFee));
                    }}
                    className={`flex flex-col text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      materialsBoughtBy === 'Client'
                        ? 'border-neutral-900 bg-neutral-950 text-white shadow-xs'
                        : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800'
                    }`}
                    id="materials-buyer-client-btn"
                  >
                    <span className="text-xs font-black block">👤 Client (Client Buys)</span>
                    <span className={`text-[10px] mt-1 block leading-normal ${materialsBoughtBy === 'Client' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                      Client procures their own materials. We charge ONLY for Labor and Transport (calculations exclude materials cost).
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center justify-between">
                  <span>Agreed Contract Price ({symbol}) *</span>
                  <span className="text-[8px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded uppercase font-mono">Compulsory</span>
                </label>
                <div className="relative font-sans">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 select-none">
                    {symbol}
                  </span>
                  <input
                    type="number"
                    required
                    placeholder={`e.g. ${grandTotal.toFixed(0)}`}
                    value={agreedPrice === '' ? '' : agreedPrice}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setAgreedPrice(val);
                    }}
                    className="w-full h-11 pl-9 pr-3 border border-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-amber-55/10 focus:border-amber-400 rounded-xl text-xs font-mono font-bold text-neutral-900 bg-white"
                    id="seal-agreed-contract-price-input"
                  />
                </div>
                <p className="text-[10px] text-neutral-400 leading-normal">
                  Specify the final contract price agreed with the client. It defaults to the calculated cost of <span className="font-semibold text-neutral-600">{symbol}{Number(grandTotal).toLocaleString(locale, { minimumFractionDigits: 2 })}</span> but can be adjusted to reflect negotiated roundings.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleSealEstimate}
                  disabled={!agreedPrice || Number(agreedPrice) <= 0}
                  className="inline-flex h-10 items-center justify-center gap-1.5 px-4 w-full bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition-colors cursor-pointer"
                  id="seal-estimate-action-btn"
                >
                  🔒 Seal &amp; Lock Contract
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStatus('Draft');
                    setAgreedPrice('');
                  }}
                  className="inline-flex h-10 items-center justify-center gap-1.5 px-4 w-full bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-500 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  id="revert-to-calculator-action"
                >
                  ✏️ Return to Editor (Reset to Draft)
                </button>
              </div>
            </div>

          </div>
        </div>
      ) : viewMode === 'editor' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in" id="estimator-workspace">
          {/* Inputs Column (Left Side) */}
          <div className="lg:col-span-7 space-y-6" id="input-controls-column">
        {activeEstimate && (
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-blue-100 bg-blue-50/80 text-xs text-blue-800 font-semibold" id="editing-mode-badge border">
            <span className="flex items-center gap-1.5">
              <Info className="h-4 w-4" />
              Editing existing estimate: {activeEstimate.id}
            </span>
            <button 
              onClick={onClearActiveEstimate}
              className="text-blue-600 hover:text-blue-800 hover:underline underline-offset-2"
              title="Return to empty template"
            >
              Start New Instead
            </button>
          </div>
        )}

        {sealed && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-xs text-neutral-850 font-semibold" id="sealed-contract-banner">
            <span className="text-sm select-none">🔒</span>
            <div className="space-y-1">
              <h4 className="text-[11px] font-black text-neutral-950 uppercase tracking-wider">Sealed Contract (Read-Only)</h4>
              <p className="text-[10px] font-normal leading-normal text-neutral-500">
                This estimate has been locked with an agreed contract price of <strong className="text-emerald-700 font-bold">{symbol}{Number(agreedPrice).toLocaleString(locale, { minimumFractionDigits: 2 })}</strong>. All parameters have been locked to preserve auditing compliance. We have frozen standard editing for this worksheet.
              </p>
            </div>
          </div>
        )}

        <fieldset disabled={sealed} className="space-y-6 block w-full">
          {/* Client & Project Profile */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4 shadow-xs" id="quotation-target-profile">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <User className="h-4 w-4 text-neutral-500" />
              1. Customer &amp; Location Profile
            </h3>
            <button
              onClick={resetForm}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-500 hover:text-neutral-800"
              title="Reset all fields"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Inputs
            </button>
          </div>

          {/* Registration-First Workflow Banner */}
          {(!clientName || selectedClientId === 'new') && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-200/50 rounded-xl flex items-start gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 p-4" id="client-registration-onboarding">
              <span className="text-sm shrink-0">⭐️</span>
              <div className="space-y-1">
                <p className="font-extrabold text-[11px] uppercase tracking-wider text-amber-600 dark:text-amber-400">Onboarding Priority Checklist</p>
                <p className="leading-relaxed text-neutral-600 dark:text-neutral-300">
                  Registering your client first in the directory is highly recommended! Select from the dropdown list below, or head over to the <span className="font-extrabold underline cursor-pointer text-primary hover:text-primary-hover" onClick={() => onNavigateToTab && onNavigateToTab('home')}>Dashboard ➜ Clients Directory</span> to register them.
                </p>
              </div>
            </div>
          )}

          {/* Directory Select Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2 border-b border-neutral-100" id="client-directory-search-row">
            <div className="space-y-1" id="client-select-container">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary shrink-0" /> Select Client from Directory
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => {
                  const cid = e.target.value;
                  setSelectedClientId(cid);
                  if (cid === 'new' || cid === '') {
                    setClientName('');
                    setClientPhone('');
                    setJobLocation('');
                  } else {
                    const found = clients.find(c => c.id === cid);
                    if (found) {
                      setClientName(found.name);
                      setClientPhone(found.phone || '');
                      setJobLocation(found.defaultLocation || '');
                    }
                  }
                }}
                className="w-full h-10 px-3 border border-neutral-200 rounded-xl text-xs text-neutral-800 bg-white font-semibold cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                id="client-directory-select"
              >
                <option value="new">➕ Type Custom / New Client Profile</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    👥 {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-[11px] text-neutral-500 flex items-center bg-neutral-50 rounded-xl p-3 border border-neutral-100 shrink-0" id="client-directory-helper-box">
              {selectedClientId && selectedClientId !== 'new' ? (
                <p className="leading-snug">
                  Selected client has <strong className="text-primary">{clients.find(c => c.id === selectedClientId)?.projectHistory?.length || 0}</strong> historical estimates stored in local storage database.
                </p>
              ) : (
                <p className="leading-snug">
                  Fill in details below. Saving your estimate will automatically create or update this client inside your persistent database.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3" id="profile-detailed-inputs-grid">
            <div className="space-y-1" id="client-name-container">
              <label className="text-[10px] font-semibold text-neutral-500 flex items-center justify-between">
                <span className="flex items-center gap-1"><User className="h-3 w-3 text-neutral-400" /> Customer Name</span>
                <span className="text-[9px] text-red-500 font-bold uppercase tracking-wider">Required *</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Kwame Boateng"
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value);
                  const matched = clients.find(c => c.name.toLowerCase() === e.target.value.toLowerCase());
                  if (matched) {
                    setSelectedClientId(matched.id);
                    setClientPhone(matched.phone || '');
                  } else {
                    setSelectedClientId('new');
                  }
                }}
                className="w-full h-10 px-3 border border-neutral-200 rounded-xl text-xs text-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                id="client-name-input"
              />
            </div>

            <div className="space-y-1" id="client-phone-container">
              <label className="text-[10px] font-semibold text-neutral-500 flex items-center gap-1">
                <Phone className="h-3 w-3 text-neutral-400" /> Customer Phone
              </label>
              <input
                type="text"
                placeholder="e.g. +233 24 123 4567"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full h-10 px-3 border border-neutral-200 rounded-xl text-xs text-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                id="client-phone-input"
              />
            </div>

            <div className="space-y-1" id="project-name-container">
              <label className="text-[10px] font-semibold text-neutral-500 flex items-center gap-1">
                <Building className="h-3 w-3 text-neutral-400" /> Project Title
              </label>
              <input
                type="text"
                placeholder="e.g. 4-Bedroom Plastering"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full h-10 px-3 border border-neutral-200 rounded-xl text-xs text-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                id="project-name-input"
              />
            </div>

            <div className="space-y-1" id="job-location-container">
              <label className="text-[10px] font-semibold text-neutral-500 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-neutral-400" /> Site Location
              </label>
              <input
                type="text"
                placeholder="e.g. East Legon, Accra"
                value={jobLocation}
                onChange={(e) => setJobLocation(e.target.value)}
                className="w-full h-10 px-3 border border-neutral-200 rounded-xl text-xs text-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                id="job-location-input"
              />
            </div>

            <div className="space-y-1" id="job-status-container">
              <label className="text-[10px] font-semibold text-neutral-500 flex items-center gap-1">
                <Info className="h-3 w-3 text-neutral-400" /> Estimate Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EstimateStatus)}
                className="w-full h-10 px-3 border border-neutral-200 rounded-xl text-xs text-neutral-800 bg-white font-semibold cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                id="job-status-select"
              >
                <option value="Draft">Draft 📝</option>
                <option value="Sent">Sent ✉️</option>
                <option value="Accepted">Accepted ✅</option>
                <option value="Completed">Completed 🎉</option>
              </select>
            </div>

            {/* CONTRACT SEALING PANEL FOR ACCEPTED STATUS */}
            {status === 'Accepted' && !sealed && (
              <div className="col-span-1 sm:col-span-2 lg:col-span-5 p-4 rounded-xl border-2 border-amber-250 bg-amber-50 text-amber-800 space-y-3 mt-2 transition-all animate-pulse-slow" id="contract-sealing-module">
                <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  ⚠️ Finalization Required: Agreed Contract Price
                </h4>
                <p className="text-[10px] leading-relaxed opacity-95 font-medium">
                  Entering an Agreed Contract Price is compulsory once the estimate is Accepted. Please enter the agreed price and click "Seal & Lock Estimate". Once sealed, this estimate will lock permanently and can no longer be modified. This agreed price will carry over for payment receipt calculations.
                </p>
                
                <div className="space-y-1 max-w-xs">
                  <label className="text-[9px] uppercase font-bold tracking-widest opacity-80">
                    Agreed Price ({symbol}) *
                  </label>
                  <div className="relative font-sans">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                      {symbol}
                    </span>
                    <input
                      type="number"
                      required
                      placeholder={`e.g. ${grandTotal.toFixed(0)}`}
                      value={agreedPrice}
                      disabled={sealed}
                      onChange={(e) => {
                        if (sealed) return;
                        const val = e.target.value === '' ? '' : Number(e.target.value);
                        setAgreedPrice(val);
                      }}
                      className="w-full h-10 pl-9 pr-3 border border-neutral-200 rounded-xl text-xs font-mono font-bold bg-white text-neutral-900 disabled:bg-neutral-100 disabled:text-neutral-500 disabled:border-neutral-300 disabled:cursor-not-allowed"
                      id="agreed-contract-price-input"
                    />
                  </div>
                </div>

                {!sealed && (
                  <button
                    type="button"
                    onClick={handleSealEstimate}
                    disabled={!agreedPrice || Number(agreedPrice) <= 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-950 hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white text-[11px] font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    id="seal-estimate-action"
                  >
                    🔒 Seal &amp; Lock Estimate
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Trade and Job Type Section */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-5 shadow-xs" id="group-trade-selectors">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Coins className="h-4.5 w-4.5 text-neutral-500" />
              2. Trade &amp; Job Specialty
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" id="trade-tabs">
            {Object.keys(tradeLabels).map((tKey) => {
              const isActive = trade === tKey;
              const label = tradeLabels[tKey] || tKey;
              const defaultIcons: Record<string, string> = {
                pop: "🏗️",
                tiling: "📐",
                painting: "🎨"
              };
              const icon = defaultIcons[tKey] || "🛠️";
              return (
                <button
                  key={tKey}
                  onClick={() => handleTradeChange(tKey as TradeKey)}
                  className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border ${
                    isActive 
                      ? 'bg-neutral-900 border-neutral-950 text-white shadow-sm' 
                      : 'bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                  }`}
                  id={`calc-trade-tab-${tKey}`}
                >
                  {icon} {label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5" id="job-type-selection-container">
              <label className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">Project Specialty</label>
              <select
                value={jobType}
                onChange={(e) => handleJobTypeChange(e.target.value)}
                className="w-full h-11 px-3 bg-white border border-neutral-200 rounded-xl text-xs font-medium text-neutral-800 focus:outline-hidden focus:ring-1 focus:ring-neutral-950 transition-shadow shadow-xs cursor-pointer"
                id="job-type-select"
              >
                {Object.entries(tradeJobs[trade] || {}).map(([key, name]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5" id="assessment-unit-container">
              <label className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">Measurement Standard</label>
              <div className="grid grid-cols-2 gap-2 h-11" id="assessment-unit-toggles">
                <button
                  type="button"
                  onClick={() => handleUnitTypeChange('sqm')}
                  className={`inline-flex items-center justify-center rounded-xl text-xs font-bold transition-all border ${
                    unitType === 'sqm' 
                      ? 'bg-neutral-100 border-neutral-300 text-neutral-900 font-extrabold' 
                      : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                  }`}
                  id="assessment-unit-sqm"
                >
                  Area (m²)
                </button>
                <button
                  type="button"
                  onClick={() => handleUnitTypeChange('lm')}
                  className={`inline-flex items-center justify-center rounded-xl text-xs font-bold transition-all border ${
                    unitType === 'lm' 
                      ? 'bg-neutral-100 border-neutral-300 text-neutral-900 font-extrabold' 
                      : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                  }`}
                  id="assessment-unit-lm"
                >
                  Linear (m)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* DIMENSIONS ENTRY CODES */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4 shadow-xs" id="dimensions-module">
          {unitType === 'sqm' ? (
            /* Area Room Measure list */
            <div className="space-y-4" id="room-measurements-panel">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                    <File className="h-4 w-4 text-neutral-500" />
                    3. Site Area Calculations
                  </h3>
                  <p className="text-[11px] text-neutral-500">Provide Length &amp; Width in <strong>centimeters (cm)</strong>. 100cm = 1m.</p>
                </div>
                <button
                  type="button"
                  onClick={addRoom}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 text-xs font-bold text-blue-700 transition-colors"
                  id="add-room-btn"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Room
                </button>
              </div>

              {rooms.length === 0 ? (
                <div className="p-6 border border-neutral-200 rounded-xl text-center text-xs text-neutral-500 bg-neutral-25">
                  No rooms cataloged yet. Tap &apos;Add Room&apos; above to begin.
                </div>
              ) : (
                <div className="space-y-3" id="rooms-grid">
                  {rooms.map((room, idx) => {
                    const roomAreaSqm = (room.l * room.w) / 10000;
                    return (
                      <div 
                        key={room.id}
                        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3.5 rounded-xl border border-neutral-200/60 bg-neutral-25/50 relative"
                        id={`room-form-row-${room.id}`}
                      >
                        <div className="flex-1 min-w-0" id={`room-name-field-${room.id}`}>
                          <input
                            type="text"
                            value={room.name}
                            placeholder="Room description"
                            onChange={(e) => updateRoom(room.id, 'name', e.target.value)}
                            className="bg-white border border-neutral-200 rounded-lg h-9 w-full text-xs font-semibold px-2 text-neutral-800"
                            title="Description"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 shrink-0 w-full sm:w-56" id={`room-values-field-${room.id}`}>
                          <div className="flex items-center border border-neutral-200 bg-white rounded-lg h-9 px-2">
                            <span className="text-[10px] text-neutral-400 font-bold mr-1.5">L cm</span>
                            <input
                              type="number"
                              value={room.l}
                              onChange={(e) => updateRoom(room.id, 'l', parseFloat(e.target.value) || 0)}
                              className="w-full text-xs font-mono text-center focus:outline-hidden"
                              min={0}
                            />
                          </div>
                          
                          <div className="flex items-center border border-neutral-200 bg-white rounded-lg h-9 px-2">
                            <span className="text-[10px] text-neutral-400 font-bold mr-1.5">W cm</span>
                            <input
                              type="number"
                              value={room.w}
                              onChange={(e) => updateRoom(room.id, 'w', parseFloat(e.target.value) || 0)}
                              className="w-full text-xs font-mono text-center focus:outline-hidden"
                              min={0}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between shrink-0 pl-1" id={`room-summary-field-${room.id}`}>
                          <div className="text-right">
                            <p className="text-[8px] font-bold text-neutral-400 leading-none">TOTAL AREA</p>
                            <span className="text-xs font-mono font-extrabold text-neutral-700">{roomAreaSqm.toFixed(2)} m²</span>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => removeRoom(room.id)}
                            className="ml-3 p-1.5 text-neutral-400 hover:text-red-500 rounded-md hover:bg-neutral-100 transition-colors"
                            title="Remove Room"
                            id={`room-delete-${room.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Linear meters numeric inputs */
            <div className="space-y-4" id="linear-measurement-panel">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <File className="h-4 w-4 text-neutral-500" />
                3. Site Linear Length
              </h3>
              <div className="p-4 bg-neutral-25 rounded-xl border border-neutral-200/80 max-w-sm">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-600 block">Total Linear Meters (m)</label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <input
                      type="number"
                      value={linearMeters}
                      onChange={(e) => setLinearMeters(parseFloat(e.target.value) || 0)}
                      className="h-10 px-3 bg-white border border-neutral-200 rounded-xl text-xs font-mono font-bold w-full sm:w-32 focus:outline-hidden"
                      min={0}
                      id="linear-meters-input"
                    />
                    <span className="text-xs text-neutral-500 leading-tight">Usually suitable for plaster cornices, floor skirting alignments or edge trims.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* LOGISTICS AND SURCHARGES CODES */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4 shadow-xs" id="logistics-pricing-panel">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <Hammer className="h-4.5 w-4.5 text-neutral-500" />
            4. Logistics, Waste Coefficient &amp; Rates
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5" id="labor-rate-input-container">
              <label className="text-[10px] font-semibold text-neutral-500 flex items-center gap-1">
                Labor ({symbol}) / {unitType === 'sqm' ? 'm²' : 'm'}
              </label>
              <input
                type="number"
                value={laborRate}
                onChange={(e) => setLaborRate(parseFloat(e.target.value) || 0)}
                className="w-full h-10 px-3 border border-neutral-200 rounded-xl text-xs font-mono font-bold"
                id="rate-labor-input"
              />
            </div>

            <div className="space-y-1.5" id="waste-percent-input-container">
              <label className="text-[10px] font-semibold text-neutral-500 flex items-center gap-1" title="Waste Contingency Allowance">
                Waste Factor Amount (%)
              </label>
              <input
                type="number"
                value={wastePercent}
                onChange={(e) => setWastePercent(parseFloat(e.target.value) || 0)}
                className="w-full h-10 px-3 border border-neutral-200 rounded-xl text-xs font-mono font-bold"
                id="rate-waste-input"
              />
            </div>

            <div className="space-y-1.5" id="transport-fee-input-container">
              <label className="text-[10px] font-semibold text-neutral-500 flex items-center gap-1">
                Transport / Logistics ({symbol})
              </label>
              <input
                type="number"
                value={transportFee}
                onChange={(e) => setTransportFee(parseFloat(e.target.value) || 0)}
                className="w-full h-10 px-3 border border-neutral-200 rounded-xl text-xs font-mono font-bold"
                id="rate-transport-input"
              />
            </div>
          </div>
        </div>

        {/* WORK SITE & COMPLETION PHOTOS */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4 shadow-xs" id="site-photos-panel">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Camera className="h-4.5 w-4.5 text-neutral-500" />
              5. Work Site &amp; Progress Photos
            </span>
            <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2.5 py-0.5 rounded-full font-bold">
              {photos.length} attached
            </span>
          </h3>

          {/* Active Camera Viewport */}
          {showCamera ? (
            <div className="relative rounded-2xl overflow-hidden border border-neutral-300 bg-neutral-950 aspect-video flex flex-col justify-between animate-fade-in" id="active-camera-workspace">
              <video
                id="contractor-camera-feed"
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                ref={(el) => {
                  if (el && cameraStream && el.srcObject !== cameraStream) {
                    el.srcObject = cameraStream;
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 px-4 z-10">
                <button
                  type="button"
                  onClick={handleCapturePhoto}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
                  id="snap-camera-btn"
                >
                  <Camera className="h-4 w-4" /> Snap Photo
                </button>
                <button
                  type="button"
                  onClick={handleStopCamera}
                  className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
                  id="cancel-camera-btn"
                >
                  <XCircle className="h-4 w-4" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="photo-utility-grid">
              {/* Camera Trigger Card */}
              <button
                type="button"
                onClick={handleStartCamera}
                className="h-28 rounded-xl border border-dashed border-blue-200 bg-blue-50/40 hover:bg-blue-50/80 transition-all flex flex-col items-center justify-center text-center gap-2 cursor-pointer group"
                id="trigger-camera-capture"
              >
                <div className="p-2.5 rounded-full bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
                  <Camera className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-blue-800 block">Use Live Camera</span>
                  <span className="text-[10px] text-blue-600">Snap directly on site</span>
                </div>
              </button>

              {/* Upload Drag & Drop Picker Card */}
              <label
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`h-28 rounded-xl border border-dashed transition-all flex flex-col items-center justify-center text-center gap-2 cursor-pointer group ${
                  dragOver 
                    ? 'border-emerald-400 bg-emerald-50' 
                    : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100/85'
                }`}
                id="drag-drop-photo-picker"
              >
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoFileChange}
                  className="hidden"
                  id="file-photo-picker-input"
                />
                <div className="p-2.5 rounded-full bg-neutral-200 text-neutral-600 group-hover:scale-110 transition-transform">
                  <Upload className="h-5 w-5 text-neutral-600" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-neutral-800 block">Upload or Drop Files</span>
                  <span className="text-[10px] text-neutral-500">Attach existing photos</span>
                </div>
              </label>
            </div>
          )}

          {/* Photo Preview Grids */}
          {photos.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">Attached Estimates Gallery (Tap to expand)</span>
              <div className="grid grid-cols-4 gap-2.5" id="attached-photos-gallery">
                {photos.map((src, index) => (
                  <div
                    key={index}
                    className="group relative aspect-square rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100 cursor-pointer"
                    onClick={() => setExpandedPhotoUrl(src)}
                    id={`photo-card-${index}`}
                  >
                    <img
                      src={src}
                      alt={`Site attachment ${index + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" />
                    
                    {/* Delete handler button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePhoto(index);
                      }}
                      className="absolute top-1 right-1 p-1 rounded-md bg-red-600 hover:bg-red-500 text-white shadow-sm transition-colors cursor-pointer"
                      title="Remove Photo"
                      id={`remove-photo-btn-${index}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    <div className="absolute bottom-1 left-1 bg-black/60 text-white font-mono text-[8px] px-1 rounded-sm leading-none py-0.5 pointer-events-none">
                      #{index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        </fieldset>

        {/* BOTTOM QUICK ACTIONS PANEL */}
        <div className="flex flex-col gap-2 pt-1" id="action-contingencies">
          <div className="flex items-center justify-between px-1 text-[11px] text-neutral-500 font-medium">
            <span className="flex items-center gap-1.5" id="autosave-status-indicator">
              {sealed ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Frozen: Estimate is permanently sealed and read-only</span>
                </>
              ) : isSaving ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  <span>Draft saving...</span>
                </>
              ) : lastSaved ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Draft auto-saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </>
              ) : (
                <span>Auto-save enabled (typing or editing changes)</span>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={sealed}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl text-white px-5 py-3.5 text-xs font-extrabold transition-all shadow-md active:scale-98 cursor-pointer ${
              sealed 
                ? 'bg-neutral-300 border-neutral-205 text-neutral-550 cursor-not-allowed shadow-none' 
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/15'
            }`}
            id="workspace-save-btn"
          >
            {sealed ? (
              <>
                <span>🔒 Estimate Sealed &amp; Locked</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Commit &amp; Save Estimate</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Outputs Column (Right Side Preview Panels) */}
      <div className="lg:col-span-5 space-y-6" id="output-previews-column">
        {/* Dynamic Metric Bar */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3.5 shadow-xs" id="quick-results-summary">
          <div className="text-center pb-3 border-b border-neutral-100">
            <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">Calculated Metrics Scope</span>
            <div className="text-3xl font-extrabold text-neutral-900 tracking-tight font-mono mt-0.5" id="output-measured-total">
              {totalMeasure.toFixed(2)} {unitType === 'sqm' ? 'm²' : 'm'}
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">Aggregate measurement dimension output.</p>
          </div>

          <div className="grid grid-cols-2 gap-3" id="metric-split-cards">
            <div className="bg-neutral-50/70 p-3.5 rounded-xl border border-neutral-200/50" id="materials-sum-card">
              <span className="text-[9px] uppercase tracking-wider font-bold text-neutral-400 block leading-none">MATERIAL COST</span>
              <span className="text-sm font-extrabold text-neutral-800 font-mono block mt-1.5" id="output-materials-cost-sum">
                {symbol} {materialTotal.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-neutral-50/70 p-3.5 rounded-xl border border-neutral-200/50" id="labor-sum-card">
              <span className="text-[9px] uppercase tracking-wider font-bold text-neutral-400 block leading-none">TOTAL LABOUR</span>
              <span className="text-sm font-extrabold text-neutral-800 font-mono block mt-1.5" id="output-labor-cost-sum">
                {symbol} {laborTotal.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Absolute Grande sum */}
          <div className="bg-blue-600/5 p-4.5 rounded-xl border border-blue-500/10 flex justify-between items-center" id="grand-total-surcharge-card">
            <div>
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-blue-700 block leading-none">GRAND TOTAL QUOTE</span>
              <p className="text-[10px] text-neutral-500 mt-1 leading-none">Inclusive of transport &amp; waste</p>
            </div>
            <span className="text-xl font-black text-blue-600 font-mono" id="output-grand-total">
              {symbol} {grandTotal.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Beautiful call-to-action to go to PDF */}
        <div className="border border-dashed border-neutral-300 rounded-2xl bg-white p-6 text-center space-y-4 shadow-xs" id="editor-pdf-preview-prompt">
          <div className="mx-auto w-11 h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
            📑
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black text-neutral-900 uppercase tracking-wider">Formal PDF Quotation Preview</h4>
            <p className="text-[10px] text-neutral-500 leading-relaxed max-w-xs mx-auto">
              To keep your workspace spacious and clutter-free, the formal PDF slip preview is hidden. Save your estimate to generate and open the print-ready PDF!
            </p>
          </div>
          
          <button
            type="button"
            onClick={() => {
              if (!clientName.trim()) {
                triggerToast('error', 'Please enter a Customer Name to view the PDF Quote!');
                return;
              }
              setViewMode('pdf');
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-md active:scale-95 cursor-pointer"
            id="editor-open-pdf-preview-btn"
          >
            View Full PDF Quote →
          </button>
        </div>
      </div>
    </div>
  ) : (
    /* PDF Quotation & Invoice View Mode (Centered, Zero Clutter document) */
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in" id="workspace-pdf-only-panel">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4.5 bg-blue-50/50 border border-blue-105 rounded-2xl shadow-xs" id="pdf-view-backbar">
        <div className="flex flex-wrap items-center gap-2">
          <span className="p-1 px-2.5 text-emerald-800 bg-emerald-100 rounded-lg text-[9px] font-black uppercase tracking-wider leading-none">
            ✓ Active Estimate File
          </span>
          <span className="text-xs font-bold text-neutral-600">
            Estimate ID: <strong className="text-neutral-900 tracking-wider font-mono">{activeEstimate?.id || "EST-GEN"}</strong>
          </span>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {status !== 'Accepted' && !sealed && (
            <button
              type="button"
              onClick={() => {
                setStatus('Accepted');
                const updatedEstimateObj = {
                  id: activeEstimate?.id || `EST-${Date.now().toString().slice(-6)}`,
                  clientName: clientName.trim(),
                  projectName: projectName.trim() || 'General Service Rendering',
                  jobLocation: jobLocation.trim() || 'Site',
                  trade,
                  jobType,
                  unitType,
                  laborRate,
                  wastePercent,
                  transportFee,
                  linearMeters,
                  rooms,
                  createdAt: activeEstimate?.createdAt || new Date().toISOString(),
                  grandTotal,
                  materialTotal,
                  laborTotal,
                  status: 'Accepted' as const,
                  photos,
                  agreedPrice: agreedPrice !== '' ? Number(agreedPrice) : undefined,
                  sealed: false
                };
                onSaveEstimate(updatedEstimateObj, clientPhone);
                triggerToast('success', 'Estimate marked as Accepted! Opening sealing workspace...');
              }}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs text-xs font-extrabold rounded-xl cursor-pointer transition-colors animate-pulse"
              id="pdf-view-mark-accepted-btn"
            >
              ✅ Enable "Accepted"
            </button>
          )}

          {!sealed && (
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 shadow-xs text-xs font-extrabold rounded-xl cursor-pointer transition-colors"
              id="back-to-calculator-view-btn"
            >
              ✏️ Edit Calculator
            </button>
          )}
          
          <button
            type="button"
            onClick={() => {
              onClearActiveEstimate();
              if (onNavigateToTab) {
                onNavigateToTab('home');
              }
            }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-neutral-900 hover:bg-neutral-800 text-white shadow-xs text-xs font-extrabold rounded-xl cursor-pointer transition-colors"
            id="back-to-dashboard-view-btn"
          >
            🏠 Return to Dashboard
          </button>
        </div>
      </div>

      <div id="full-screen-pdf-sheet" className="bg-white rounded-3xl border border-neutral-200 p-2 sm:p-4 shadow-sm">
        <ReceiptPreview 
          estimate={{
            id: activeEstimate?.id || "EST-GEN",
            clientName,
            projectName,
            jobLocation,
            trade,
            jobType,
            unitType,
            laborRate,
            wastePercent,
            transportFee,
            linearMeters,
            rooms,
            createdAt: activeEstimate?.createdAt || new Date().toISOString(),
            grandTotal,
            materialTotal,
            laborTotal,
            status,
            photos
          }}
          businessProfile={businessProfile}
          materialsBreakdown={materialsBreakdown}
          tradeJobs={tradeJobs}
          tradeLabels={tradeLabels}
        />
      </div>
    </div>
  )}

  {/* PHOTO LIGHTBOX MODAL */}
  {expandedPhotoUrl && (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-fade-in"
      onClick={() => setExpandedPhotoUrl(null)}
      id="photo-lightbox-overlay"
    >
      <div 
        className="relative max-w-3xl w-full bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        id="photo-lightbox-modal"
      >
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950 text-white">
          <span className="text-xs font-bold font-mono">Attachment Preview</span>
          <button
            type="button"
            onClick={() => setExpandedPhotoUrl(null)}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            id="close-lightbox-btn"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        <div className="p-2 flex items-center justify-center bg-neutral-950/40 aspect-video max-h-[70vh]">
          <img
            src={expandedPhotoUrl}
            alt="Expanded Attachment"
            className="max-w-full max-h-full object-contain rounded-md"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 text-center">
          <p className="text-xs text-neutral-400 font-sans">
            Full-size uploaded site photo. Attached to calculation record {activeEstimate?.id || 'Draft'}.
          </p>
        </div>
      </div>
    </div>
  )}
</div>
  );
}
