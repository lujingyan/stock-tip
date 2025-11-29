'use client';

import { DashboardStock, Settings } from '@/types';
import { StockRow } from './StockRow';

export function StockTable({ stocks, settings }: { stocks: DashboardStock[], settings: Settings }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                            <th className="px-4 py-3">股票</th>
                            <th className="px-4 py-3">目标买入</th>
                            <th className="px-4 py-3">当前价</th>
                            <th className="px-4 py-3">目标卖出</th>
                            <th className="px-4 py-3">持仓量</th>
                            <th className="px-4 py-3">建议操作</th>
                            <th className="px-4 py-3">操作信号</th>
                            <th className="px-4 py-3 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {stocks.map((stock) => (
                            <StockRow
                                key={stock.id}
                                stock={stock}
                                defaultAnnualRate={settings.annualRate}
                                defaultBuyStep={settings.buyStep}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
            {stocks.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                    暂无股票，请搜索添加。
                </div>
            )}
        </div>
    );
}
