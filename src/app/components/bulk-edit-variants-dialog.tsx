
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import type { InventoryItem } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect } from 'react';
import Image from 'next/image';
import { Store } from 'lucide-react';

const variantSchema = z.object({
  id: z.string(),
  name: z.string(), // Keep for display
  sku: z.string().optional(), // Keep for display
  price: z.coerce.number(), // Keep for context if needed, but not editable
  stock: z.coerce.number().int().min(0, "Stock must be a non-negative integer."),
});

const formSchema = z.object({
  variants: z.array(variantSchema),
});


interface BulkEditVariantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem;
}

export function BulkEditVariantsDialog({ open, onOpenChange, item }: BulkEditVariantsDialogProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const { bulkUpdateVariants } = useInventory();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variants: item.variants || [],
    },
  });

  useEffect(() => {
    if (open && item) {
        form.reset({
            variants: item.variants || []
        });
    }
  }, [open, item, form]);


  const { fields } = useFieldArray({
    control: form.control,
    name: "variants"
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // We only send stock updates, but the form holds other data for display
    const stockOnlyUpdates = values.variants.map(v => ({ id: v.id, stock: v.stock, name: v.name, price: v.price, sku: v.sku }));
    bulkUpdateVariants(item.id, stockOnlyUpdates);
    toast({
      title: "Varian Diperbarui",
      description: `Stok untuk varian ${item.name} telah diperbarui.`,
    });
    onOpenChange(false);
  }

  const handleCellClick = (e: React.MouseEvent<HTMLTableCellElement>) => {
    const input = e.currentTarget.querySelector('input');
    if (input) {
      input.focus();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-4">
              <Image 
                  src={item.imageUrl || 'https://placehold.co/60x60.png'}
                  alt={item.name}
                  width={60}
                  height={60}
                  className="rounded-md"
                  data-ai-hint="product image"
              />
              <div>
                 <DialogTitle>{item.name}</DialogTitle>
                 {item.sku && <p className="text-sm text-muted-foreground mt-1">SKU Induk: {item.sku}</p>}
              </div>
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ScrollArea className="h-80 pr-3">
                <Table>
                    <TableBody>
                        {fields.map((field, index) => (
                            <TableRow key={field.id} className="border-b">
                                <TableCell className="w-[60px]">
                                     <div className="flex h-10 w-10 items-center justify-center rounded-sm shrink-0">
                                        <Store className="h-5 w-5 text-gray-400" />
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium text-sm w-full">
                                    {field.name}
                                </TableCell>
                                <TableCell onClick={handleCellClick} className="w-[120px]">
                                    <FormField
                                        control={form.control}
                                        name={`variants.${index}.stock`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl><Input type="number" placeholder="0" {...field} className="h-9 w-24 text-center" /></FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>

            <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
                <Button type="submit">{t.common.saveChanges}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
