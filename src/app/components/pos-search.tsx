
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ScanLine, X } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { translations } from '@/types/language';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import type { InventoryItem } from '@/types';

interface PosSearchProps {
  onProductSelect: (item: InventoryItem) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  suggestions: InventoryItem[];
}

export function PosSearch({ onProductSelect, searchTerm, setSearchTerm, suggestions }: PosSearchProps) {
    const { language } = useLanguage();
    const t = translations[language];
    const inputRef = useRef<HTMLInputElement>(null);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // If there's only one suggestion, select it. Otherwise, let user choose.
        if (suggestions.length === 1) {
            onProductSelect(suggestions[0]);
            setSearchTerm('');
            setIsPopoverOpen(false);
        }
    };
    
    useEffect(() => {
        setIsPopoverOpen(searchTerm.length > 2 && suggestions.length > 0);
    }, [searchTerm, suggestions]);

    const handleSelectSuggestion = (item: InventoryItem) => {
        onProductSelect(item);
        setSearchTerm('');
        setIsPopoverOpen(false);
        inputRef.current?.focus();
    }

    return (
        <form onSubmit={handleSubmit}>
           <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
                <div className="relative flex-grow">
                    <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t.pos.searchPlaceholder}
                        className="pl-10 h-10 text-sm"
                        autoComplete='off'
                    />
                    {searchTerm && (
                         <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                            onClick={() => setSearchTerm('')}
                         >
                            <X className="h-4 w-4" />
                         </Button>
                    )}
                </div>
            </PopoverTrigger>
             <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
                <ScrollArea className="max-h-72">
                    <div className="flex flex-col gap-1 p-2">
                    {suggestions.map(item => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectSuggestion(item)}
                            className="flex items-center gap-3 p-2 rounded-md hover:bg-accent text-left w-full"
                        >
                             <Image 
                                src={item.imageUrl || 'https://placehold.co/40x40.png'} 
                                alt={item.name} 
                                width={32} 
                                height={32} 
                                className="rounded-md"
                                data-ai-hint="product image"
                            />
                            <div>
                                <p className="font-medium text-sm">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.sku}</p>
                            </div>
                        </button>
                    ))}
                    </div>
                </ScrollArea>
            </PopoverContent>
           </Popover>
        </form>
    );
}
