

export const categories = [
    "T-Shirt Oversize",
    "T-Shirt Boxy",
    "Longsleeve",
    "Ringer",
    "Muscle",
    "Hoodie",
    "Rugby",
    "Kids",
    "Long Pants",
    "Short Pants",
    "Boxer",
    "Caps",
    "Sandals",
    "Bag"
].sort();

export const accessoryCategories = [
    "Label",
    "Hangtag",
    "Sticker",
    "Packaging",
    "Other"
].sort();


export const chartOfAccounts = [
    "Piutang Usaha / Kas",
    "Pendapatan Penjualan",
    "Beban Pokok Penjualan",
    "Persediaan Barang",
    "Kas / Utang Usaha",
    "Penyesuaian Modal (Persediaan)",
    // Manual Accounts
    "Biaya Operasional",
    "Biaya Gaji",
    "Biaya Sewa",
    "Biaya Pemasaran",
    "Aset Tetap",
    "Akumulasi Penyusutan",
    "Utang Bank",
    "Modal Disetor",
    "Pendapatan Lain-lain",
    "Biaya Lain-lain"
].sort();

export interface AdjustmentHistory {
  date: Date;
  change: number;
  reason: string;
  newStockLevel: number;
}

export interface Accessory {
    id: string;
    name: string;
    sku?: string;
    category?: string;
    stock: number;
    price?: number;
    costPrice?: number;
    history?: AdjustmentHistory[];
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
  isArchived?: boolean;
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
  productId?: string;
  variantId?: string;
  accessoryId?: string;
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

export interface ShippingReceipt {
    id: number;
    awb: string;
    date: string;
    channel: string;
    status: string;
}
