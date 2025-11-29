import React from 'react';
import { TodaysBuy, TodaysSell } from '@/types';
import { format } from 'date-fns';

interface TodaysTransactionsProps {
    activity: {
        buys: TodaysBuy[];
        sells: TodaysSell[];
    };
}

export function TodaysTransactions({ activity }: TodaysTransactionsProps) {
    const { buys, sells } = activity;

    if (buys.length === 0 && sells.length === 0) {
        return null;
    }

    return (
        <div className="space-y-8 mt-8">
            {/* Today's Sowing (Buys) */}
            {buys.length > 0 && (
                <div className="overflow-hidden rounded-lg shadow ring-1 ring-black ring-opacity-5">
                    <div className="bg-blue-300 dark:bg-blue-900 px-4 py-3 text-center">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">今天播种明细</h3>
                    </div>
                    <div className="overflow-x-auto bg-white dark:bg-gray-800">
                        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                            <thead className="bg-blue-50 dark:bg-blue-900/20">
                                <tr>
                                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 sm:pl-6">index</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">股票</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">当前价格</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">买入价格</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">拟收割价格</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">买入日期</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">绝对收益率</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">年化收益率</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {buys.map((buy) => (
                                    <tr key={buy.index}>
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">{buy.index}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">{buy.stockName}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">{buy.currentPrice.toFixed(2)}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-green-600 font-medium">{buy.buyPrice.toFixed(2)}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-red-600 font-medium">{buy.targetSellPrice.toFixed(2)}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">{format(new Date(buy.buyDate), 'yyyy-MM-dd')}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">{(buy.absoluteReturn * 100).toFixed(1)}%</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">{(buy.annualizedReturn * 100).toFixed(0)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Today's Harvest (Sells) */}
            {sells.length > 0 && (
                <div className="overflow-hidden rounded-lg shadow ring-1 ring-black ring-opacity-5">
                    <div className="bg-blue-200 dark:bg-blue-800 px-4 py-3 text-center">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">今日收割明细</h3>
                    </div>
                    <div className="overflow-x-auto bg-white dark:bg-gray-800">
                        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                            <thead className="bg-blue-50 dark:bg-blue-900/20">
                                <tr>
                                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 sm:pl-6">index</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">股票</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">买入价格</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">卖出价格</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">当前价格</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">买入日期</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">卖出日期</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">持有天数</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">绝对收益率</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">年化收益率</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">数量</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">盈利</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {sells.map((sell) => (
                                    <tr key={sell.index}>
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">{sell.index}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">{sell.stockName}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-green-600 font-medium">{sell.buyPrice.toFixed(2)}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-red-600 font-medium">{sell.sellPrice.toFixed(2)}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">{sell.currentPrice.toFixed(2)}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">{format(new Date(sell.buyDate), 'yyyy-MM-dd')}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">{format(new Date(sell.sellDate), 'yyyy-MM-dd')}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">{sell.daysHeld}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">{(sell.absoluteReturn * 100).toFixed(1)}%</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">{(sell.annualizedReturn * 100).toFixed(0)}%</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">{sell.quantity}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-white font-medium">{sell.profit.toFixed(0)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
