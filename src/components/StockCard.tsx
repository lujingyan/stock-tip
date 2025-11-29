'use client';

import { useState } from 'react';
import { Trash2, TrendingUp, TrendingDown, PlusCircle, History, X } from 'lucide-react';
import { Modal } from './ui/Modal';
import { AddTransactionForm } from './AddTransactionForm';
import { deleteStock, deleteTransaction } from '@/lib/actions';
import { format } from 'date-fns';
import { StockSettingsDialog } from './StockSettingsDialog';

import { DashboardStock } from '@/types';

export function StockCard({ stock }: { stock: DashboardStock }) {
    const [isAddTxOpen, setIsAddTxOpen] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const handleDelete = async () => {
        if (confirm('确定要删除这个股票吗？')) {
            await deleteStock(stock.id);
        }
    };

    const priceColor = stock.livePrice > (stock.latestBuy?.price || 0)
        ? 'text-red-500' // In China, Red is Up
        : 'text-green-500'; // Green is Down

    const openBuys = stock.transactions.filter(t => t.type === 'BUY' && t.status === 'OPEN');
    const isLastHolding = openBuys.length === 1;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all hover:shadow-md relative overflow-hidden">
            {isLastHolding && stock.latestBuy && (
                <div className="absolute top-0 right-0 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs px-2 py-1 rounded-bl-lg font-medium">
                    最后一笔持仓
                </div>
            )}

            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{stock.liveName}</h3>
                    <span className="text-sm text-gray-500 font-mono">{stock.symbol}</span>
                </div>
                <div className="text-right">
                    <div className={`text-2xl font-bold ${stock.latestBuy ? priceColor : 'text-gray-900 dark:text-white'}`}>
                        ¥{stock.livePrice.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400">当前价格</div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-sm text-gray-500 mb-1">目标卖出</div>
                            <div className="text-xl font-bold text-red-600 dark:text-red-400">
                                {stock.targetSellPrice ? `¥${stock.targetSellPrice.toFixed(2)}` : '-'}
                            </div>
                        </div>
                        {stock.latestBuy && (
                            <div className="text-right">
                                <div className="text-sm text-gray-500 mb-1">卖出量</div>
                                <div className="text-xl font-bold text-gray-900 dark:text-white">
                                    {stock.latestBuy.quantity}
                                </div>
                            </div>
                        )}
                    </div>
                    {stock.latestBuy && (
                        <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                            持有 {Math.max(0, Math.floor((new Date().getTime() - new Date(stock.latestBuy.date).getTime()) / (1000 * 60 * 60 * 24)))} 天
                        </div>
                    )}
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="text-sm text-gray-500 mb-1">下次买入</div>
                    <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {stock.nextBuyPrice ? `¥${stock.nextBuyPrice.toFixed(2)}` : '-'}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                        目标跌幅
                    </div>
                </div>
            </div>

            {isLastHolding && stock.latestBuy && (
                <div className="mb-4 p-3 border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200 flex items-center gap-1">
                        <span className="font-bold">提示：</span>
                        这是最后一笔持仓，建议使用“虚拟买卖”功能来做T，以优化最终卖出价格。
                    </p>
                </div>
            )}

            {stock.latestBuy && (
                <div className="mb-4 p-3 border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex justify-between items-center">
                    <div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">最近买入</div>
                        <div className="font-semibold">¥{stock.latestBuy.price.toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-gray-500">{format(new Date(stock.latestBuy.date), 'yyyy-MM-dd')}</div>
                        <div className="text-xs text-gray-500">{stock.latestBuy.quantity} 股</div>
                    </div>
                </div>
            )}

            <div className="flex gap-2 mt-auto">
                <button
                    onClick={() => setIsAddTxOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                    <PlusCircle className="w-4 h-4" />
                    记录交易
                </button>
                <StockSettingsDialog stock={stock} />
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    title="历史记录"
                >
                    <History className="w-5 h-5" />
                </button>
                <button
                    onClick={handleDelete}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    title="删除股票"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>

            {showHistory && (
                <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-medium mb-2">交易历史</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {stock.transactions.map((tx) => (
                            <div key={tx.id} className="flex justify-between items-center text-sm group">
                                <div className="flex gap-2">
                                    <span className={tx.type === 'BUY' ? 'text-red-500' : 'text-green-500'}>{tx.type === 'BUY' ? '买入' : '卖出'}</span>
                                    <span>¥{tx.price.toFixed(2)}</span>
                                    <span className="text-gray-500">{tx.quantity}</span>
                                    {tx.isVirtual && <span className="text-xs bg-purple-100 text-purple-600 px-1 rounded">虚拟</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-400 text-xs">{format(new Date(tx.date), 'MM-dd')}</span>
                                    <button
                                        onClick={async () => {
                                            if (confirm('确定要删除这条交易记录吗？')) {
                                                await deleteTransaction(tx.id);
                                            }
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                                        title="删除交易"
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
                title={`记录交易 - ${stock.liveName}`}
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
