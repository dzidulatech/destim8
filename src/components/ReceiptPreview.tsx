import { useState, useRef } from 'react';
import { Share2, Printer, CheckCircle, Smartphone, Building, ShieldAlert, Copy, Check, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Estimate, BusinessProfile } from '../types';
import { TRADE_CONFIG } from '../config';
import { getCurrencyInfo, formatCurrencyValue, getSafePdfCurrencySymbol } from '../currency';

interface ReceiptPreviewProps {
  estimate: Estimate;
  businessProfile: BusinessProfile;
  materialsBreakdown: Array<{
    name: string;
    qty: number;
    price: number;
    cost: number;
    unit: string;
  }>;
  tradeJobs: Record<string, Record<string, string>>;
  tradeLabels?: Record<string, string>;
}

export default function ReceiptPreview({
  estimate,
  businessProfile,
  materialsBreakdown,
  tradeJobs,
  tradeLabels
}: ReceiptPreviewProps) {
  const [depositPercent, setDepositPercent] = useState<number>(70);
  const [copiedText, setCopiedText] = useState(false);
  const [activePreviewType, setActivePreviewType] = useState<'whatsapp' | 'pdf'>('pdf');
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (num: number) => {
    return formatCurrencyValue(num, businessProfile.currency || 'GHS');
  };

  const depositAmount = (estimate.grandTotal * depositPercent) / 100;
  const balanceDue = estimate.grandTotal - depositAmount;

  const DEFAULT_TERMS = `1. This estimation incorporates a physical material waste contingent index of {wastePercent}% to allow for product cuts or damages during install.
2. Payment of the specified {depositPercent}% contract mobilization advance is required prior to shipping and delivery of physical supplies to site.
3. Remaining balance must be cleared fully on immediate successful client verification of structural completions.
4. Notice: If this estimate is longer than 3 months, it needs to be updated due to material cost fluctuations.`;

  const termsTemplate = businessProfile.termsAndConditions || DEFAULT_TERMS;
  const finalTerms = termsTemplate
    .replace(/{wastePercent}/g, String(estimate.wastePercent))
    .replace(/{depositPercent}/g, String(depositPercent));

  const getTradeLabel = (trade: string) => {
    if (tradeLabels && tradeLabels[trade]) return tradeLabels[trade];
    if (trade === 'pop') return 'POP Ceiling';
    if (trade === 'tiling') return 'Tiling Finish';
    if (trade === 'painting') return 'Painting';
    return trade;
  };

  // Generate WhatsApp text representation
  const generateWhatsAppMessage = () => {
    const tradeLabel = getTradeLabel(estimate.trade);
    const jobLabel = tradeJobs[estimate.trade]?.[estimate.jobType] || estimate.jobType;
    const measureUnit = estimate.unitType === 'sqm' ? 'm²' : 'm';
    
    let msg = `*${businessProfile.name.toUpperCase()}*\n`;
    if (businessProfile.slogan) msg += `_${businessProfile.slogan}_\n`;
    msg += `----------------------------------------\n`;
    msg += `*Trade Estimation & Quotation*\n\n`;
    msg += `*Client:* ${estimate.clientName || 'Valued Customer'}\n`;
    msg += `*Project:* ${estimate.projectName || 'Not Specified'}\n`;
    msg += `*Location:* ${estimate.jobLocation || 'Accra, GH'}\n`;
    msg += `*Service:* ${tradeLabel} (${jobLabel})\n`;
    msg += `*Total Measure:* ${estimate.unitType === 'lm' ? estimate.linearMeters.toFixed(2) : (estimate.rooms.reduce((acc, r) => acc + (r.l * r.w) / 10000, 0)).toFixed(2)} ${measureUnit}\n`;
    msg += `----------------------------------------\n\n`;
    
    msg += `*Material Items Summary:*\n`;
    materialsBreakdown.forEach(m => {
      if (m.cost > 0) {
        if (estimate.materialsBoughtBy === 'Client') {
          msg += `• ${m.name}: ${m.qty.toFixed(1)} ${m.unit} (Client Purchased)\n`;
        } else {
          msg += `• ${m.name}: ${m.qty.toFixed(1)} ${m.unit} @ ${formatCurrency(m.price)} = ${formatCurrency(m.cost)}\n`;
        }
      }
    });
    if (estimate.materialsBoughtBy === 'Client') {
      msg += `*Materials Total:* Client Supplied / Provided ($0.00)\n`;
    }
    msg += `\n*Labor Cost:* ${formatCurrency(estimate.laborTotal)}\n`;
    if (estimate.transportFee > 0) {
      msg += `*Logistics/Transport:* ${formatCurrency(estimate.transportFee)}\n`;
    }
    
    msg += `----------------------------------------\n`;
    msg += `*GRAND TOTAL:* ${formatCurrency(estimate.grandTotal)}\n`;
    msg += `*Required Deposit (${depositPercent}%):* *${formatCurrency(depositAmount)}*\n`;
    msg += `*Balance Upon Completion:* ${formatCurrency(balanceDue)}\n\n`;
    
    msg += `_Terms & Conditions:_\n${finalTerms}\n\n`;
    msg += `Contact: ${businessProfile.phone}`;
    
    return encodeURIComponent(msg);
  };

  const copyToClipboard = () => {
    const rawMsg = decodeURIComponent(generateWhatsAppMessage()).replace(/\*/g, '');
    navigator.clipboard.writeText(rawMsg).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    });
  };

  const triggerPrint = () => {
    window.print();
  };

  const generatePdfDocument = () => {
    const cur = businessProfile.currency || 'GHS';
    const symbol = getSafePdfCurrencySymbol(cur);
    const { locale } = getCurrencyInfo(cur);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const activeColorHex = {
      blue: '#2563eb',
      emerald: '#059669',
      amber: '#d97706',
      terracotta: '#ea580c',
      charcoal: '#4b5563'
    }[localStorage.getItem('estim8_theme') || 'blue'] || '#2563eb';

    const hexToRgb = (hex: string) => {
      const match = hex.replace('#', '').match(/.{1,2}/g);
      return match ? match.map(x => parseInt(x, 16)) : [37, 99, 235];
    };
    const rgb = hexToRgb(activeColorHex);

    const fontPrimary = 'helvetica';
    let y = 0;

    // Helper to ensure next page is set up beautifully if content overflows
    const ensureSpace = (neededHeight: number) => {
      if (y + neededHeight > 275) {
        doc.addPage();
        // Modern accent top bar for sub-sheets
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.rect(0, 0, 210, 5, 'F');
        
        doc.setFont(fontPrimary, 'bolditalic');
        doc.setFontSize(7);
        doc.setTextColor(156, 163, 175);
        doc.text(`QUOTATION STATEMENT CONTINUED | ESTIMATE REF: ${estimate.id}`, 15, 11);
        
        y = 18;
        return true;
      }
      return false;
    };

    // 1. BRANDED MAIN LETTERHEAD BANNER (A4 Y:0 to Y:38)
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.rect(0, 0, 210, 36, 'F');

    // Faint sleek double-line dark accent underneath the banner
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 36, 210, 2.5, 'F');

    let textX = 15;
    if (businessProfile.logo) {
      try {
        // Render logo inside a crisp rounded white layout plate
        doc.setFillColor(255, 255, 255);
        doc.rect(13, 8, 20, 20, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.rect(13, 8, 20, 20, 'S');

        doc.addImage(businessProfile.logo, 'PNG', 14.5, 9.5, 17, 17, undefined, 'FAST');
        textX = 38;
      } catch (e) {
        console.error("Failed to render logo to PDF: ", e);
      }
    }

    // Write Brand Name in White
    let profileY = 14;
    doc.setFont(fontPrimary, 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(businessProfile.name.toUpperCase(), textX, profileY, { maxWidth: 95 });

    // Slogan inside header
    if (businessProfile.slogan) {
      profileY += 4.5;
      doc.setFont(fontPrimary, 'italic');
      doc.setFontSize(8);
      doc.setTextColor(241, 245, 249);
      const sloganLines = doc.splitTextToSize(businessProfile.slogan, 85);
      doc.text(sloganLines, textX, profileY);
      profileY += sloganLines.length * 3.8;
    } else {
      profileY += 5.5;
    }

    // Contact info inside header (truncated to fit cleanly on single line)
    doc.setFont(fontPrimary, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(226, 232, 240);
    const limitLoc = (businessProfile.location || 'Accra').length > 35
      ? (businessProfile.location || 'Accra').substring(0, 32) + '...'
      : (businessProfile.location || 'Accra');
    const limitPhone = (businessProfile.phone || '+233 24 123 4567').length > 20
      ? (businessProfile.phone || '+233 24 123 4567').substring(0, 17) + '...'
      : (businessProfile.phone || '+233 24 123 4567');
    doc.text(`HQ: ${limitLoc}   |   Tel: ${limitPhone}`, textX, profileY);

    // Right-Aligned Invoice Header Badge
    doc.setFont(fontPrimary, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('CLIENT QUOTATION', 195, 14, { align: 'right' });

    doc.setFont(fontPrimary, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(241, 245, 249);
    doc.text(`ESTIMATE REF: ${estimate.id}`, 195, 19, { align: 'right' });

    // Dates
    const creationDateStr = new Date(estimate.createdAt).toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    doc.setFont(fontPrimary, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(226, 232, 240);
    doc.text(`Issue Date: ${creationDateStr}`, 195, 26, { align: 'right' });

    // Move below the banner
    y = 44;

    // 2. PARALLEL DOUBLE DETAILS CARDS (CLIENT & SPECS)
    doc.setFillColor(248, 250, 252);
    doc.rect(15, y, 87, 26, 'F');
    doc.rect(108, y, 87, 26, 'F');

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.rect(15, y, 87, 26, 'S');
    doc.rect(108, y, 87, 26, 'S');

    // Visual Theme-Colored Left Margin Accent Ribbons on Cards
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.rect(15, y, 2.5, 26, 'F');
    doc.rect(108, y, 2.5, 26, 'F');

    // Inside client details card (truncated to prevent vertical overlaps on line wraps)
    doc.setFont(fontPrimary, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.text('PREPARED FOR CLIENT', 21, y + 5.5);

    doc.setFont(fontPrimary, 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    const displayClientName = (estimate.clientName || 'Valued Customer').length > 34
      ? (estimate.clientName || 'Valued Customer').substring(0, 31) + '...'
      : (estimate.clientName || 'Valued Customer');
    doc.text(displayClientName, 21, y + 11);

    doc.setFont(fontPrimary, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const displayProject = (estimate.projectName || 'General Service Rendering').length > 32
      ? (estimate.projectName || 'General Service Rendering').substring(0, 29) + '...'
      : (estimate.projectName || 'General Service Rendering');
    const displayLocationDetails = (estimate.jobLocation || 'Accra, GH').length > 32
      ? (estimate.jobLocation || 'Accra, GH').substring(0, 29) + '...'
      : (estimate.jobLocation || 'Accra, GH');
    doc.text(`Project: ${displayProject}`, 21, y + 16.5);
    doc.text(`Site Location: ${displayLocationDetails}`, 21, y + 21.5);

    // Inside specifications details card
    doc.setFont(fontPrimary, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.text('TECHNICAL ESTIMATES', 114, y + 5.5);

    doc.setFont(fontPrimary, 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    const tradeLabel = getTradeLabel(estimate.trade);
    const displayTradeLabel = tradeLabel.length > 34
      ? tradeLabel.substring(0, 31) + '...'
      : tradeLabel;
    doc.text(displayTradeLabel, 114, y + 11);

    doc.setFont(fontPrimary, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const jobLabel = tradeJobs[estimate.trade]?.[estimate.jobType] || estimate.jobType;
    const displayJobLabel = jobLabel.length > 34
      ? jobLabel.substring(0, 31) + '...'
      : jobLabel;
    doc.text(`Service: ${displayJobLabel}`, 114, y + 16.5);

    const volumeSizeStr = estimate.unitType === 'lm'
      ? `${estimate.linearMeters.toFixed(2)} m`
      : `${estimate.rooms.reduce((acc, r) => acc + (r.l * r.w) / 10000, 0).toFixed(2)} m²`;
    doc.text(`Sizing Volume: ${volumeSizeStr}`, 114, y + 21.5);

    y += 33;

    // 3. MATERIAL SUPPLIES TABLE (WITH MODERN COLOR HEADER STRIP & ZEBRA ROWS)
    doc.setFont(fontPrimary, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.text('REQUIRED MATERIAL SUPPLIES', 15, y);

    doc.setFont(fontPrimary, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${cur} Price Matrix Sourced`, 195, y, { align: 'right' });
    y += 3.5;

    // Solid deep dark table bar header
    doc.setFillColor(15, 23, 42);
    doc.rect(15, y, 180, 7.5, 'F');

    doc.setFont(fontPrimary, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('Material / Item Supplies', 18, y + 5);
    doc.text('Allocated Qty', 105, y + 5, { align: 'center' });
    doc.text('Unit Rate', 145, y + 5, { align: 'right' });
    doc.text('Total Price', 192, y + 5, { align: 'right' });

    y += 7.5;

    let zebraIdx = 0;
    materialsBreakdown.forEach((m) => {
      if (m.cost > 0) {
        ensureSpace(7.5);

        // Zebra background tint
        if (zebraIdx % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, y, 180, 7, 'F');
        }

        doc.setFont(fontPrimary, 'bold');
        doc.setFontSize(8.2);
        doc.setTextColor(15, 23, 42);
        // Truncate to prevent long material item names from overlapping Allocated Qty column
        const displayMatName = m.name.length > 40 ? m.name.substring(0, 37) + '...' : m.name;
        doc.text(displayMatName, 18, y + 4.5);

        doc.setFont(fontPrimary, 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(`${m.qty.toFixed(1)} ${m.unit}`, 105, y + 4.5, { align: 'center' });
        doc.text(`${symbol} ${m.price.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 145, y + 4.5, { align: 'right' });

        doc.setFont(fontPrimary, 'bold');
        doc.setFontSize(8.2);
        doc.setTextColor(15, 23, 42);
        if (estimate.materialsBoughtBy === 'Client') {
          doc.text('Client Supplied', 192, y + 4.5, { align: 'right' });
        } else {
          doc.text(`${symbol} ${m.cost.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 192, y + 4.5, { align: 'right' });
        }

        y += 7;
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.15);
        doc.line(15, y, 195, y);

        zebraIdx++;
      }
    });

    // Subtotal section row for materials
    y += 1.5;
    ensureSpace(8);
    doc.setFont(fontPrimary, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Materials Subtotal:', 145, y + 3, { align: 'right' });
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    if (estimate.materialsBoughtBy === 'Client') {
      doc.text('Client Supplied ($0.00)', 192, y + 3, { align: 'right' });
    } else {
      doc.text(`${symbol} ${estimate.materialTotal.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 192, y + 3, { align: 'right' });
    }

    y += 8;

    // 4. LABOUR AND SERVICES SECTION
    ensureSpace(25);
    doc.setFont(fontPrimary, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.text('SERVICE & LABOUR OUTLAY', 15, y);

    doc.setFont(fontPrimary, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Professional Labor & Transport Services', 195, y, { align: 'right' });
    y += 3.5;

    // Header bar
    doc.setFillColor(15, 23, 42);
    doc.rect(15, y, 180, 7.5, 'F');

    doc.setFont(fontPrimary, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('Labour / Service Component Description', 18, y + 5);
    doc.text('Price Metric', 192, y + 5, { align: 'right' });

    y += 7.5;

    // Professional Labor Fee Zebra Block
    doc.setFillColor(248, 250, 252);
    doc.rect(15, y, 180, 7, 'F');
    doc.setFont(fontPrimary, 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(15, 23, 42);
    doc.text('Professional Labor Fee (Certified Mastercraft)', 18, y + 4.5);
    doc.text(`${symbol} ${estimate.laborTotal.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 192, y + 4.5, { align: 'right' });

    y += 7;
    doc.setDrawColor(241, 245, 249);
    doc.line(15, y, 195, y);

    let servicesTotal = estimate.laborTotal;
    if (estimate.transportFee > 0) {
      doc.setFont(fontPrimary, 'bold');
      doc.setFontSize(8.2);
      doc.setTextColor(15, 23, 42);
      doc.text('Logistics Mobilization & Physical Haulage', 18, y + 4.5);
      doc.text(`${symbol} ${estimate.transportFee.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 192, y + 4.5, { align: 'right' });

      y += 7;
      doc.line(15, y, 195, y);
      servicesTotal += estimate.transportFee;
    }

    // Services subtotal metrics row
    y += 1.5;
    ensureSpace(8);
    doc.setFont(fontPrimary, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Services Subtotal:', 145, y + 3, { align: 'right' });
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`${symbol} ${servicesTotal.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 192, y + 3, { align: 'right' });

    y += 10;

    // 5. HIGH-IMPACT BILLING SUMMARY BOX (FULL WIDTH THEMED PANEL)
    ensureSpace(34);
    
    // Very soft tone mix calculated dynamically based on active template color
    const softR2 = Math.round(rgb[0] * 0.04 + 255 * 0.96);
    const softG2 = Math.round(rgb[1] * 0.04 + 255 * 0.96);
    const softB2 = Math.round(rgb[2] * 0.04 + 255 * 0.96);

    doc.setFillColor(softR2, softG2, softB2);
    doc.rect(15, y, 180, 28, 'F');
    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
    doc.setLineWidth(0.2);
    doc.rect(15, y, 180, 28, 'S');

    // Deep theme colored 3.5mm safety sidebar inside the summary block
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.rect(15, y, 3.5, 28, 'F');

    // Col 1: Contractor & Provider Info
    doc.setFont(fontPrimary, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.text('ESTIMATED BY', 22, y + 6);

    doc.setFont(fontPrimary, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(businessProfile.name, 22, y + 11.5, { maxWidth: 85 });

    doc.setFont(fontPrimary, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Contact: ${businessProfile.phone || '+233 24 123 4567'}`, 22, y + 16.5);
    doc.text(`Location: ${businessProfile.location || 'Accra, Ghana'}`, 22, y + 20.5);

    // Col 2: High impact Grand Total aligned to the right beautifully
    doc.setFont(fontPrimary, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`GRAND TOTAL BILLING (${cur})`, 191, y + 6, { align: 'right' });

    doc.setFont(fontPrimary, 'bold');
    doc.setFontSize(14.5);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.text(`${symbol} ${estimate.grandTotal.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 191, y + 14, { align: 'right' });

    doc.setFont(fontPrimary, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Subject to contract conditions outlined below', 191, y + 20.5, { align: 'right' });

    y += 35;

    // 6. TERMS AND CONDITIONS
    const termsLines = doc.splitTextToSize(finalTerms, 180) as string[];
    const estimatedHeight = termsLines.length * 3.5 + 8;
    
    ensureSpace(estimatedHeight + 25); // terms height + signature cushion

    doc.setFont(fontPrimary, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('TERMS AND CONTRACTUAL CONDITIONS:', 15, y);
    y += 4.5;

    doc.setFont(fontPrimary, 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    termsLines.forEach((line) => {
      doc.text(line, 15, y);
      y += 3.4;
    });

    y += 9;

    // Signatures
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.2);
    doc.line(15, y, 75, y);
    doc.line(135, y, 195, y);

    y += 4;
    doc.setFont(fontPrimary, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Authorized Contractor Representative', 15, y);
    doc.text('Client Acceptance Signature', 135, y);
    y += 3.5;
    doc.setFont(fontPrimary, 'bold');
    doc.text(businessProfile.name, 15, y);
    doc.setFont(fontPrimary, 'normal');
    doc.text('Date: ____ / ____ / ________', 135, y);

    // 7. PHOTOS GALLERY PAGES APPRENTICESHIP (IF PHOTOS ARE RECORDED INDEED)
    if (estimate.photos && estimate.photos.length > 0) {
      doc.addPage();
      
      // Top header banner for gallery sheet
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.rect(0, 0, 210, 6, 'F');
      
      let photoY = 18;
      doc.setFont(fontPrimary, 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('ATTACHED SITE & WORK REFERENCE PICTURES', 15, photoY);
      
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(15, photoY + 3.5, 195, photoY + 3.5);
      
      photoY += 10;
      
      let col = 0;
      let row = 0;
      estimate.photos.forEach((photo, idx) => {
        try {
          const imgWidth = 41;
          const imgHeight = 41;
          const xPos = 15 + col * 46;
          const yPos = photoY + row * 49;

          // Soft light gray background container borders for photos
          doc.setFillColor(248, 250, 252);
          doc.rect(xPos, yPos, imgWidth, imgHeight, 'F');
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.25);
          doc.rect(xPos, yPos, imgWidth, imgHeight, 'S');

          // Embed images directly
          doc.addImage(photo, 'JPEG', xPos + 1, yPos + 1, imgWidth - 2, imgHeight - 2, undefined, 'FAST');

          // Photo indicator index
          doc.setFont(fontPrimary, 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`Site Attachment #${idx + 1}`, xPos + 1, yPos + imgHeight + 4);

          col++;
          if (col >= 4) {
            col = 0;
            row++;
            // If row height spills over A4
            if (photoY + row * 49 + 48 > 275 && idx < (estimate.photos?.length || 0) - 1) {
              doc.addPage();
              // Top colored banner again
              doc.setFillColor(rgb[0], rgb[1], rgb[2]);
              doc.rect(0, 0, 210, 6, 'F');
              photoY = 18;
              col = 0;
              row = 0;
            }
          }
        } catch (e) {
          console.error("Failed to render photo index inside pdf converter: ", e);
        }
      });
    }

    return doc;
  };

  const downloadPdf = () => {
    const doc = generatePdfDocument();
    doc.save(`Estimate_${estimate.id}_${estimate.clientName.replace(/\s+/g, '_')}.pdf`);
  };

  const sharePdf = async () => {
    const doc = generatePdfDocument();
    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], `Estimate_${estimate.id}.pdf`, { type: 'application/pdf' });
    const cur = businessProfile.currency || 'GHS';

    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: `Project Quotation - ${estimate.projectName || 'Estimate'}`,
          text: `Hi ${estimate.clientName || 'Valued Customer'}, please find the attached quotation for the ${getTradeLabel(estimate.trade)} estimation: ${cur} ${estimate.grandTotal.toLocaleString()}.`
        });
        setShareSuccess('Shared PDF quotation successfully!');
        setTimeout(() => setShareSuccess(null), 3000);
      } catch (error) {
        console.error('Error sharing file:', error);
        // If it was aborted or failed, activate WhatsApp text mode
        setActivePreviewType('whatsapp');
      }
    } else {
      setActivePreviewType('whatsapp');
      setShareSuccess('Direct PDF sharing not supported on this browser. Opened WhatsApp text quotation!');
      setTimeout(() => setShareSuccess(null), 4000);
    }
  };

  return (
    <div className="space-y-6" id="receipt-preview-container">
      {/* Settings control for deposit and view style */}
      <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest block mb-1">Payment Plan Deposit</label>
          <div className="flex items-center gap-2">
            {[50, 60, 70, 80].map((p) => (
              <button
                key={p}
                onClick={() => setDepositPercent(p)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${depositPercent === p ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'}`}
                id={`deposit-toggle-${p}`}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>

        <div className="flex bg-neutral-200/60 p-1 rounded-xl self-end sm:self-auto">
          <button
            onClick={() => setActivePreviewType('pdf')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${activePreviewType === 'pdf' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'}`}
            id="switch-pdf-btn"
          >
            <Printer className="h-3.5 w-3.5" />
            PDF Invoice
          </button>
          <button
            onClick={() => setActivePreviewType('whatsapp')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${activePreviewType === 'whatsapp' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'}`}
            id="switch-whatsapp-btn"
          >
            <Smartphone className="h-3.5 w-3.5" />
            WhatsApp Quote
          </button>
        </div>
      </div>

      {activePreviewType === 'pdf' ? (
        /* PDF Invoice Preview Card */
        <div className="relative">
          {/* Print specific container wrapping only the invoice sheet */}
          <div 
            ref={printAreaRef}
            className="bg-white border border-neutral-300 rounded-2xl shadow-lg p-6 md:p-8 font-serif text-neutral-950 aspect-auto printable-section"
            id="invoice-paper"
          >
            {/* INVOICE HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-neutral-950 pb-6 gap-4">
              <div className="flex items-start gap-4">
                {businessProfile.logo && (
                  <img
                    src={businessProfile.logo}
                    alt={`${businessProfile.name} Logo`}
                    className="h-16 w-16 object-contain rounded-lg border border-neutral-200 p-1 shrink-0"
                    referrerPolicy="no-referrer"
                    id="invoice-head-logo"
                  />
                )}
                <div className="space-y-1">
                  <h3 className="font-sans font-black text-2xl tracking-tight text-neutral-900 uppercase">
                    {businessProfile.name}
                  </h3>
                  {businessProfile.slogan && (
                    <p className="font-sans text-xs italic text-neutral-500 font-medium">
                      {businessProfile.slogan}
                    </p>
                  )}
                  <div className="font-sans text-xs text-neutral-500 space-y-0.5 pt-1">
                    <p className="flex items-center gap-1.5">
                      <Building className="h-3 w-3 text-neutral-400" />
                      {businessProfile.location || 'Accra, Ghana'}
                    </p>
                    <p>Tel: {businessProfile.phone || '024 000 0000'}</p>
                  </div>
                </div>
              </div>

              <div className="text-right sm:text-right w-full sm:w-auto font-sans">
                <div className="inline-block bg-neutral-900 text-white font-extrabold text-xs px-3 py-1 rounded-sm tracking-wider uppercase mb-1">
                  Client Quotation
                </div>
                {estimate.status && estimate.status !== 'Draft' && (
                  <div className="flex sm:justify-end gap-1 mb-2">
                    <span className={`inline-block font-sans font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-full border ${
                      estimate.status === 'Sent'
                        ? 'text-blue-800 bg-blue-50 border-blue-300'
                        : estimate.status === 'Accepted'
                        ? 'text-emerald-800 bg-emerald-55 border-emerald-300'
                        : 'text-indigo-800 bg-indigo-50 border-indigo-300'
                    }`}>
                      • {estimate.status}
                    </span>
                  </div>
                )}
                <p className="text-neutral-400 text-[10px] font-mono leading-none">ESTIMATE ID</p>
                <p className="text-xs font-extrabold text-neutral-800 leading-none">{estimate.id}</p>
                <div className="text-neutral-500 text-[11px] mt-2 space-y-0.5 font-normal">
                  <p>Date: {new Date(estimate.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
              </div>
            </div>

            {/* CLIENT & JOB PROPERTIES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-b border-neutral-200 text-xs font-sans">
              <div className="space-y-1">
                <span className="text-neutral-400 font-medium uppercase tracking-wider block text-[10px]">PREPARED FOR</span>
                <p className="font-bold text-neutral-900 text-sm">{estimate.clientName || 'Valued Customer'}</p>
                <p className="text-neutral-500">Project: {estimate.projectName || 'Default Project'}</p>
                <p className="text-neutral-500">Location: {estimate.jobLocation || 'Site'}</p>
              </div>
              <div className="space-y-1 sm:text-right">
                <span className="text-neutral-400 font-medium uppercase tracking-wider block text-[10px]">TRADE SPECIFICATIONS</span>
                <p className="font-bold text-neutral-900 text-sm">
                  {getTradeLabel(estimate.trade)}
                </p>
                <p className="text-neutral-500">Service: {tradeJobs[estimate.trade]?.[estimate.jobType] || estimate.jobType}</p>
                <p className="text-neutral-500 font-mono">
                  Volume: {estimate.unitType === 'lm' 
                    ? `${estimate.linearMeters.toFixed(2)} m` 
                    : `${estimate.rooms.reduce((acc, r) => acc + (r.l * r.w) / 10000, 0).toFixed(2)} m²`
                  }
                </p>
              </div>
            </div>

            {/* REQUIRED MATERIAL SUPPLIES TABLE */}
            <div className="py-3 font-sans">
              <div className="mb-2 flex items-center justify-between border-b pb-1 border-neutral-200">
                <h4 className="text-xs font-extrabold text-neutral-500 uppercase tracking-widest">Required Material Supplies</h4>
                <span className="text-[10px] font-bold text-neutral-400 font-sans">Physical Stock Only</span>
              </div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-400 font-bold uppercase tracking-wider text-[9px]">
                    <th className="py-2 font-semibold">Material Item Supply</th>
                    <th className="py-2 text-center font-semibold">Allocated Qty</th>
                    <th className="py-2 text-right font-semibold">Unit Rate</th>
                    <th className="py-2 text-right font-semibold">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-700">
                  {materialsBreakdown.map((m, idx) => (
                    m.cost > 0 && (
                      <tr key={idx} className="hover:bg-neutral-50/50">
                        <td className="py-2.5 font-medium text-neutral-900">{m.name}</td>
                        <td className="py-2.5 text-center text-neutral-600">{m.qty.toFixed(1)} {m.unit}</td>
                        <td className="py-2.5 text-right font-mono text-neutral-500">{formatCurrency(m.price)}</td>
                        <td className="py-2.5 text-right font-bold text-neutral-900 font-mono">
                          {estimate.materialsBoughtBy === 'Client' ? (
                            <span className="text-[10px] text-amber-600 font-extrabold uppercase bg-amber-50 px-2 py-0.5 rounded">Client Supplied</span>
                          ) : (
                            formatCurrency(m.cost)
                          )}
                        </td>
                      </tr>
                    )
                  ))}
                  <tr>
                    <td colSpan={3} className="py-3 text-right font-bold text-neutral-500 text-[11px]">Materials Subtotal:</td>
                    <td className="py-3 text-right font-extrabold text-neutral-900 font-mono">
                      {estimate.materialsBoughtBy === 'Client' ? 'Client Supplied ($0.00)' : formatCurrency(estimate.materialTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SERVICES & LABOUR OUTLAY */}
            <div className="py-3 font-sans border-t border-neutral-200/60 mt-2">
              <div className="mb-2 flex items-center justify-between border-b pb-1 border-neutral-200">
                <h4 className="text-xs font-extrabold text-neutral-500 uppercase tracking-widest">Service &amp; Labour Outlay</h4>
                <span className="text-[10px] font-bold text-neutral-400 font-sans">Finisher Cost &amp; Logistics</span>
              </div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-400 font-bold uppercase tracking-wider text-[9px]">
                    <th className="py-2 font-semibold">Labour &amp; Logistics Component</th>
                    <th className="py-2 text-right font-semibold">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-700">
                  {/* Labor Component */}
                  <tr className="hover:bg-neutral-50/50">
                    <td className="py-2.5 font-semibold text-neutral-900">Professional Labor Fee</td>
                    <td className="py-2.5 text-right font-bold text-neutral-900 font-mono">{formatCurrency(estimate.laborTotal)}</td>
                  </tr>
                  {/* Transport component if any */}
                  {estimate.transportFee > 0 && (
                    <tr className="hover:bg-neutral-50/50">
                      <td className="py-2.5 font-semibold text-neutral-900">Logistics Mobilization &amp; Haulage</td>
                      <td className="py-2.5 text-right font-bold text-neutral-900 font-mono">{formatCurrency(estimate.transportFee)}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="py-3 text-right font-bold text-neutral-500 text-[11px]">Services Subtotal:</td>
                    <td className="py-3 text-right font-extrabold text-neutral-900 font-mono">
                      {formatCurrency(estimate.laborTotal + (estimate.transportFee || 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* BREAKDOWN SUMS */}
            <div className="border-t border-neutral-300 pt-4 font-sans text-xs space-y-2">
              <div className="flex justify-end gap-12 text-sm border-t border-neutral-200 pt-2 font-extrabold text-neutral-950">
                <span>Grand Total ({businessProfile.currency || 'GHS'}):</span>
                <span className="font-mono text-right w-28 text-blue-600">{formatCurrency(estimate.grandTotal)}</span>
              </div>
              
              <div className="flex justify-end gap-12 text-xs text-blue-700 font-extrabold bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                <span>Contract Deposit ({depositPercent}%):</span>
                <span className="font-mono text-right w-28">{formatCurrency(depositAmount)}</span>
              </div>
              <div className="flex justify-end gap-12 text-xs text-neutral-600 font-medium">
                <span>On-Completion Balance:</span>
                <span className="font-mono text-right w-28 text-neutral-800">{formatCurrency(balanceDue)}</span>
              </div>
            </div>

            {/* GENERAL CONDITIONS / WHITE LABEL NOTATIONS */}
            <div className="mt-8 pt-4 border-t border-dashed border-neutral-300 text-[10px] text-neutral-500 font-sans space-y-1.5" id="terms-and-conditions-block">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-neutral-400 block mb-1">
                Contractual Terms &amp; Conditions
              </span>
              <div className="space-y-1">
                {finalTerms.split('\n').map((line, idx) => (
                  <p key={idx} className="leading-relaxed text-neutral-500 whitespace-pre-wrap">{line}</p>
                ))}
              </div>
              <div className="pt-4 flex justify-between items-end border-t border-neutral-100 font-sans text-neutral-400 mt-4">
                <div>
                  <p className="font-bold text-neutral-800">Certified Professional Finisher</p>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-neutral-500 mt-0.5">Authorised Signature Panel</p>
                </div>
                <div className="w-32 border-b border-neutral-400/80 h-8 font-sans" />
              </div>
            </div>

            {/* PHOTOS GALLERY (ON PRINT/PDF) */}
            {estimate.photos && estimate.photos.length > 0 && (
              <div className="mt-8 pt-4 border-t border-neutral-200" id="receipt-site-photos-gallery">
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-neutral-400 block mb-2.5">
                  Attached Site / Completed Work Pictures
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {estimate.photos.map((src, idx) => (
                    <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100">
                      <img
                        src={src}
                        alt={`Attachment ${idx + 1}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ))}
				</div>
              </div>
            )}
          </div>

          {shareSuccess && (
            <div className="mb-3 p-3 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 animate-fade-in">
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{shareSuccess}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button
              onClick={sharePdf}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-3 text-xs font-bold hover:bg-emerald-700 active:scale-95 transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
              id="share-pdf-whatsapp-btn"
            >
              <Share2 className="h-4 w-4" />
              Share / WhatsApp Quote
            </button>
            <button
              onClick={downloadPdf}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-3 text-xs font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-500/10 cursor-pointer"
              id="download-white-label-pdf-btn"
            >
              <Download className="h-4 w-4" />
              Download White-Label PDF
            </button>
            <button
              onClick={triggerPrint}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 text-white px-5 py-3 text-xs font-bold hover:bg-neutral-800 active:scale-95 transition-all shadow-md shadow-neutral-950/10 cursor-pointer"
              id="print-invoice-btn"
            >
              <Printer className="h-4 w-4" />
              Print / Save as PDF
            </button>
          </div>
        </div>
      ) : (
        /* WhatsApp Share Text Mockup (Clean Instant Sheet) */
        <div className="space-y-4">
          <div className="bg-[#E7F3EF] border border-[#A7D7C5] p-5 rounded-2xl relative overflow-hidden" id="whatsapp-sharing-box">
            <div className="absolute top-0 right-0 p-8 text-neutral-900 bg-emerald-500/5 rounded-full blur-2xl" />
            <div className="flex items-center gap-2.5 text-emerald-800 mb-2">
              <span className="text-xl">💬</span>
              <h4 className="font-extrabold text-sm uppercase tracking-wider">Instant Smart-Share</h4>
            </div>
            <p className="text-xs text-emerald-700 leading-relaxed">
              Format your material lists, logistics values, and customized payment installments into an exquisite text block. Perfect for sending directly on WhatsApp to clients!
            </p>
          </div>

          {shareSuccess && (
            <div className="mb-3 p-3 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 animate-fade-in">
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{shareSuccess}</span>
            </div>
          )}

          {/* Textarea View of WhatsApp content */}
          <div className="relative border border-neutral-200 rounded-2xl bg-neutral-50 p-4 font-mono text-[11px] leading-relaxed text-neutral-800 max-h-72 overflow-y-auto whitespace-pre-line shadow-inner">
            <button
              onClick={copyToClipboard}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
              title="Copy quote script"
              id="copy-to-clipboard-btn"
            >
              {copiedText ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-bold">
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </span>
              )}
            </button>
            {decodeURIComponent(generateWhatsAppMessage())}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={`https://api.whatsapp.com/send?text=${generateWhatsAppMessage()}`}
              target="_blank"
              rel="noreferrer referrer"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] text-white px-4 py-3 text-xs font-bold hover:bg-[#20ba59] active:scale-95 transition-all shadow-md shadow-emerald-700/10 text-center"
              id="raw-whatsapp-share-btn"
            >
              <Smartphone className="h-4 w-4" />
              Open WhatsApp with Text Quotation
            </a>
            <button
              onClick={sharePdf}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-3 text-xs font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-500/10 cursor-pointer"
              id="whatsapp-mode-share-file-btn"
            >
              <Share2 className="h-4 w-4" />
              Share as PDF File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
