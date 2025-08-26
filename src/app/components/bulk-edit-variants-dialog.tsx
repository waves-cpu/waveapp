
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
import { useEffect, useRef } from 'react';

const variantSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Variant name is required."),
  sku: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be non-negative."),
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
    if (item) {
        form.reset({
            variants: item.variants || []
        });
    }
  }, [item, form]);


  const { fields } = useFieldArray({
    control: form.control,
    name: "variants"
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    bulkUpdateVariants(item.id, values.variants);
    toast({
      title: "Variants Updated",
      description: `Variants for ${item.name} have been updated.`,
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t.bulkEditDialog.title}</DialogTitle>
           <div className="-mt-2">
              <h4 className="font-medium text-lg leading-tight">{item.name}</h4>
              {item.sku && <p className="text-sm text-muted-foreground">SKU Induk: {item.sku}</p>}
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ScrollArea className="h-96 border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t.inventoryTable.name}</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>{t.inventoryTable.price}</TableHead>
                            <TableHead>{t.inventoryTable.currentStock}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.map((field, index) => (
                            <TableRow key={field.id}>
                                <TableCell onClick={handleCellClick}>
                                        <FormField
                                        control={form.control}
                                        name={`variants.${index}.name`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl><Input placeholder="e.g., Large" {...field} /></FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />
                                </TableCell>
                                <TableCell onClick={handleCellClick}>
                                    <FormField
                                        control={form.control}
                                        name={`variants.${index}.sku`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl><Input placeholder="e.g., VAR-LG" {...field} /></FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />
                                </TableCell>
                                <TableCell onClick={handleCellClick}>
                                    <FormField
                                        control={form.control}
                                        name={`variants.${index}.price`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl><Input type="number" placeholder="50000" {...field} /></FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />
                                </TableCell>
                                <TableCell onClick={handleCellClick}>
                                    <FormField
                                        control={form.control}
                                        name={`variants.${index}.stock`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl><Input type="number" placeholder="50" {...field} /></FormControl>
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
