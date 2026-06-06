import { TradeKey, BaselinesType } from './types';

export const TRADE_CONFIG: Record<TradeKey, { jobs: Record<string, string>; materials: string[] }> = {
  pop: {
    jobs: { full: "Full POP Ceiling", cornice: "Cornice & Plastering", skim: "Skimming" },
    materials: ["POP Cement", "Fiber", "Wall Nails", "Frytol", "Binding Wire", "Marine Board", "Home Charm", "Key Soap"]
  },
  tiling: {
    jobs: { floor: "Floor Tiling", wall: "Wall Tiling" },
    materials: ["Tiles", "Grout", "Tile Adhesive", "Spacers"]
  },
  painting: {
    jobs: { interior: "Interior Painting", exterior: "Exterior Painting", decorative: "Decorative/Textured" },
    materials: ["Primer", "Final Paint", "Thinner", "Sandpaper", "Masking Tape"]
  }
};

export const INITIAL_BASELINES: BaselinesType = {
  pop: {
    full: {
      "POP Cement": { qty: 60, price: 92, unit: "Bags" },
      "Fiber": { qty: 65, price: 38, unit: "Kg" },
      "Wall Nails": { qty: 1, price: 24, unit: "Box" },
      "Frytol": { qty: 5, price: 210, unit: "Liters" },
      "Binding Wire": { qty: 1.5, price: 85, unit: "Bundles" },
      "Marine Board": { qty: 1, price: 500, unit: "Piece", fixed: true },
      "Home Charm": { qty: 5, price: 300, unit: "Buckets" },
      "Key Soap": { qty: 5, price: 20, unit: "Bars" }
    },
    cornice: {
      "POP Cement": { qty: 15, price: 92, unit: "Bags" },
      "Fiber": { qty: 20, price: 38, unit: "Kg" },
      "Wall Nails": { qty: 0.5, price: 24, unit: "Box" },
      "Binding Wire": { qty: 0.5, price: 85, unit: "Bundles" },
      "Home Charm": { qty: 2, price: 300, unit: "Buckets" },
      "Key Soap": { qty: 2, price: 20, unit: "Bars" }
    },
    skim: {
      "POP Cement": { qty: 40, price: 92, unit: "Bags" },
      "Fiber": { qty: 10, price: 38, unit: "Kg" },
      "Home Charm": { qty: 10, price: 300, unit: "Buckets" },
      "Key Soap": { qty: 10, price: 20, unit: "Bars" }
    }
  },
  tiling: {
    floor: {
      "Tiles": { qty: 110, price: 150, unit: "m²" },
      "Grout": { qty: 10, price: 40, unit: "Kg" },
      "Tile Adhesive": { qty: 30, price: 85, unit: "Bags" },
      "Spacers": { qty: 1, price: 15, unit: "Pack" }
    },
    wall: {
      "Tiles": { qty: 110, price: 150, unit: "m²" },
      "Grout": { qty: 10, price: 40, unit: "Kg" },
      "Tile Adhesive": { qty: 40, price: 85, unit: "Bags" },
      "Spacers": { qty: 1, price: 15, unit: "Pack" }
    }
  },
  painting: {
    interior: {
      "Primer": { qty: 2, price: 200, unit: "Buckets" },
      "Final Paint": { qty: 4, price: 450, unit: "Buckets" },
      "Thinner": { qty: 1, price: 120, unit: "Liters" },
      "Sandpaper": { qty: 10, price: 5, unit: "Sheets" },
      "Masking Tape": { qty: 4, price: 15, unit: "Rolls" }
    },
    exterior: {
      "Primer": { qty: 3, price: 200, unit: "Buckets" },
      "Final Paint": { qty: 6, price: 500, unit: "Buckets" },
      "Thinner": { qty: 2, price: 120, unit: "Liters" },
      "Sandpaper": { qty: 15, price: 5, unit: "Sheets" },
      "Masking Tape": { qty: 6, price: 15, unit: "Rolls" }
    },
    decorative: {
      "Primer": { qty: 2, price: 200, unit: "Buckets" },
      "Final Paint": { qty: 5, price: 600, unit: "Buckets" },
      "Decorative Paste": { qty: 10, price: 300, unit: "Kg" }
    }
  }
};

export const DEFAULT_LABOR_RATES: Record<TradeKey, Record<string, number>> = {
  pop: { full: 45, cornice: 25, skim: 15 },
  tiling: { floor: 60, wall: 75 },
  painting: { interior: 20, exterior: 30, decorative: 80 }
};

export const INITIAL_BIZ_PROFILE = {
  name: "DzidEstimator Trades",
  location: "Accra, Ghana",
  phone: "+233 24 123 4567",
  slogan: "Precision Finishing and Premium Standard Trades",
  termsAndConditions: "1. This estimation incorporates a physical material waste contingent index of {wastePercent}% to allow for product cuts or damages during install.\n2. Payment of the specified {depositPercent}% contract mobilization advance is required prior to shipping and delivery of physical supplies to site.\n3. Remaining balance must be cleared fully on immediate successful client verification of structural completions.\n4. Notice: If this estimate is longer than 3 months, it needs to be updated due to material cost fluctuations.",
  logo: "",
  currency: 'GHS' as const
};
