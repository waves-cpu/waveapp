

export interface AdjustmentHistory {
  date: Date;
  change: number;
  reason: string;
  newStockLevel: number;
}

export interface ChannelPrice {
    id: string;
    channel: string;
    price: number;
}

export interface InventoryItemVariant {
  id: string;
  name: string;
  sku?: string;
  stock: number;
  price: number;
  costPrice?: number;
  history: AdjustmentHistory[];
  channelPrices?: ChannelPrice[];
  parentName?: string;
  parentImageUrl?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  sku?: string;
  imageUrl?: string;
  variants?: InventoryItemVariant[];
  stock?: number;
  price?: number;
  costPrice?: number;
  size?: string;
  history?: AdjustmentHistory[];
  channelPrices?: ChannelPrice[];
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
  cogsAtSale?: number;
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

export interface ManualJournalEntry {
    id: string;
    date: string; // ISO string
    description: string;
    debitAccount: string;
    creditAccount: string;
    amount: number;
    type: 'manual';
}

export type ShippingStatus = 'pending' | 'shipped' | 'delivered' | 'returned' | 'cancelled' | 'reconciled';

export interface ShippingReceipt {
    id: string;
    receiptNumber: string;
    shippingService: string;
    status: ShippingStatus;
    scannedAt: string; // ISO string
}
    
