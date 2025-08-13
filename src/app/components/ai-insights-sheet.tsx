'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { generateStockInsights } from '@/ai/flows/generate-stock-insights';
import { useInventory } from '@/hooks/use-inventory';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const formSchema = z.object({
  salesData: z.string().optional(),
  inventoryTurnoverRates: z.string().optional(),
  additionalContext: z.string().optional(),
});

interface AIInsightsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIInsightsSheet({ open, onOpenChange }: AIInsightsSheetProps) {
  const { items } = useInventory();
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      salesData: '',
      inventoryTurnoverRates: '',
      additionalContext: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setInsights(null);

    const currentStockLevels = items.map(item => `${item.name}: ${item.stock}`).join('\n');
    
    try {
      const result = await generateStockInsights({
        currentStockLevels,
        salesData: values.salesData || 'Not provided.',
        inventoryTurnoverRates: values.inventoryTurnoverRates || 'Not provided.',
        additionalContext: values.additionalContext || 'Not provided.',
      });
      setInsights(result.insights);
    } catch (error) {
      console.error('Error generating insights:', error);
      setInsights('Sorry, I was unable to generate insights at this time. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full">
        <SheetHeader>
          <SheetTitle>AI Stock Level Insights</SheetTitle>
          <SheetDescription>
            Provide data to get smart suggestions for stock level adjustments. Current stock levels are included automatically.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 h-full flex flex-col">
            <div className="flex-grow space-y-4 overflow-y-auto pr-4">
                <FormField
                control={form.control}
                name="salesData"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Sales Data (CSV format recommended)</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Paste sales data here..." {...field} rows={5}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="inventoryTurnoverRates"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Inventory Turnover Rates (CSV)</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Paste turnover rates here..." {...field} rows={5}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="additionalContext"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Additional Context</FormLabel>
                    <FormControl>
                        <Textarea placeholder="e.g., Upcoming promotions, seasonal demand changes..." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <SheetFooter>
                <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                    'Generating...'
                ) : (
                    <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Insights
                    </>
                )}
                </Button>
            </SheetFooter>
          </form>
        </Form>
        
        {(isLoading || insights) && (
             <div className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Sparkles className="mr-2 h-5 w-5 text-accent" />
                            AI-Generated Insights
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                             <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-4/5" />
                             </div>
                        ) : (
                            <p className="text-sm text-foreground whitespace-pre-wrap">{insights}</p>
                        )}
                    </CardContent>
                </Card>
             </div>
        )}

      </SheetContent>
    </Sheet>
  );
}
