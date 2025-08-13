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
import { useInventory } from '@/hooks/use-inventory';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const variantSchema = z.object({
    name: z.string().min(1, "Variant name is required."),
    sku: z.string().optional(),
    price: z.coerce.number().min(0, "Price must be non-negative."),
    stock: z.coerce.number().int().min(0, "Stock must be a non-negative integer."),
});

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  category: z.string().min(2, { message: 'Category must be at least 2 characters.' }),
  sku: z.string().optional(),
  hasVariants: z.boolean().default(false),
  // Fields for items without variants
  price: z.coerce.number().optional(),
  stock: z.coerce.number().int().optional(),
  size: z.string().optional(),
  variants: z.array(variantSchema).optional(),
}).refine(data => {
    if (!data.hasVariants) {
        return data.price !== undefined && data.price >= 0 && data.stock !== undefined && data.stock >= 0;
    }
    return true;
}, {
    message: "Price and stock are required for items without variants.",
    path: ["price"],
}).refine(data => {
    if (data.hasVariants) {
        return data.variants && data.variants.length > 0;
    }
    return true;
}, {
    message: "At least one variant is required when 'has variants' is checked.",
    path: ["variants"],
});

export function AddProductForm() {
  const { language } = useLanguage();
  const t = translations[language];
  const { addItem } = useInventory();
  const { toast } = useToast();
  const router = useRouter();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      category: '',
      sku: '',
      hasVariants: false,
      variants: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants"
  });

  const hasVariants = form.watch('hasVariants');

  function onSubmit(values: z.infer<typeof formSchema>) {
    addItem(values);
    toast({
      title: t.addItemDialog.itemAdded,
      description: `${values.name} ${t.addItemDialog.hasBeenAdded}`,
    });
    form.reset();
    router.push('/');
  }

  return (
    <Card>
        <CardContent className="pt-6">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t.addItemDialog.itemName}</FormLabel>
                        <FormControl>
                            <Input placeholder={t.addItemDialog.itemNamePlaceholder} {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t.addItemDialog.category}</FormLabel>
                        <FormControl>
                            <Input placeholder={t.addItemDialog.categoryPlaceholder} {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>SKU (Parent)</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., SKU-PARENT" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                    control={form.control}
                    name="hasVariants"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>This product has multiple variants (e.g., sizes, colors)</FormLabel>
                            </div>
                        </FormItem>
                    )}
                />

                {hasVariants ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center text-base">
                                <span>Variants</span>
                                <Button type="button" size="sm" variant="outline" onClick={() => append({ name: '', price: 0, stock: 0 })}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Variant
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start border p-4 rounded-md relative">
                                    <FormField
                                        control={form.control}
                                        name={`variants.${index}.name`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Name</FormLabel>
                                                <FormControl><Input placeholder="e.g., Large" {...field} /></FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`variants.${index}.price`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Price</FormLabel>
                                                <FormControl><Input type="number" placeholder="9.99" {...field} /></FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`variants.${index}.stock`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Stock</FormLabel>
                                                <FormControl><Input type="number" placeholder="50" {...field} /></FormControl>
                                                <FormMessage/>
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                             <FormMessage>{form.formState.errors.variants?.message}</FormMessage>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormField
                        control={form.control}
                        name="size"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Size/Variation</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., 250g, 1L" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>{t.addItemDialog.price}</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder={t.addItemDialog.pricePlaceholder} {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="stock"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>{t.addItemDialog.initialStock}</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder={t.addItemDialog.initialStockPlaceholder} {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                )}
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => router.push('/')}>{t.common.cancel}</Button>
                    <Button type="submit">{t.addItemDialog.addItem}</Button>
                </div>
            </form>
            </Form>
        </CardContent>
    </Card>
  );
}
