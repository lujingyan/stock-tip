'use client';

import { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { searchStocksAction, addStock } from '@/lib/actions';
import { StockSuggestion } from '@/lib/stock-api';

export function StockSearch() {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                setLoading(true);
                const results = await searchStocksAction(query);
                setSuggestions(results);
                setLoading(false);
            } else {
                setSuggestions([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const handleAdd = async (stock: StockSuggestion) => {
        await addStock(stock.symbol, stock.name);
        setQuery('');
        setSuggestions([]);
    };

    return (
        <div className="relative w-full max-w-md">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search stock (e.g., 600000 or fzcm)"
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>

            {suggestions.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-auto">
                    {suggestions.map((stock, index) => (
                        <li key={`${stock.symbol}-${index}`} className="border-b last:border-0 border-gray-100 dark:border-gray-700">
                            <button
                                onClick={() => handleAdd(stock)}
                                className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between group"
                            >
                                <div>
                                    <div className="font-medium">{stock.name}</div>
                                    <div className="text-xs text-gray-500">{stock.symbol}</div>
                                </div>
                                <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 text-blue-500" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
