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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={t.addItemDialog.categoryPlaceholder} />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {categories.map(category => (
                                        <SelectItem key={category} value={category}>{category}</SelectItem>
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
                            <CardTitle>Variants</CardTitle>
                            <CardDescription>
                                Add variants for your product. Each variant can have its own SKU, price, and stock level.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t.inventoryTable.name}</TableHead>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>{t.inventoryTable.price}</TableHead>
                                        <TableHead>{t.inventoryTable.currentStock}</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fields.map((field, index) => (
                                        <TableRow key={field.id}>
                                            <TableCell>
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
                                            <TableCell>
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
                                            <TableCell>
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
                                            <TableCell>
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
                                            <TableCell>
                                                <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={() => remove(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                             </Table>
                             <Button type="button" size="sm" variant="outline" className="mt-4" onClick={() => append({ name: '', sku: '', price: 0, stock: 0 })}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Variant
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
