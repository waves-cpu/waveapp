
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
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import type { InventoryItem } from '@/types';

const variantSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Variant name is required."),
    sku: z.string().optional(),
    price: z.coerce.number().min(0, "Price must be non-negative."),
    stock: z.coerce.number().int().min(0, "Stock must be a non-negative integer."),
});

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  category: z.string().min(2, { message: 'Category must be at least 2 characters.' }),
  sku: z.string().optional(),
  imageUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
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

const categories = [
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
    "Accecoris",
    "Sandals",
    "Bag"
];

interface AddProductFormProps {
    existingItem?: InventoryItem;
}

export function AddProductForm({ existingItem }: AddProductFormProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const { addItem, updateItem } = useInventory();
  const { toast } = useToast();
  const router = useRouter();

  const isEditMode = !!existingItem;

  const defaultValues = useMemo(() => {
    if (!existingItem) {
        return {
            name: '',
            category: '',
            sku: '',
            imageUrl: '',
            hasVariants: false,
            variants: [],
            price: undefined,
            stock: undefined,
            size: '',
        };
    }
    const hasVariants = !!existingItem.variants && existingItem.variants.length > 0;
    return {
        id: existingItem.id,
        name: existingItem.name,
        category: existingItem.category,
        sku: existingItem.sku || '',
        imageUrl: existingItem.imageUrl || '',
        hasVariants: hasVariants,
        price: hasVariants ? undefined : (existingItem.price ?? ''),
        stock: hasVariants ? undefined : (existingItem.stock ?? ''),
        size: hasVariants ? undefined : (existingItem.size || ''),
        variants: hasVariants ? existingItem.variants.map(v => ({ ...v, id: v.id.toString() })) : [],
    };
  }, [existingItem]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);


  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants"
  });

  const hasVariants = form.watch('hasVariants');
  
  function onSubmit(values: z.infer<typeof formSchema>) {
    if (isEditMode) {
        updateItem(values.id!, values);
        toast({
            title: "Product Updated",
            description: `${values.name} has been updated.`,
        });
    } else {
        addItem(values);
        toast({
        title: t.addItemDialog.itemAdded,
        description: `${values.name} ${t.addItemDialog.hasBeenAdded}`,
        });
    }
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
                          <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t.addItemDialog.categoryPlaceholder} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/image.png" {...field} />
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
                                <FormLabel>{t.bulkStockInDialog.hasVariants}</FormLabel>
                            </div>
                        </FormItem>
                    )}
                />

                {hasVariants ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t.bulkStockInDialog.variants}</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Table className="table-fixed border">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-1/3 border-r">{t.inventoryTable.name}</TableHead>
                                        <TableHead className="w-1/4 border-r">SKU</TableHead>
                                        <TableHead className="w-1/4 border-r">{t.inventoryTable.price}</TableHead>
                                        <TableHead className="w-1/4 border-r">{t.inventoryTable.currentStock}</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fields.map((field, index) => (
                                        <TableRow key={field.id} className="align-top">
                                            <TableCell className="p-1 border-r">
                                                 <FormField
                                                    control={form.control}
                                                    name={`variants.${index}.name`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl><Input placeholder={t.bulkStockInDialog.variantName} {...field} className="border-none focus-visible:ring-1" /></FormControl>
                                                            <FormMessage className="px-2 py-1"/>
                                                        </FormItem>
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell className="p-1 border-r">
                                                <FormField
                                                    control={form.control}
                                                    name={`variants.${index}.sku`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl><Input placeholder="e.g., VAR-LG" {...field} className="border-none focus-visible:ring-1" /></FormControl>
                                                            <FormMessage className="px-2 py-1"/>
                                                        </FormItem>
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell className="p-1 border-r">
                                                <FormField
                                                    control={form.control}
                                                    name={`variants.${index}.price`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl><Input type="number" placeholder="50000" {...field} className="border-none focus-visible:ring-1" /></FormControl>
                                                            <FormMessage className="px-2 py-1"/>
                                                        </FormItem>
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell className="p-1 border-r">
                                                <FormField
                                                    control={form.control}
                                                    name={`variants.${index}.stock`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl><Input type="number" placeholder="50" {...field} className="border-none focus-visible:ring-1" /></FormControl>
                                                            <FormMessage className="px-2 py-1"/>
                                                        </FormItem>
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive mt-1" onClick={() => remove(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                             </Table>
                             <Button type="button" size="sm" variant="outline" className="mt-4" onClick={() => append({ name: '', sku: '', price: 0, stock: 0 })}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                {t.bulkStockInDialog.addVariant}
                            </Button>
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
                            <FormLabel>{t.inventoryTable.size}</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., 250g, 1L" {...field} value={field.value ?? ''}/>
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
                                <Input type="number" placeholder={t.addItemDialog.pricePlaceholder} {...field} value={field.value ?? ''} />
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
                                <Input type="number" placeholder={t.addItemDialog.initialStockPlaceholder} {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                )}
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => router.push('/')}>{t.common.cancel}</Button>
                    <Button type="submit">{isEditMode ? t.inventoryTable.editProduct : t.addItemDialog.addItem}</Button>
                </div>
            </form>
            </Form>
        </CardContent>
    </Card>
  );
}

    