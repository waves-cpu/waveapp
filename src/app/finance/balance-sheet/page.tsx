
'use client';

import { AppLayout } from "@/app/components/app-layout";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/types/language";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useInventory } from "@/hooks/use-inventory";
import { useMemo } from "react";

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function BalanceSheetSkeleton() {
    return (
        <div className="grid md:grid-cols-2 gap-6 items-start">
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                             <div key={i} className="flex justify-between">
                                <Skeleton className="h-5 w-1/3" />
                                <Skeleton className="h-5 w-1/4" />
                             </div>
                        ))}
                    </div>
                </CardContent>
                <CardFooter>
                    <div className="flex justify-between w-full">
                        <Skeleton className="h-6 w-1/3" />
                        <Skeleton className="h-6 w-1/4" />
                    </div>
                </CardFooter>
            </Card>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[...Array(2)].map((_, i) => (
                                <div key={i} className="flex justify-between">
                                    <Skeleton className="h-5 w-1/3" />
                                    <Skeleton className="h-5 w-1/4" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-24" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[...Array(2)].map((_, i) => (
                                <div key={i} className="flex justify-between">
                                    <Skeleton className="h-5 w-1/3" />
                                    <Skeleton className="h-5 w-1/4" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-muted">
                    <CardFooter>
                        <div className="flex justify-between w-full font-bold">
                             <Skeleton className="h-6 w-1/3" />
                             <Skeleton className="h-6 w-1/4" />
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}


export default function BalanceSheetPage() {
    const { language } = useLanguage();
    const t = translations[language];
    const { items, allSales, manualJournalEntries, loading } = useInventory();

    const financialData = useMemo(() => {
        // ASET
        const totalInventoryValue = items.reduce((sum, item) => {
            const cost = item.costPrice || 0;
            if (item.variants && item.variants.length > 0) {
                return sum + item.variants.reduce((variantSum, v) => variantSum + (v.stock * (v.costPrice || 0)), 0);
            }
            return sum + ((item.stock || 0) * cost);
        }, 0);

        const totalRevenue = allSales.reduce((sum, sale) => sum + (sale.priceAtSale * sale.quantity), 0);
        
        // LIABILITAS + EKUITAS
        const totalCogs = allSales.reduce((sum, sale) => sum + ((sale.cogsAtSale || 0) * sale.quantity), 0);
        const grossProfit = totalRevenue - totalCogs;
        
        const operationalExpenses = manualJournalEntries
            .filter(entry => entry.debitAccount.toLowerCase().includes('biaya') || entry.debitAccount.toLowerCase().includes('beban'))
            .reduce((sum, entry) => sum + entry.amount, 0);

        const otherIncome = manualJournalEntries
            .filter(entry => entry.creditAccount.toLowerCase().includes('pendapatan'))
            .reduce((sum, entry) => sum + entry.amount, 0);
        
        const retainedEarnings = grossProfit - operationalExpenses + otherIncome;

        // This is a simplified calculation. A real-world scenario would be more complex.
        const cash = totalRevenue - operationalExpenses; // Very simplified
        const totalAssets = cash + totalInventoryValue;

        const liabilities = 0; // Assuming no liabilities recorded yet
        const totalEquity = retainedEarnings; // Simplified
        
        const totalLiabilitiesAndEquity = liabilities + totalEquity;

        return {
            assets: {
                cash,
                inventory: totalInventoryValue,
                total: totalAssets
            },
            liabilities: {
                accountsPayable: 0,
                total: 0,
            },
            equity: {
                retainedEarnings,
                total: totalEquity
            },
            totalLiabilitiesAndEquity
        };

    }, [items, allSales, manualJournalEntries]);

    if (loading) {
        return (
            <AppLayout>
                <main className="flex-1 p-4 md:p-10">
                    <div className="flex items-center gap-4 mb-6">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-lg font-bold">{t.finance.balanceSheet}</h1>
                    </div>
                    <BalanceSheetSkeleton />
                </main>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-lg font-bold">{t.finance.balanceSheet}</h1>
                </div>

                <div className="grid md:grid-cols-2 gap-8 items-start">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Aset</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium text-xs">Kas dan Setara Kas</TableCell>
                                        <TableCell className="text-right text-xs">{formatCurrency(financialData.assets.cash)}</TableCell>
                                    </TableRow>
                                     <TableRow>
                                        <TableCell className="font-medium text-xs">Persediaan Barang</TableCell>
                                        <TableCell className="text-right text-xs">{formatCurrency(financialData.assets.inventory)}</TableCell>
                                    </TableRow>
                                </TableBody>
                             </Table>
                        </CardContent>
                        <CardFooter className="font-bold">
                            <div className="flex justify-between w-full text-sm">
                                <span>Total Aset</span>
                                <span>{formatCurrency(financialData.assets.total)}</span>
                            </div>
                        </CardFooter>
                    </Card>

                    <div className="space-y-6">
                        <Card>
                             <CardHeader>
                                <CardTitle className="text-base">Liabilitas</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableBody>
                                         <TableRow>
                                            <TableCell className="font-medium text-xs">Utang Usaha</TableCell>
                                            <TableCell className="text-right text-xs">{formatCurrency(financialData.liabilities.accountsPayable)}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                             <CardFooter className="font-bold">
                                <div className="flex justify-between w-full text-sm">
                                    <span>Total Liabilitas</span>
                                    <span>{formatCurrency(financialData.liabilities.total)}</span>
                                </div>
                            </CardFooter>
                        </Card>
                         <Card>
                             <CardHeader>
                                <CardTitle className="text-base">Ekuitas</CardTitle>
                            </CardHeader>
                            <CardContent>
                                 <Table>
                                    <TableBody>
                                         <TableRow>
                                            <TableCell className="font-medium text-xs">Laba Ditahan</TableCell>
                                            <TableCell className="text-right text-xs">{formatCurrency(financialData.equity.retainedEarnings)}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                              <CardFooter className="font-bold">
                                <div className="flex justify-between w-full text-sm">
                                    <span>Total Ekuitas</span>
                                    <span>{formatCurrency(financialData.equity.total)}</span>
                                </div>
                            </CardFooter>
                        </Card>

                        <Card className="bg-muted">
                            <CardFooter className="pt-6 font-bold">
                                <div className="flex justify-between w-full text-sm">
                                    <span>Total Liabilitas dan Ekuitas</span>
                                    <span>{formatCurrency(financialData.totalLiabilitiesAndEquity)}</span>
                                </div>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </main>
        </AppLayout>
    );
}
