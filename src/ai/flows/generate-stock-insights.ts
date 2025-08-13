'use server';

/**
 * @fileOverview Generates AI-driven insights about optimal stock levels.
 *
 * - generateStockInsights - A function that generates stock level insights.
 * - GenerateStockInsightsInput - The input type for the generateStockInsights function.
 * - GenerateStockInsightsOutput - The return type for the generateStockInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateStockInsightsInputSchema = z.object({
  salesData: z.string().describe('Sales data, preferably in CSV format.'),
  inventoryTurnoverRates: z
    .string()
    .describe('Inventory turnover rates data, preferably in CSV format.'),
  currentStockLevels: z
    .string()
    .describe('Current stock levels data, preferably in CSV format.'),
  additionalContext: z
    .string()
    .optional()
    .describe('Any additional context or notes relevant to stock levels.'),
});
export type GenerateStockInsightsInput = z.infer<
  typeof GenerateStockInsightsInputSchema
>;

const GenerateStockInsightsOutputSchema = z.object({
  insights: z.string().describe('AI-driven insights about optimal stock levels.'),
});
export type GenerateStockInsightsOutput = z.infer<
  typeof GenerateStockInsightsOutputSchema
>;

export async function generateStockInsights(
  input: GenerateStockInsightsInput
): Promise<GenerateStockInsightsOutput> {
  return generateStockInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStockInsightsPrompt',
  input: {schema: GenerateStockInsightsInputSchema},
  output: {schema: GenerateStockInsightsOutputSchema},
  prompt: `You are an AI assistant that provides insights about optimal stock levels for a business.

You will be provided with sales data, inventory turnover rates, current stock levels, and any additional context.

Based on this information, provide actionable insights to help the manager make informed decisions about ordering and prevent stockouts or overstocking.

Sales Data: {{{salesData}}}

Inventory Turnover Rates: {{{inventoryTurnoverRates}}}

Current Stock Levels: {{{currentStockLevels}}}

Additional Context: {{{additionalContext}}}

Insights:`,
});

const generateStockInsightsFlow = ai.defineFlow(
  {
    name: 'generateStockInsightsFlow',
    inputSchema: GenerateStockInsightsInputSchema,
    outputSchema: GenerateStockInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
