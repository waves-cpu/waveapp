export interface AdjustmentHistory {
  date: Date;
  change: number;
  reason: string;
  newStockLevel: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  history: AdjustmentHistory[];
}
