'use client';

import { useState } from 'react';
import { addTransaction } from '@/lib/actions';

interface AddTransactionFormProps {
    stockId: number;
    initialPrice?: number;
    onSuccess: () => void;
}

export function AddTransactionForm({ stockId, initialPrice, onSuccess }: AddTransactionFormProps) {
    const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
    const [price, setPrice] = useState(initialPrice?.toString() || '');
    const [quantity, setQuantity] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isVirtual, setIsVirtual] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        await addTransaction({
            stockId,
            type,
            price: parseFloat(price),
            quantity: parseInt(quantity),
            date: new Date(date),
            isVirtual,
        });

        setLoading(false);
        onSuccess();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4">
                <button
                    type="button"
                    onClick={() => setType('BUY')}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${type === 'BUY'
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                >
                    Buy (买入)
                </button>
                <button
                    type="button"
                    onClick={() => setType('SELL')}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${type === 'SELL'
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                >
                    Sell (卖出)
                </button>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Price (价格)</label>
                <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Quantity (数量)</label>
                <input
                    type="number"
                    step="100"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Date (日期)</label>
                <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
            </div>

            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="isVirtual"
                    checked={isVirtual}
                    onChange={(e) => setIsVirtual(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isVirtual" className="text-sm text-gray-700 dark:text-gray-300">
                    Virtual Trade (虚拟买卖 - Raise Base Price)
                </label>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
                {loading ? 'Saving...' : 'Save Transaction'}
            </button>
        </form>
    );
}
