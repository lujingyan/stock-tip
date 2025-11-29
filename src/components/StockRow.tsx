'use client';

import { useState } from 'react';
import { DashboardStock } from '@/types';
import { MoreHorizontal, PlusCircle, Eye, Edit, Trash2 } from 'lucide-react';
import { AddTransactionForm } from './AddTransactionForm';
import { TransactionHistoryModal } from './TransactionHistoryModal';
import { Modal } from './ui/Modal';
import { deleteStock } from '@/lib/actions';
import { calculateSellPrice } from '@/lib/calculations';

export function StockRow({ stock, defaultAnnualRate, defaultBuyStep }: { stock: DashboardStock, defaultAnnualRate: number, defaultBuyStep: number }) {
    const [isAddTxOpen, setIsAddTxOpen] = useState(false);
    const [historyMode, setHistoryMode] = useState<'VIEW' | 'EDIT' | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const effectiveAnnualRate = stock.annualRate ?? defaultAnnualRate;
    const effectiveBuyStep = stock.buyStep ?? defaultBuyStep;

    const priceColor = stock.livePrice > (stock.latestBuy?.price || 0)
        ? 'text-red-500'
        : 'text-green-500';

    const openBuys = stock.transactions.filter(t => t.type === 'BUY' && t.status === 'OPEN');

    // Calculate targets first to sort by Target Sell Price
    const buysWithTargets = openBuys.map(tx => ({
        ...tx,
        targetPrice: calculateSellPrice(tx.price, new Date(tx.date), effectiveAnnualRate)
    }));

    // Sort by Target Price Ascending (Adjacent Sell Prices)
    const sortedByTarget = [...buysWithTargets].sort((a, b) => a.targetPrice - b.targetPrice);

    // Check for gaps - ONLY for the first pair (Next Sell vs Following Sell)
    // The user only cares about the immediate next operation on the Dashboard.
    let gapSuggestionPrice: number | null = null;
    if (sortedByTarget.length >= 2) {
        const currentTx = sortedByTarget[0];
        const nextTx = sortedByTarget[1];

        // User logic: Difference in "Distance to Harvest"
        // (Target2 - P)/P - (Target1 - P)/P = (Target2 - Target1) / P
        const gap = stock.livePrice > 0 ? (nextTx.targetPrice - currentTx.targetPrice) / stock.livePrice : 0;

        if (gap > 0.02) {
            // Calculate new target if virtual trade is done AT THE CURRENT TARGET PRICE
            gapSuggestionPrice = calculateSellPrice(currentTx.targetPrice, new Date(), effectiveAnnualRate);
        }
    }

    const isLastHolding = openBuys.length === 1;

    // Close dropdown when clicking outside (simple implementation)
    // In a real app, use a click-outside hook or a UI library's dropdown
    const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

    const handleDeleteStock = async () => {
        if (confirm(`确定要删除股票 ${stock.liveName} 吗？这将删除所有相关交易记录。`)) {
            await deleteStock(stock.id);
        }
    };

    return (
        <>
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0">
                {/* Stock Name & Code */}
                <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-900 dark:text-white">{stock.liveName}</span>
                        <span className="text-xs text-gray-500 font-mono">{stock.symbol}</span>
                    </div>
                </td>

                {/* Target Buy Price (Next Buy) */}
                <td className="px-4 py-4 whitespace-nowrap">
                    {stock.maxInvestment && (stock.transactions.filter(t => t.type === 'BUY' && t.status === 'OPEN').reduce((sum, t) => sum + (t.price * t.quantity), 0) >= stock.maxInvestment) ? (
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-orange-600 dark:text-orange-400">已达上限</span>
                            <span className="text-[10px] text-gray-400">停止买入</span>
                        </div>
                    ) : stock.nextBuyPrice ? (
                        <div className="font-semibold text-green-600 dark:text-green-400">
                            ¥{stock.nextBuyPrice.toFixed(2)}
                        </div>
                    ) : (
                        <span className="text-gray-400">-</span>
                    )}
                </td>

                {/* Current Price */}
                <td className="px-4 py-4 whitespace-nowrap">
                    <div className={`font-bold ${stock.latestBuy ? priceColor : 'text-gray-900 dark:text-white'}`}>
                        ¥{stock.livePrice.toFixed(2)}
                    </div>
                </td>

                {/* Target Sell Price */}
                <td className="px-4 py-4 whitespace-nowrap">
                    {stock.targetSellPrice ? (
                        <div className="font-bold text-red-600 dark:text-red-400">
                            ¥{stock.targetSellPrice.toFixed(2)}
                        </div>
                    ) : (
                        <span className="text-gray-400">-</span>
                    )}
                </td>

                {/* Quantity */}
                <td className="px-4 py-4 whitespace-nowrap">
                    {stock.latestBuy ? (
                        <div className="text-gray-900 dark:text-gray-200">
                            {stock.latestBuy.quantity}
                        </div>
                    ) : (
                        <span className="text-gray-400">-</span>
                    )}
                </td>

                {/* Suggestion */}
                <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                        {isLastHolding && stock.latestBuy && (
                            <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                                建议虚拟做T
                            </div>
                        )}
                        {gapSuggestionPrice !== null && (
                            <div className="flex flex-col items-start">
                                <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200">
                                    建议虚拟买卖
                                </div>
                                <span className="text-xs text-gray-500 mt-0.5">
                                    真实卖价: <span className="font-medium text-gray-900 dark:text-gray-300">¥{gapSuggestionPrice.toFixed(2)}</span>
                                </span>
                            </div>
                        )}
                    </div>
                </td>

                {/* Trade Signal */}
                <td className="px-4 py-4 whitespace-nowrap">
                    {stock.maxInvestment && (stock.transactions.filter(t => t.type === 'BUY' && t.status === 'OPEN').reduce((sum, t) => sum + (t.price * t.quantity), 0) >= stock.maxInvestment) ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">
                            停止买入
                        </span>
                    ) : (
                        <>
                            {stock.livePrice > 0 && stock.nextBuyPrice && stock.livePrice <= stock.nextBuyPrice && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                                    建议播种
                                </span>
                            )}
                            {stock.livePrice > 0 && stock.targetSellPrice && stock.livePrice >= stock.targetSellPrice && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200">
                                    建议卖出
                                </span>
                            )}
                        </>
                    )}
                </td>

                {/* Operations */}
                <td className="px-4 py-4 whitespace-nowrap text-right">
                    <div className="relative inline-block text-left">
                        <button
                            onClick={toggleDropdown}
                            onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)} // Delay to allow click
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500"
                        >
                            <MoreHorizontal className="w-5 h-5" />
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 z-10 py-1">
                                <button
                                    onClick={() => {
                                        setHistoryMode('VIEW');
                                        setIsDropdownOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                    <Eye className="w-4 h-4" /> 查看
                                </button>
                                <button
                                    onClick={() => {
                                        setHistoryMode('EDIT');
                                        setIsDropdownOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                    <Edit className="w-4 h-4" /> 修改
                                </button>
                                <button
                                    onClick={() => {
                                        setIsAddTxOpen(true);
                                        setIsDropdownOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                    <PlusCircle className="w-4 h-4" /> 录入
                                </button>
                                <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                                <button
                                    onClick={() => {
                                        handleDeleteStock();
                                        setIsDropdownOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" /> 删除股票
                                </button>
                            </div>
                        )}
                    </div>
                </td>
            </tr>

            {/* Modals */}
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

            {historyMode && (
                <TransactionHistoryModal
                    isOpen={true}
                    onClose={() => setHistoryMode(null)}
                    stock={stock}
                    mode={historyMode}
                    effectiveAnnualRate={effectiveAnnualRate}
                    effectiveBuyStep={effectiveBuyStep}
                    maxInvestment={stock.maxInvestment || null}
                />
            )}
        </>
    );
}
