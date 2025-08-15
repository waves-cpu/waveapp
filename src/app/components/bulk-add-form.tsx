'use client';

import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
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
import { PlusCircle, Trash2, GitBranchPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { addBulkProducts } from '@/lib/inventory-service';
import { cn } from '@/lib/utils';

const variantSchema = z.object({
    name: z.string().min(1, "Variant name is required."),
    sku: z.string().optional(),
    price: z.coerce.number().min(0, "Price must be non-negative."),
    stock: z.coerce.number().int().min(0, "Stock must be a non-negative integer."),
});

const productSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  category: z.string().min(1, 'Category is required.'),
  sku: z.string().optional(),
  variants: z.array(variantSchema).nonempty("Product must have at least one variant."),
});

const formSchema = z.object({
  products: z.array(productSchema).nonempty("Please add at least one product."),
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

export function BulkAddForm() {
  const { language } = useLanguage();
  const t = translations[language];
  const { toast } = useToast();
  const router = useRouter();
  const { fetchItems } = useInventory();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      products: [
        { name: '', category: '', sku: '', variants: [{ name: '', sku: '', price: 0, stock: 0 }] },
      ],
    },
  });

  const { fields: productFields, append: appendProduct, remove: removeProduct } = useFieldArray({
    control: form.control,
    name: "products"
  });

  const { getValues, control } = form;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
        await addBulkProducts(values.products);
        toast({
            title: "Success",
            description: `${values.products.length} product(s) have been added.`,
        });
        await fetchItems();
        router.push('/');
    } catch(error) {
        console.error(error);
        toast({
            title: "Error",
            description: "Failed to add products.",
            variant: "destructive",
        })
    }
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Bulk Add Products</CardTitle>
            <CardDescription>
                Add multiple products and their variants at once. Use the buttons to add new products or variants.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                     <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[25%]">Product / Variant Name</TableHead>
                                    <TableHead className="w-[18%]">Category</TableHead>
                                    <TableHead className="w-[18%]">SKU</TableHead>
                                    <TableHead className="w-[12%]">Price</TableHead>
                                    <TableHead className="w-[12%]">Stock</TableHead>
                                    <TableHead className="w-[15%] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {productFields.map((product, pIndex) => (
                                    <ProductRow 
                                        key={product.id} 
                                        pIndex={pIndex} 
                                        removeProduct={removeProduct}
                                        control={control}
                                        getValues={getValues}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                     </div>

                    <Button type="button" size="sm" variant="outline" onClick={() => appendProduct({ name: '', category: '', sku: '', variants: [{ name: '', sku: '', price: 0, stock: 0 }] })}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Another Product
                    </Button>
                     <FormMessage>{form.formState.errors.products?.message || (form.formState.errors.products as any)?.root?.message}</FormMessage>


                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => router.push('/')}>{t.common.cancel}</Button>
                        <Button type="submit">Add All Products</Button>
                    </div>
                </form>
            </Form>
        </CardContent>
    </Card>
  );
}

function ProductRow({ pIndex, removeProduct, control, getValues }: any) {
    const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
        control,
        name: `products.${pIndex}.variants`,
    });

    return (
        <>
            <TableRow className="bg-muted/30">
                <TableCell>
                    <FormField
                        control={control}
                        name={`products.${pIndex}.name`}
                        render={({ field }) => (
                            <FormItem>
                                <FormControl><Input placeholder="Product Name" {...field} className="font-semibold" /></FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                </TableCell>
                <TableCell>
                    <Controller
                        control={control}
                        name={`products.${pIndex}.category`}
                        render={({ field }) => (
                             <FormItem>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Category" />
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
                </TableCell>
                <TableCell>
                    <FormField
                        control={control}
                        name={`products.${pIndex}.sku`}
                        render={({ field }) => (
                            <FormItem>
                                <FormControl><Input placeholder="Parent SKU" {...field} /></FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                </TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right">
                     <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => removeProduct(pIndex)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </TableCell>
            </TableRow>
            {variantFields.map((variant, vIndex) => (
                <TableRow key={variant.id} noBorder={vIndex !== variantFields.length - 1}>
                    <TableCell>
                        <div className="flex items-center gap-2">
                             <span className="text-muted-foreground pl-4">└</span>
                            <FormField
                                control={control}
                                name={`products.${pIndex}.variants.${vIndex}.name`}
                                render={({ field }) => (
                                    <FormItem className="flex-grow">
                                        <FormControl><Input placeholder="Variant Name (e.g., L, Red)" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell>
                        <FormField
                            control={control}
                            name={`products.${pIndex}.variants.${vIndex}.sku`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl><Input placeholder="Variant SKU" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </TableCell>
                    <TableCell>
                        <FormField
                            control={control}
                            name={`products.${pIndex}.variants.${vIndex}.price`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl><Input type="number" placeholder="Price" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </TableCell>
                    <TableCell>
                        <FormField
                            control={control}
                            name={`products.${pIndex}.variants.${vIndex}.stock`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl><Input type="number" placeholder="Stock" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </TableCell>
                    <TableCell className="text-right">
                         <Button type="button" variant="ghost" size="icon" onClick={() => removeVariant(vIndex)} disabled={variantFields.length <= 1}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </TableCell>
                </TableRow>
            ))}
             <TableRow>
                 <TableCell colSpan={6} className="py-2 pl-8">
                     <Button type="button" size="sm" variant="ghost" onClick={() => appendVariant({ name: '', sku: '', price: 0, stock: 0 })}>
                        <GitBranchPlus className="mr-2 h-4 w-4" />
                        Add Variant
                    </Button>
                 </TableCell>
             </TableRow>
        </>
    );
}

