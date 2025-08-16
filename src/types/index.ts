
export interface AdjustmentHistory {
  date: Date;
  change: number;
  reason: string;
  newStockLevel: number;
}

export interface InventoryItemVariant {
  id: string;
  name: string;
  sku?: string;
  stock: number;
  price: number;
  history: AdjustmentHistory[];
  parentName?: string; // Optional: To hold the parent product's name
  parentImageUrl?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  sku?: string;
  imageUrl?: string;
  variants?: InventoryItemVariant[];
  // These are for non-variant items
  stock?: number;
  price?: number;
  size?: string;
  history?: AdjustmentHistory[];
}

export interface Sale {
  id: string;
  transactionId?: string;
  paymentMethod?: string;
  resellerName?: string;
  productId: string;
  variantId?: string;
  channel: string;
  quantity: number;
  priceAtSale: number;
  saleDate: string; // ISO String
  productName: string;
  variantName?: string;
  sku?: string;
}

export interface Reseller {
    id: number;
    name: string;
    phone?: string;
    address?: string;
}
