export interface Room {
  id: string;
  name: string;
  l: number; // in cm
  w: number; // in cm
}

export interface MaterialItem {
  qty: number;      // quantity ratio per 100 units (m² or m)
  price: number;    // price in GHS
  unit: string;     // unit of measurement, e.g., Bags, Kg, etc.
  fixed?: boolean;  // whether quantity is absolute/fixed vs proportional to area
}

export type TradeKey = string;

export interface Client {
  id: string;
  name: string;
  phone: string;
  defaultLocation?: string;
  projectHistory: {
    estimateId: string;
    projectName: string;
    date: string;
    total: number;
  }[];
}

export type BaselinesType = Record<TradeKey, Record<string, Record<string, MaterialItem & { defaultLabor?: number }>>>;

export type EstimateStatus = 'Draft' | 'Sent' | 'Accepted' | 'Completed';

export interface Estimate {
  id: string;
  clientName: string;
  projectName: string;
  jobLocation: string;
  trade: TradeKey;
  jobType: string;
  unitType: 'sqm' | 'lm';
  laborRate: number;
  wastePercent: number;
  transportFee: number;
  linearMeters: number;
  rooms: Room[];
  createdAt: string;
  grandTotal: number;
  materialTotal: number;
  laborTotal: number;
  status: EstimateStatus;
  photos?: string[];
  agreedPrice?: number;
  sealed?: boolean;
  materialsBoughtBy?: 'Contractor' | 'Client';
}

export interface BusinessProfile {
  name: string;
  location: string;
  phone: string;
  slogan: string;
  termsAndConditions?: string;
  logo?: string;
  currency?: string;
}

export interface PaymentReceipt {
  id: string; // e.g. RCP-20260605-001
  estimateId?: string; // Optional linked estimate
  clientName: string;
  clientPhone?: string;
  projectName: string;
  amountPaid: number;
  paymentMethod: 'Cash' | 'Mobile Money' | 'Bank Transfer' | 'Cheque' | 'Other';
  paymentDate: string;
  transactionRef?: string; // Cheque number, MoMo txn ID, Bank transaction code
  receivedBy?: string; // staff/rep name
  notes?: string;
  totalEstimateAmount?: number; // Total cost of project for calculating balance
}

