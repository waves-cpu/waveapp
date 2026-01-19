'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useInventory } from '@/hooks/use-inventory';
import type { InventoryItem, InventoryItemVariant, Accessory, SearchableItem, Sale, DiscountGroup, Reseller } from '@/types';
import { PosSearch } from './pos-search';
import { PosOrderSummary } from './pos-order-summary';
import { VariantSelectionDialog } from './variant-selection-dialog';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { ShoppingCart, Trash2, Tags } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { useScanSounds } from '@/hooks/use-scan-sounds';
import { PosReceipt, type ReceiptData } from './pos-receipt';
import { useDebounce } from '@/hooks/use-debounce';
import { AccessoryUsageVoucher, type VoucherData } from './accessory-usage-voucher';
import { ResellerInvoice, type InvoiceData } from './reseller-invoice';


export type CartItem = {
    id: string; // variantId or accessoryId or productId
    productId: string; // parent product ID
    productName: string;
    variantName?: string;
    sku: string;
    quantity: number;
    price: number;
    originalPrice: number;
    category: string;
    imageUrl?: string;
    type: 'product' | 'accessory';
    maxStock: number;
};


const LOCAL_STORAGE_KEY = 'posCart';

interface PosCartProps {
    onVoucherApplied: (voucher: DiscountGroup | null) => void;
    activeVoucher: DiscountGroup | null;
}

export function PosCart({ onVoucherApplied, activeVoucher }: PosCartProps) {
    const { recordSale, items: inventoryItems, accessories, loading: inventoryLoading, pendingTransaction, clearPendingTransaction, cancelSaleTransaction, fetchItems, findProductBySku, getActiveDiscountPrice, resellers } = useInventory();
    const { language } = useLanguage();
    const { playSuccessSound, playErrorSound } = useScanSounds();
    const t = translations[language];
    const { toast } = useToast();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [productForVariantSelection, setProductForVariantSelection] = useState<InventoryItem | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [receiptToPrint, setReceiptToPrint] = useState<ReceiptData | null>(null);
    const [voucherToPrint, setVoucherToPrint] = useState<VoucherData | null>(null);
    const [invoiceToPrint, setInvoiceToPrint] = useState<InvoiceData | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [pendingTransactionId, setPendingTransactionId] = useState<string | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [selectedReseller, setSelectedReseller] = useState<Reseller | null>(null);

    const searchSuggestions = useMemo((): SearchableItem[] => {
        if (debouncedSearchTerm.length < 2) return [];
        const lowercasedTerm = debouncedSearchTerm.toLowerCase();
        
        const products: SearchableItem[] = inventoryItems
            .filter(item => !item.isArchived)
            .map(item => ({...item, itemType: 'product'}));
            
        const allAccessories: SearchableItem[] = accessories
            .map(item => ({...item, itemType: 'accessory'}));

        const allSearchableItems = [...products, ...allAccessories];

        return allSearchableItems.filter(item => 
            item.name.toLowerCase().includes(lowercasedTerm) ||
            (item.sku && item.sku.toLowerCase().includes(lowercasedTerm)) ||
            ('variants' in item && item.variants?.some(v => v.sku?.toLowerCase().includes(lowercasedTerm)))
        ).slice(0, 10);
    }, [debouncedSearchTerm, inventoryItems, accessories]);

    useEffect(() => {
        setIsClient(true);
        try {
            if (pendingTransaction) {
                 const aggregatedCart = new Map<string, CartItem>();
                pendingTransaction.forEach(saleItem => {
                    const id = saleItem.accessoryId?.toString() || saleItem.variantId?.toString() || saleItem.productId!.toString();
                    const type = saleItem.accessoryId ? 'accessory' : 'product';
                    const key = `${type}-${id}`;
                    
                    const existing = aggregatedCart.get(key);
                    if (existing) {
                        existing.quantity += saleItem.quantity;
                    } else {
                        aggregatedCart.set(key, {
                            id,
                            type,
                            productId: saleItem.productId?.toString() || saleItem.accessoryId!.toString(),
                            productName: saleItem.productName,
                            variantName: saleItem.variantName,
                            sku: saleItem.sku!,
                            quantity: saleItem.quantity,
                            price: saleItem.priceAtSale,
                            originalPrice: saleItem.priceAtSale, // Assume originalPrice is priceAtSale on resume
                            category: saleItem.productCategory,
                            imageUrl: saleItem.parentImageUrl,
                            maxStock: 999 // Placeholder, should be updated if possible
                        });
                    }
                });
                setCart(Array.from(aggregatedCart.values()));
                setPendingTransactionId(pendingTransaction[0]?.transactionId || null);
                clearPendingTransaction();
            } else {
                const savedCart = localStorage.getItem(LOCAL_STORAGE_KEY);
                if (savedCart) {
                    setCart(JSON.parse(savedCart));
                }
            }
        } catch (error) {
            console.error("Failed to load cart from localStorage", error);
        }
    }, [pendingTransaction, clearPendingTransaction]);

    useEffect(() => {
        if (isClient) {
            try {
                if (cart.length > 0) {
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cart));
                } else {
                    localStorage.removeItem(LOCAL_STORAGE_KEY);
                }
            } catch (error) {
                console.error("Failed to save cart to localStorage", error);
            }
        }
    }, [cart, isClient]);

    // This useEffect handles the printing after the state has been updated
    useEffect(() => {
        if (receiptToPrint || voucherToPrint || invoiceToPrint) {
            // Timeout ensures the component has time to render before printing
            const timer = setTimeout(() => {
                window.print();
                setReceiptToPrint(null); // Reset after printing
                setVoucherToPrint(null);
                setInvoiceToPrint(null);
            }, 100); 
            return () => clearTimeout(timer);
        }
    }, [receiptToPrint, voucherToPrint, invoiceToPrint]);
    
    // Effect to refocus the search input after cart updates or dialog closes
    useEffect(() => {
        // Only focus if the variant selection dialog is not open
        if (!productForVariantSelection) {
            searchInputRef.current?.focus();
        }
    }, [cart.length, productForVariantSelection]);
    
    useEffect(() => {
        if (!isClient || cart.length === 0) return;

        let isMounted = true;

        const updateCartPrices = async () => {
            const channel = selectedReseller ? 'reseller' : 'pos';
            
            const updatedCart = await Promise.all(cart.map(async (item) => {
                if (item.type === 'product') {
                    const discountedPrice = await getActiveDiscountPrice(
                        item.productId, 
                        item.id, // The item.id is the variantId in this context
                        item.category, 
                        channel
                    );
                    return {
                        ...item,
                        price: discountedPrice ?? item.originalPrice,
                    };
                }
                return item; // No price change for accessories
            }));

            if (isMounted) {
                setCart(updatedCart);
            }
        };

        updateCartPrices();

        return () => {
            isMounted = false;
        };
    }, [selectedReseller, isClient]); // Only run when reseller changes

    const handleResellerChange = (resellerId: string) => {
        if (resellerId === 'general') {
            setSelectedReseller(null);
            return;
        }
        const reseller = resellers.find(r => r.id.toString() === resellerId);
        setSelectedReseller(reseller || null);
    };

    const addToCart = useCallback(async (item: InventoryItem | Accessory, variant?: InventoryItemVariant) => {
        let itemToAdd: CartItem;
        const channel = selectedReseller ? 'reseller' : 'pos';

        if (item.hasOwnProperty('itemType') && (item as any).itemType === 'accessory') {
            const accessory = item as Accessory;
            if (!accessory.sku) {
                toast({ variant: "destructive", title: "SKU Missing", description: `Accessory '${accessory.name}' cannot be added without a SKU.`});
                playErrorSound();
                return;
            }
             if (accessory.stock <= 0) {
                toast({ variant: 'destructive', title: 'Stok Habis', description: `Stok untuk ${accessory.name} sudah habis.` });
                playErrorSound();
                return;
            }
            const price = accessory.price || 0;
            itemToAdd = {
                id: accessory.id,
                productId: accessory.id,
                productName: accessory.name,
                sku: accessory.sku!,
                price: price, 
                originalPrice: price,
                category: accessory.category || 'Aksesoris',
                quantity: 1,
                imageUrl: '',
                type: 'accessory',
                maxStock: accessory.stock,
            };
        } else { // It's a product
            const product = item as InventoryItem;
            const itemToAddRaw = variant || product;
            if ((itemToAddRaw.stock ?? 0) <= 0) {
                toast({ variant: 'destructive', title: 'Stok Habis', description: `Stok untuk ${product.name} ${itemToAddRaw.name ? `- ${itemToAddRaw.name}` : ''} sudah habis.` });
                playErrorSound();
                return;
            }
            
            const originalPrice = itemToAddRaw.price || 0;
            const discountedPrice = await getActiveDiscountPrice(product.id, variant?.id || null, product.category, channel);
            
            itemToAdd = {
                id: itemToAddRaw.id,
                productId: product.id,
                productName: product.name,
                variantName: variant?.name,
                sku: itemToAddRaw.sku!,
                quantity: 1,
                price: discountedPrice ?? originalPrice,
                originalPrice: originalPrice,
                category: product.category,
                imageUrl: product.imageUrl,
                type: 'product',
                maxStock: itemToAddRaw.stock!,
            }
        }


        const existingCartItem = cart.find(ci => ci.id === itemToAdd.id && ci.type === itemToAdd.type);
        const quantityInCart = existingCartItem?.quantity || 0;
        
        if (itemToAdd.maxStock === undefined || quantityInCart >= itemToAdd.maxStock) {
             toast({
                variant: "destructive",
                title: "Stok tidak mencukupi",
                description: `Anda tidak dapat menambahkan ${itemToAdd.productName} ${itemToAdd.variantName || ''} lagi.`,
            });
            playErrorSound();
            return;
        }
        playSuccessSound();

        setCart(currentCart => {
            if (existingCartItem) {
                return currentCart.map(cartItem =>
                    cartItem.id === itemToAdd.id && cartItem.type === itemToAdd.type
                        ? { ...cartItem, quantity: cartItem.quantity + 1 }
                        : cartItem
                );
            }
            return [...currentCart, itemToAdd];
        });
    }, [cart, toast, playSuccessSound, playErrorSound, getActiveDiscountPrice, selectedReseller]);

    const handleProductSelect = useCallback(async (item: SearchableItem) => {
        try {
            if (item.itemType === 'accessory') {
                addToCart(item as Accessory);
            } else { // product
                const product = item as InventoryItem;
                if (product.variants && product.variants.length > 1) {
                    setProductForVariantSelection(product);
                } else if (product.variants && product.variants.length === 1) {
                    addToCart(product, product.variants[0]);
                } else {
                    addToCart(product);
                }
            }
        } catch (error) {
            console.error("Error adding item to cart:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Gagal menambahkan item ke keranjang.",
            });
            playErrorSound();
        }
    }, [addToCart, toast, playErrorSound]);
    
    const handleSkuSubmit = useCallback(async (sku: string) => {
        const productData = await findProductBySku(sku);

        if (!productData) {
            playErrorSound();
            toast({ variant: 'destructive', title: 'Produk Tidak Ditemukan', description: `Tidak ada produk yang cocok dengan SKU '${sku}'` });
            return;
        }

        // Case 1: The SKU belongs to a specific variant. `findProductBySku` returns the parent with ONLY that variant.
        if (productData.variants && productData.variants.length === 1) {
            addToCart(productData, productData.variants[0]);
        }
        // Case 2: The SKU belongs to a parent product with multiple variants.
        else if (productData.variants && productData.variants.length > 1) {
            setProductForVariantSelection(productData);
        }
        // Case 3: The SKU belongs to a simple product (no variants).
        else {
            addToCart(productData);
        }
    }, [findProductBySku, addToCart, playErrorSound, toast]);


    const handleVariantSelect = (variant: InventoryItemVariant | null) => {
        if (variant && productForVariantSelection) {
            addToCart(productForVariantSelection, variant);
        }
        setProductForVariantSelection(null);
    };

    const updateQuantity = (itemId: string, itemType: 'product' | 'accessory', newQuantity: number) => {
        setCart(currentCart => {
            const item = currentCart.find(ci => ci.id === itemId && ci.type === itemType);
            if (!item) return currentCart;

            if (newQuantity <= 0) {
                return currentCart.filter(ci => !(ci.id === itemId && ci.type === itemType));
            }

            if (newQuantity > item.maxStock) {
                return currentCart.map(ci => ci.id === itemId && ci.type === itemType ? { ...ci, quantity: item.maxStock } : ci);
            }

            return currentCart.map(ci => ci.id === itemId && ci.type === itemType ? { ...ci, quantity: newQuantity } : ci);
        });
    };
    
    // Effect to show toast when quantity exceeds max stock
    useEffect(() => {
        cart.forEach(item => {
            if (item.quantity > item.maxStock) {
                toast({
                    variant: "destructive",
                    title: "Stok tidak mencukupi",
                    description: `Hanya tersedia ${item.maxStock} stok untuk ${item.productName}.`,
                });
            }
        });
    }, [cart, toast]);
    
    const removeFromCart = (itemId: string, itemType: 'product' | 'accessory') => {
        setCart(currentCart => currentCart.filter(item => !(item.id === itemId && item.type === itemType)));
    };

    const clearCart = () => {
        setCart([]);
        setPendingTransactionId(null);
        setSelectedReseller(null);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
    };

    const handleSaleComplete = async (paymentMethod: string, receiptData: ReceiptData, status: 'Completed' | 'Pending' = 'Completed', voucherCode?: string, reseller?: Reseller | null) => {
        
        const { total, subtotal, discount } = receiptData;
        
        const salesData = cart.map(item => {
            return {
                sku: item.sku,
                quantity: item.quantity,
                priceAtSale: item.price,
            };
        });
        
        const transactionId = pendingTransactionId || `trans-${Date.now()}`;

        try {
            await recordSale('pos', {
                sales: salesData,
                transactionId: transactionId,
                paymentMethod: paymentMethod,
                status: status,
                voucherCode: voucherCode,
                resellerId: reseller?.id,
                resellerName: reseller?.name
            });

            if (status === 'Completed') {
                if (reseller) {
                    toast({
                        title: "Invoice Dibuat",
                        description: `Invoice untuk ${reseller.name} sedang disiapkan.`
                    });
                    setInvoiceToPrint({
                        items: cart,
                        subtotal: receiptData.subtotal,
                        discount: receiptData.discount,
                        total: receiptData.total,
                        transactionId: transactionId,
                        reseller: reseller,
                    });
                } else {
                    const isAccessoryOnly = cart.every(item => item.type === 'accessory');
                    if (isAccessoryOnly) {
                        toast({
                            title: "Pemakaian Aksesoris Dicatat",
                            description: "Voucher pengambilan barang sedang dicetak."
                        });
                        setVoucherToPrint({
                            items: cart,
                            transactionId: transactionId,
                            date: new Date(),
                        });
                    } else {
                        toast({
                            title: "Penjualan Berhasil",
                            description: "Transaksi telah berhasil dicatat."
                        });
                        setReceiptToPrint({ ...receiptData, transactionId: transactionId });
                    }
                }
            } else { // Pending
                toast({
                    title: "Transaksi Disimpan",
                    description: "Transaksi telah disimpan dan dapat dilanjutkan nanti."
                });
            }
            await fetchItems(); // Re-sync data from server
        } catch (error) {
            console.error("Failed to complete sale:", error);
            toast({
                variant: "destructive",
                title: "Gagal Menyelesaikan Penjualan",
                description: error instanceof Error ? error.message : "Terjadi kesalahan saat memproses transaksi.",
            });
            throw error; // Re-throw to prevent form reset in summary component
        }
    };


    return (
        <>
        <div className="flex-grow grid grid-cols-1 lg:grid-cols-5 gap-4 p-4 h-full no-print">
            <div className="lg:col-span-3 flex flex-col gap-4 h-full">
                <PosSearch 
                    onProductSelect={handleProductSelect} 
                    onSkuSubmit={handleSkuSubmit}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    suggestions={searchSuggestions}
                    ref={searchInputRef}
                />
                <Card className="flex-grow flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-base">{t.pos.orderSummary}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow overflow-hidden p-0">
                        <ScrollArea className="h-full max-h-[calc(100vh-20rem)]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50%] text-xs">{t.pos.item}</TableHead>
                                        <TableHead className="text-center text-xs">{t.pos.qty}</TableHead>
                                        <TableHead className="text-left text-xs">{t.pos.price}</TableHead>
                                        <TableHead className="text-left text-xs">Total</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cart.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-48 text-center">
                                                <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                                    <ShoppingCart className="h-12 w-12" />
                                                    <p className="font-semibold text-sm">{t.pos.emptyCart}</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : cart.map(item => (
                                        <TableRow key={`${item.type}-${item.id}`}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                     {item.type === 'product' ? (
                                                        <Image src={item.imageUrl || 'https://placehold.co/40x40.png'} alt={item.productName} width={32} height={32} className="rounded-md" data-ai-hint="product image" />
                                                     ) : (
                                                         <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/50">
                                                            <Tags className="h-4 w-4 text-muted-foreground" />
                                                         </div>
                                                     )}
                                                    <div>
                                                        <p className="font-medium text-sm truncate max-w-[250px]">{item.productName}</p>
                                                        <p className="text-xs text-muted-foreground">{item.variantName || 'Aksesoris'}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center">
                                                    <Input type="number" value={item.quantity} onChange={(e) => updateQuantity(item.id, item.type, parseInt(e.target.value) || 0)} className="w-16 h-8 text-center text-sm focus-visible:ring-1" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-left text-sm">{item.price.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                                            <TableCell className="text-left font-medium text-sm">{(item.price * item.quantity).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                                            <TableCell>
                                                 <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => removeFromCart(item.id, item.type)}>
                                                    <Trash2 className="h-4 w-4" />
                                                 </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2 h-full">
                 <PosOrderSummary
                    cart={cart}
                    onSaleComplete={handleSaleComplete}
                    clearCart={clearCart}
                    channel="pos"
                    pendingTransactionId={pendingTransactionId}
                    onVoucherApplied={onVoucherApplied}
                    activeVoucher={activeVoucher}
                    selectedReseller={selectedReseller}
                    onResellerChange={handleResellerChange}
                />
            </div>
             {productForVariantSelection && (
                <VariantSelectionDialog
                    open={!!productForVariantSelection}
                    onOpenChange={(isOpen) => {
                        if (!isOpen) {
                            setProductForVariantSelection(null);
                        }
                    }}
                    item={productForVariantSelection}
                    onSelect={handleVariantSelect}
                    cart={cart}
                />
            )}
        </div>
         <div className="print-only">
            {receiptToPrint && <PosReceipt ref={null} receipt={receiptToPrint} />}
        </div>
         <div className="print-only-a4">
            {voucherToPrint && <AccessoryUsageVoucher ref={null} voucher={voucherToPrint} />}
            {invoiceToPrint && <ResellerInvoice ref={null} invoice={invoiceToPrint} />}
        </div>
        </>
    );
}

    