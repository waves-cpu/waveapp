
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ScanLine, X } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';

interface PosSearchProps {
  onProductSelect: (sku: string) => void;
}

export function PosSearch({ onProductSelect }: PosSearchProps) {
    const [sku, setSku] = useState('');
    const { language } = useLanguage();
    const t = translations[language];
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (sku.trim()) {
            onProductSelect(sku.trim());
            setSku('');
        }
    };

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    return (
        <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-grow">
                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    ref={inputRef}
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder={t.pos.searchPlaceholder}
                    className="pl-10 h-12 text-base"
                />
                {sku && (
                     <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                        onClick={() => setSku('')}
                     >
                        <X className="h-4 w-4" />
                     </Button>
                )}
            </div>
        </form>
    );
}
