
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from "@/components/ui/button";
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
import { useEffect, useState } from "react";
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

interface AddManualJournalDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddManualJournalDialog({ open, onOpenChange }: AddManualJournalDialogProps) {
    const { createManualJournalEntry } = useInventory();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            date: new Date(),
            description: "",
        },
    });

    useEffect(() => {
        if (!open) {
            form.reset({
                date: new Date(),
                description: "",
                amount: undefined,
                debitAccount: undefined,
                creditAccount: undefined
            });
        }
    }, [open, form]);

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
            onOpenChange(false);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: "Gagal Menyimpan",
                description: "Terjadi kesalahan saat menyimpan entri jurnal.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Tambah Entri Jurnal Manual</DialogTitle>
                    <DialogDescription>Masukkan informasi untuk entri jurnal manual.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
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
                         <DialogFooter className="pt-4">
                             <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Batal</Button>
                             <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Menyimpan...' : 'Simpan Entri Jurnal'}
                             </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
