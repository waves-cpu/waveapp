
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { InventoryItem, InventoryItemVariant } from '@/types';

const stockInItemSchema = z.object({
    itemId: z.string().min(1, "Please select an item."),
    quantity: z.coerce.number().int().min(1, "Quantity must be at least 1."),
    reason: z.string().min(2, "Reason is required."),
});

const formSchema = z.object({
  stockInItems: z.array(stockInItemSchema).nonempty("Please add at least one item to stock in."),
});

export function StockInForm() {
  const { language } = useLanguage();
  const t = translations[language];
  const { items, updateStock } = useInventory();
  const { toast } = useToast();
  const router = useRouter();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      stockInItems: [{ itemId: '', quantity: 1, reason: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "stockInItems"
  });

  const allItemsAndVariants = items.flatMap(item => {
    if (item.variants && item.variants.length > 0) {
        return item.variants.map(variant => ({
            id: variant.id,
            name: `${item.name} - ${variant.name}`,
        }));
    }
    return {
        id: item.id,
        name: item.name
    }
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    values.stockInItems.forEach(item => {
        updateStock(item.itemId, item.quantity, item.reason);
    });

    toast({
        title: "Stock In Successful",
        description: `${values.stockInItems.length} item(s) have been updated.`,
    });
    form.reset();
    router.push('/');
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Create Stock In Record</CardTitle>
            <CardDescription>Add new stock received from suppliers or other sources.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[45%]">Product</TableHead>
                            <TableHead className="w-[15%]">Quantity</TableHead>
                            <TableHead>Reason / Note</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.map((field, index) => (
                            <TableRow key={field.id}>
                                <TableCell>
                                    <FormField
                                        control={form.control}
                                        name={`stockInItems.${index}.itemId`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select an item" />
                                                    </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {allItemsAndVariants.map(item => (
                                                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </TableCell>
                                <TableCell>
                                    <FormField
                                        control={form.control}
                                        name={`stockInItems.${index}.quantity`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl><Input type="number" placeholder="10" {...field} /></FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />
                                </TableCell>
                                <TableCell>
                                    <FormField
                                        control={form.control}
                                        name={`stockInItems.${index}.reason`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl><Input placeholder="e.g., From Supplier A" {...field} /></FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <Button type="button" size="sm" variant="outline" className="mt-4" onClick={() => append({ itemId: '', quantity: 1, reason: '' })}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Another Item
                </Button>
                <FormMessage>{form.formState.errors.stockInItems?.message}</FormMessage>

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="ghost" onClick={() => router.push('/')}>{t.common.cancel}</Button>
                    <Button type="submit">Submit Stock In</Button>
                </div>
            </form>
            </Form>
        </CardContent>
    </Card>
  );
}
