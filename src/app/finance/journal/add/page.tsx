
'use client';

import { AppLayout } from "@/app/components/app-layout";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useInventory } from "@/hooks/use-inventory";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  date: z.date({
    required_error: "Tanggal transaksi harus diisi.",
  }),
  description: z.string().min(3, {
    message: "Deskripsi minimal 3 karakter.",
  }),
  amount: z.coerce.number().min(1, {
    message: "Jumlah harus lebih dari 0.",
  }),
  debitAccount: z.string({
    required_error: "Akun debit harus dipilih.",
  }),
  creditAccount: z.string({
    required_error: "Akun kredit harus dipilih.",
  }),
}).refine(data => data.debitAccount !== data.creditAccount, {
    message: "Akun debit dan kredit tidak boleh sama.",
    path: ["creditAccount"],
});

const chartOfAccounts = [
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

export default function AddManualJournalEntryPage() {
    const { createManualJournalEntry } = useInventory();
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            date: new Date(),
            description: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        try {
            await createManualJournalEntry({
                ...values,
                date: values.date.toISOString(),
            });
            toast({
                title: "Entri Jurnal Berhasil",
                description: "Entri jurnal manual Anda telah berhasil disimpan.",
            });
            router.push('/finance/journal');
        } catch (error) {
            toast({
                variant: 'destructive',
                title: "Gagal Menyimpan",
                description: "Terjadi kesalahan saat menyimpan entri jurnal.",
            });
             setIsSubmitting(false);
        }
    }

    return (
        <AppLayout>
            <main className="flex-1 p-4 md:p-10">
                <div className="flex items-center gap-4 mb-6">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-lg font-bold">Tambah Entri Jurnal Manual</h1>
                </div>
                <div className="max-w-2xl mx-auto">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                             <Card>
                                <CardHeader>
                                    <CardTitle>Detail Transaksi</CardTitle>
                                    <CardDescription>Masukkan informasi untuk entri jurnal manual.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                     <FormField
                                        control={form.control}
                                        name="date"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                            <FormLabel>Tanggal Transaksi</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-[240px] pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                    >
                                                    {field.value ? (
                                                        format(field.value, "PPP")
                                                    ) : (
                                                        <span>Pilih tanggal</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    disabled={(date) =>
                                                    date > new Date() || date < new Date("1900-01-01")
                                                    }
                                                    initialFocus
                                                />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Deskripsi</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Contoh: Pembayaran biaya sewa bulan Juli" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="amount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Jumlah (Rp)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="500000" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="debitAccount"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Akun Debit</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Pilih akun debit" />
                                                        </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {chartOfAccounts.map(acc => <SelectItem key={`debit-${acc}`} value={acc}>{acc}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                         <FormField
                                            control={form.control}
                                            name="creditAccount"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Akun Kredit</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Pilih akun kredit" />
                                                        </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {chartOfAccounts.map(acc => <SelectItem key={`credit-${acc}`} value={acc}>{acc}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </CardContent>
                                <CardFooter className="justify-end gap-2">
                                     <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isSubmitting}>Batal</Button>
                                     <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? 'Menyimpan...' : 'Simpan Entri Jurnal'}
                                     </Button>
                                </CardFooter>
                             </Card>
                        </form>
                    </Form>
                </div>
            </main>
        </AppLayout>
    );
}

