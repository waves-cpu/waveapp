

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
    "Hangtag",
    "Sticker",
    "Plastik",
    "Karet",
    "Label"
].sort();


export const chartOfAccounts = [
    "Piutang Usaha / Kas",
    "Pendapatan Penjualan",
    "Beban Pokok Penjualan",
    "Persediaan Barang",
    "Biaya Administrasi Marketplace",
].sort();

export interface AdjustmentHistory {
  date: Date;
  change: number;
  reason: string;
  newStockLevel: number;
  userId?: number;
  username?: string;
}

export type AccessoryUnit = 'Box' | 'Pcs' | 'Pack' | 'Bundle';

export interface Accessory {
    id: string;
    name: string;
    sku?: string;
    category?: string;
    unit: AccessoryUnit;
    quantityPerUnit?: number;
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
  releaseDate?: string;
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

export type SearchableItem = (InventoryItem | Accessory) & { itemType: 'product' | 'accessory' };


export interface Sale {
  id: string;
  transactionId?: string;
  paymentMethod?: string;
  productId?: string;
  variantId?: string;
  accessoryId?: string;
  resellerId?: number;
  resellerName?: string;
  parentSku?: string;
  channel: string;
  quantity: number;
  priceAtSale: number;
  cogsAtSale?: number;
  saleDate: string; // ISO String
  productName: string;
  productCategory: string;
  variantName?: string;
  sku?: string;
  status?: 'Completed' | 'Pending' | 'Cancelled' | 'Return' | 'Return Selesai' | 'Siap Kirim' | 'Tidak Sampai' | 'Dibatalkan';
  parentImageUrl?: string;
}

export interface ShippingReceipt {
    id: number;
    awb: string;
    date: string;
    channel: string; // Shipping provider (e.g., J&T, SPX)
    salesChannel?: string; // Sales channel (e.g., Shopee, Tiktok)
    status: string;
    transactionId?: string;
    userId?: number;
    username?: string;
}

export interface ShippingReceiptCounts {
  pendingToday: number;
  pendingBefore: number;
  statuses: Record<string, number>;
  shippingChannels: Record<string, number>;
  salesChannels: Record<string, Record<string, number>>;
  shippingChannelsBySalesChannel: Record<string, Record<string, number>>;
}

export interface PrintedReceiptCount {
    id: number;
    date: string;
    salesChannel: string;
    shippingChannel: string;
    count: number;
}

export interface BulkImportHistory {
    id: number;
    fileName: string;
    date: string;
    status: 'Memproses...' | 'Berhasil' | 'Gagal';
    progress?: number;
    addedCount?: number;
    skippedCount?: number;
    addedSkus?: { sku: string, name: string }[];
    skippedSkus?: { sku: string, name: string }[];
    error?: string;
}

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
}

export interface Employee {
  id: number;
  userId: number;
  username: string;
  role: string;
  nikKependudukan?: string;
  nikPekerja?: string;
  fullName: string;
  division?: string;
  position?: string;
  address?: string;
  startDate?: string;
}

export interface ReturnedItem {
    sku: string;
    name: string;
    quantity: number;
    price: number;
}

export interface DiscountedProduct {
  productId: number;
  variantId?: number;
  productName: string;
  variantName?: string;
  sku?: string;
  imageUrl?: string;
  originalPrice: number;
  discountedPrice: number;
}

export interface DiscountGroup {
  id: number;
  name: string;
  category: string;
  channel: string;
  startDate: string;
  endDate: string;
  voucherCode?: string;
  products: DiscountedProduct[];
  productCount?: number;
  discountType?: 'fixed' | 'percentage';
  discountValue?: number;
  maxUses?: number;
  minPurchase?: number;
}

export interface Voucher extends DiscountGroup {
    voucherCode: string;
    discountType: 'fixed' | 'percentage';
    discountValue: number;
}

export interface Reseller {
    id: number;
    name: string;
    phone?: string;
    address?: string;
    createdAt: string;
}
