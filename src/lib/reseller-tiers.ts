
export interface ResellerTier {
    name: string;
    discountPercentage: number;
    cashbackLimit: number;
    minTransactions: number;
    nextTier?: string;
    nextTierMin: number;
}

const TIERS: Omit<ResellerTier, 'nextTier' | 'nextTierMin'>[] = [
    { name: 'Bronze', discountPercentage: 0, cashbackLimit: 0, minTransactions: 0 },
    { name: 'Silver', discountPercentage: 2, cashbackLimit: 0, minTransactions: 20000000 },
    { name: 'Gold', discountPercentage: 4, cashbackLimit: 0, minTransactions: 50000000 },
    { name: 'Platinum', discountPercentage: 6, cashbackLimit: 500000, minTransactions: 100000000 },
    { name: 'Diamond', discountPercentage: 8, cashbackLimit: 1000000, minTransactions: 500000000 },
];

export function getResellerTier(totalTransactions: number): ResellerTier {
    let currentTierIndex = TIERS.length - 1;

    while (currentTierIndex > 0) {
        if (totalTransactions >= TIERS[currentTierIndex].minTransactions) {
            break;
        }
        currentTierIndex--;
    }

    const currentTier = TIERS[currentTierIndex];
    const nextTier = TIERS[currentTierIndex + 1];

    return {
        ...currentTier,
        nextTier: nextTier?.name,
        nextTierMin: nextTier?.minTransactions || Infinity,
    };
}
