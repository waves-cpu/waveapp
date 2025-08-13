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
