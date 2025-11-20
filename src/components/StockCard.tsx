'use client';

import { useState } from 'react';
import { Trash2, TrendingUp, TrendingDown, PlusCircle, History, X } from 'lucide-react';
import { Modal } from './ui/Modal';
import { AddTransactionForm } from './AddTransactionForm';
import { deleteStock, deleteTransaction } from '@/lib/actions';
import { format } from 'date-fns';
import { StockSettingsDialog } from './StockSettingsDialog';

interface Transaction {
    id: number;
    type: string;
    price: number;
    quantity: number;
    date: Date;
    status: string;
}

interface StockData {
    id: number;
    symbol: string;
    name: string;
    livePrice: number;
    liveName: string;
    latestBuy?: Transaction;
    targetSellPrice?: number | null;
    nextBuyPrice?: number | null;
    transactions: Transaction[];
}

export function StockCard({ stock }: { stock: StockData }) {
    const [isAddTxOpen, setIsAddTxOpen] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this stock?')) {
            await deleteStock(stock.id);
        }
    };

    const priceColor = stock.livePrice > (stock.latestBuy?.price || 0)
        ? 'text-red-500' // In China, Red is Up
        : 'text-green-500'; // Green is Down

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{stock.liveName}</h3>
                    <span className="text-sm text-gray-500 font-mono">{stock.symbol}</span>
                </div>
                <div className="text-right">
                    <div className={`text-2xl font-bold ${stock.latestBuy ? priceColor : 'text-gray-900 dark:text-white'}`}>
                        ¥{stock.livePrice.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400">Current Price</div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="text-sm text-gray-500 mb-1">Target Sell</div>
                    <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                        {stock.targetSellPrice ? `¥${stock.targetSellPrice.toFixed(2)}` : '-'}
                    </div>
                    {stock.latestBuy && (
                        <div className="text-xs text-gray-400 mt-1">
                            Held {Math.max(0, Math.floor((new Date().getTime() - new Date(stock.latestBuy.date).getTime()) / (1000 * 60 * 60 * 24)))} days
                        </div>
                    )}
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="text-sm text-gray-500 mb-1">Next Buy</div>
                    <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {stock.nextBuyPrice ? `¥${stock.nextBuyPrice.toFixed(2)}` : '-'}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                        Target Drop
                    </div>
                </div>
            </div>

            {stock.latestBuy && (
                <div className="mb-4 p-3 border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex justify-between items-center">
                    <div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Latest Buy</div>
                        <div className="font-semibold">¥{stock.latestBuy.price.toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-gray-500">{format(new Date(stock.latestBuy.date), 'yyyy-MM-dd')}</div>
                        <div className="text-xs text-gray-500">{stock.latestBuy.quantity} shares</div>
                    </div>
                </div>
            )}

            <div className="flex gap-2 mt-auto">
                <button
                    onClick={() => setIsAddTxOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                    <PlusCircle className="w-4 h-4" />
                    Record Trade
                </button>
                <StockSettingsDialog stock={stock} />
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    title="History"
                >
                    <History className="w-5 h-5" />
                </button>
                <button
                    onClick={handleDelete}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    title="Delete Stock"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>

            {showHistory && (
                <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-medium mb-2">Transaction History</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {stock.transactions.map((tx) => (
                            <div key={tx.id} className="flex justify-between items-center text-sm group">
                                <div className="flex gap-2">
                                    <span className={tx.type === 'BUY' ? 'text-red-500' : 'text-green-500'}>{tx.type}</span>
                                    <span>¥{tx.price.toFixed(2)}</span>
                                    <span className="text-gray-500">{tx.quantity}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-400 text-xs">{format(new Date(tx.date), 'MM-dd')}</span>
                                    <button
                                        onClick={async () => {
                                            if (confirm('Delete this transaction?')) {
                                                await deleteTransaction(tx.id);
                                            }
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                                        title="Delete Transaction"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Modal
                isOpen={isAddTxOpen}
                onClose={() => setIsAddTxOpen(false)}
                title={`Record Trade for ${stock.liveName}`}
            >
                <AddTransactionForm
                    stockId={stock.id}
                    initialPrice={stock.livePrice}
                    onSuccess={() => setIsAddTxOpen(false)}
                />
            </Modal>
        </div>
    );
}
