'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  change: z.coerce.number().int().refine(val => val !== 0, {message: 'Change cannot be zero.'}),
  reason: z.string().min(2, { message: 'Reason must be at least 2 characters.' }),
});

interface UpdateStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
}

export function UpdateStockDialog({ open, onOpenChange, itemId }: UpdateStockDialogProps) {
  const { updateStock, getItem } = useInventory();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      change: 0,
      reason: '',
    },
  });

  const item = itemId ? getItem(itemId) : null;

  useEffect(() => {
    if (!open) {
      form.reset({ change: 0, reason: '' });
    }
  }, [open, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!itemId) return;
    updateStock(itemId, values.change, values.reason);
    toast({
      title: 'Stock Updated',
      description: `Stock for ${item?.name} has been adjusted.`,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Stock for {item?.name}</DialogTitle>
          <DialogDescription>
            Enter a positive value to add stock or a negative value to remove it. Current stock: {item?.stock}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="change"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock Adjustment</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., -10 or 50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Adjustment</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Sale, New Shipment" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit">Update Stock</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
