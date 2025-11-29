'use client';

import { Modal } from './ui/Modal';
import { DashboardStock } from '@/types';
import { format, differenceInCalendarDays } from 'date-fns';
import { Trash2, X } from 'lucide-react';
import { deleteTransaction, updateStockSettings } from '@/lib/actions';
import { useState } from 'react';
import { calculateSellPrice } from '@/lib/calculations';

interface TransactionHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    stock: DashboardStock;
    mode: 'VIEW' | 'EDIT';
    effectiveAnnualRate: number;
    effectiveBuyStep: number;
    maxInvestment: number | null;
}

export function TransactionHistoryModal({ isOpen, onClose, stock, mode, effectiveAnnualRate, effectiveBuyStep, maxInvestment }: TransactionHistoryModalProps) {
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [localAnnualRate, setLocalAnnualRate] = useState(effectiveAnnualRate);
    const [localBuyStep, setLocalBuyStep] = useState(effectiveBuyStep);
    const [localMaxInvestment, setLocalMaxInvestment] = useState(maxInvestment || 0);
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    const handleDelete = async (txId: number) => {
        if (confirm('确定要删除这条交易记录吗？')) {
            setDeletingId(txId);
            await deleteTransaction(txId);
            setDeletingId(null);
        }
    };

    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        try {
            const result = await updateStockSettings(stock.id, localAnnualRate, localBuyStep, localMaxInvestment > 0 ? localMaxInvestment : null);
            if (result.success) {
                alert('参数设置已保存');
            } else {
                alert('保存失败: ' + result.error);
            }
        } catch (error) {
            alert('保存失败');
        } finally {
            setIsSavingSettings(false);
        }
    };

    // Filter and Sort transactions
    const allTransactions = [...stock.transactions].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // For VIEW mode, we focus on OPEN BUY transactions
    // Sort by Target Sell Price Ascending (Adjacent Sell Prices)
    const openBuys = allTransactions
        .filter(t => t.type === 'BUY' && t.status === 'OPEN')
        .map(tx => ({
            ...tx,
            calculatedTargetPrice: calculateSellPrice(tx.price, new Date(tx.date), effectiveAnnualRate)
        }))
        .sort((a, b) => a.calculatedTargetPrice - b.calculatedTargetPrice);

    const closedBuys = allTransactions.filter(t => t.type === 'BUY' && t.status === 'CLOSED');
    const sells = allTransactions.filter(t => t.type === 'SELL');

    // --- Calculations for Header ---

    // 1. Cumulative Investment (Total Cost of Open Buys)
    const cumulativeInvestment = openBuys.reduce((sum, t) => sum + (t.price * t.quantity), 0);

    // 2. Realized Profit (from Sells)
    // This is tricky without linking sells to buys. 
    // Simplified: Sum(Sell Price * Qty) - Sum(Closed Buy Price * Qty)
    // Assuming FIFO and all closed buys correspond to the sells.
    const totalSellAmount = sells.reduce((sum, t) => sum + (t.price * t.quantity), 0);
    const totalClosedBuyCost = closedBuys.reduce((sum, t) => sum + (t.price * t.quantity), 0);
    const realizedProfit = totalSellAmount - totalClosedBuyCost;

    // 3. Holding Profit (Unrealized)
    // (Current Price - Buy Price) * Quantity for all OPEN BUYs
    const holdingProfit = openBuys.reduce((sum, t) => sum + ((stock.livePrice - t.price) * t.quantity), 0);

    // 4. Total Profit
    const totalProfit = realizedProfit + holdingProfit;

    // 5. Total Shares
    const totalShares = openBuys.reduce((sum, t) => sum + t.quantity, 0);

    // 6. Holding Cost (Average Price)
    const averageCost = totalShares > 0 ? cumulativeInvestment / totalShares : 0;

    // 7. Change % (Current vs Avg Cost)
    const priceChangePercent = averageCost > 0 ? ((stock.livePrice - averageCost) / averageCost) * 100 : 0;


    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === 'EDIT' ? `管理交易记录 - ${stock.liveName}` : `${stock.liveName} - 持有详情`}
        >
            <div className="space-y-6">
                {/* Header Stats - Only in VIEW mode */}
                {mode === 'VIEW' && (
                    <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg space-y-3 text-xs md:text-sm">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4">
                            <div>
                                <span className="text-gray-500">累计投入:</span>
                                <span className="font-mono font-medium ml-1">¥{cumulativeInvestment.toFixed(0)}</span>
                            </div>
                            {/* Placeholder for Budget */}
                            <div>
                                <span className="text-gray-500">买入台阶:</span>
                                <span className="font-mono font-medium ml-1">{effectiveBuyStep}%</span>
                            </div>
                            <div>
                                <span className="text-gray-500">预期年化:</span>
                                <span className="font-mono font-medium ml-1">{effectiveAnnualRate}%</span>
                            </div>
                            <div>
                                <span className="text-gray-500">卖出获利:</span>
                                <span className={`font-mono font-medium ml-1 ${realizedProfit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {realizedProfit.toFixed(0)}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500">持有获利:</span>
                                <span className={`font-mono font-medium ml-1 ${holdingProfit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {holdingProfit.toFixed(0)}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500">总计获利:</span>
                                <span className={`font-mono font-medium ml-1 ${totalProfit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {totalProfit.toFixed(0)}
                                </span>
                            </div>
                        </div>
                        <div className="pt-2 border-t border-red-100 dark:border-red-800/30 flex flex-wrap gap-4">
                            <div>
                                <span className="text-gray-500">持有成本:</span>
                                <span className="font-mono font-bold ml-1">【{averageCost.toFixed(2)}】</span>
                            </div>
                            <div>
                                <span className="text-gray-500">总计持股:</span>
                                <span className="font-mono font-medium ml-1">{totalShares}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">涨跌幅:</span>
                                <span className={`font-mono font-medium ml-1 ${priceChangePercent >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {priceChangePercent.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Settings Edit Section (Only in EDIT mode) */}
                {mode === 'EDIT' && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700 mb-6">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">个股参数设置</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">预期年化 (%)</label>
                                <input
                                    type="number"
                                    value={localAnnualRate}
                                    onChange={(e) => setLocalAnnualRate(Number(e.target.value))}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">买入台阶 (%)</label>
                                <input
                                    type="number"
                                    value={localBuyStep}
                                    onChange={(e) => setLocalBuyStep(Number(e.target.value))}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs text-gray-500 mb-1">最大投入 (元) <span className="text-gray-400 font-normal">- 0 表示不限制</span></label>
                                <input
                                    type="number"
                                    value={localMaxInvestment}
                                    onChange={(e) => setLocalMaxInvestment(Number(e.target.value))}
                                    placeholder="例如: 50000"
                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                            <button
                                onClick={handleSaveSettings}
                                disabled={isSavingSettings}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
                            >
                                {isSavingSettings ? '保存中...' : '保存参数'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Table / List */}
                {mode === 'VIEW' ? (
                    // Detailed Table for VIEW
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs md:text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-gray-500">
                                    <th className="p-2 whitespace-nowrap">index</th>
                                    <th className="p-2 whitespace-nowrap">买入价格</th>
                                    <th className="p-2 whitespace-nowrap">当前价格</th>
                                    <th className="p-2 whitespace-nowrap">拟收割价格</th>
                                    <th className="p-2 whitespace-nowrap">距离收割 (%)</th>
                                    <th className="p-2 whitespace-nowrap">数量</th>
                                    <th className="p-2 whitespace-nowrap">买入日期</th>
                                    <th className="p-2 whitespace-nowrap">持有天数</th>
                                    <th className="p-2 whitespace-nowrap">绝对收益率</th>
                                    <th className="p-2 whitespace-nowrap">年化收益率</th>
                                    <th className="p-2 whitespace-nowrap">盈利</th>
                                    <th className="p-2 whitespace-nowrap">建议操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {openBuys.map((tx, index) => {
                                    const targetPrice = tx.calculatedTargetPrice;
                                    const distancePercent = stock.livePrice > 0 ? ((targetPrice - stock.livePrice) / stock.livePrice) * 100 : 0;
                                    const daysHeld = Math.max(0, differenceInCalendarDays(new Date(), new Date(tx.date)));
                                    const absoluteReturn = ((stock.livePrice - tx.price) / tx.price) * 100;
                                    const annualizedReturn = daysHeld > 0 ? (absoluteReturn / daysHeld) * 365 : 0;
                                    const profit = (stock.livePrice - tx.price) * tx.quantity;

                                    // Gap Logic
                                    // Compare with the NEXT transaction (higher target price, since sorted asc)
                                    let showVirtualTradeSuggestion = false;
                                    let newRealSellPrice = 0;

                                    if (index < openBuys.length - 1) {
                                        const nextTx = openBuys[index + 1];
                                        const nextTarget = nextTx.calculatedTargetPrice;
                                        // User logic: Difference in "Distance to Harvest" = (T2 - T1) / LivePrice
                                        const gap = stock.livePrice > 0 ? (nextTarget - targetPrice) / stock.livePrice : 0;

                                        if (gap > 0.02) {
                                            showVirtualTradeSuggestion = true;
                                            // New Target if we do virtual trade AT THE TARGET PRICE
                                            newRealSellPrice = calculateSellPrice(targetPrice, new Date(), effectiveAnnualRate);
                                        }
                                    }

                                    return (
                                        <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="p-2 text-gray-500">{index + 1}</td>
                                            <td className="p-2 font-medium text-green-600 dark:text-green-400">{tx.price.toFixed(2)}</td>
                                            <td className="p-2">{stock.livePrice.toFixed(2)}</td>
                                            <td className="p-2 font-medium text-red-600 dark:text-red-400">{targetPrice.toFixed(2)}</td>
                                            <td className="p-2">{distancePercent.toFixed(1)}%</td>
                                            <td className="p-2">{tx.quantity}</td>
                                            <td className="p-2 text-gray-500">{format(new Date(tx.date), 'yyyy-MM-dd')}</td>
                                            <td className="p-2">{daysHeld}</td>
                                            <td className={`p-2 ${absoluteReturn >= 0 ? 'text-red-600' : 'text-green-600'}`}>{absoluteReturn.toFixed(1)}%</td>
                                            <td className={`p-2 ${annualizedReturn >= 0 ? 'text-red-600' : 'text-green-600'}`}>{annualizedReturn.toFixed(0)}%</td>
                                            <td className={`p-2 font-medium ${profit >= 0 ? 'text-red-600' : 'text-green-600'}`}>{profit.toFixed(0)}</td>
                                            <td className="p-2">
                                                {showVirtualTradeSuggestion && (
                                                    <div className="flex flex-col items-start">
                                                        <span className="text-xs font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded mb-1">
                                                            建议虚拟买卖
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            真实卖价: <span className="font-medium text-gray-900 dark:text-gray-300">¥{newRealSellPrice.toFixed(2)}</span>
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {openBuys.length === 0 && (
                                    <tr>
                                        <td colSpan={12} className="p-4 text-center text-gray-500">暂无持仓</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    // Simple List for EDIT (Manage)
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                        {allTransactions.length === 0 ? (
                            <div className="text-center text-gray-500 py-4">暂无交易记录</div>
                        ) : (
                            allTransactions.map((tx) => (
                                <div key={tx.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold ${tx.type === 'BUY' ? 'text-red-500' : 'text-green-500'}`}>
                                                {tx.type === 'BUY' ? '买入' : '卖出'}
                                            </span>
                                            <span className="font-mono font-medium">¥{tx.price.toFixed(2)}</span>
                                            <span className="text-sm text-gray-600 dark:text-gray-400">x {tx.quantity}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                            <span>{format(new Date(tx.date), 'yyyy-MM-dd')}</span>
                                            {tx.isVirtual && (
                                                <span className="bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded text-[10px]">虚拟</span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleDelete(tx.id)}
                                        disabled={deletingId === tx.id}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
                                        title="删除交易"
                                    >
                                        {deletingId === tx.id ? (
                                            <span className="loading loading-spinner loading-xs">...</span>
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}
