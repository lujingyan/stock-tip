'use client';

import { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { getStatistics } from '@/lib/actions';

export function StatisticsModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [stats, setStats] = useState<{ monthlyStats: Record<string, number>, yearlyStats: Record<string, number> } | null>(null);

    useEffect(() => {
        if (isOpen) {
            getStatistics().then(setStats);
        }
    }, [isOpen]);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                title="Statistics"
            >
                <BarChart3 className="w-5 h-5" />
            </button>

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="已实现收益 (收割统计)">
                {!stats ? (
                    <div className="p-4 text-center text-gray-500">加载中...</div>
                ) : (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">月度收益</h3>
                            <div className="space-y-2">
                                {Object.entries(stats.monthlyStats).length === 0 ? (
                                    <div className="text-sm text-gray-400 italic">暂无已实现收益</div>
                                ) : (
                                    Object.entries(stats.monthlyStats).map(([month, amount]) => (
                                        <div key={month} className="flex justify-between items-center text-sm">
                                            <span>{month}</span>
                                            <span className={`font-mono font-medium ${amount >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                {amount >= 0 ? '+' : ''}{amount.toFixed(2)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">年度收益</h3>
                            <div className="space-y-2">
                                {Object.entries(stats.yearlyStats).length === 0 ? (
                                    <div className="text-sm text-gray-400 italic">暂无已实现收益</div>
                                ) : (
                                    Object.entries(stats.yearlyStats).map(([year, amount]) => (
                                        <div key={year} className="flex justify-between items-center text-sm">
                                            <span>{year}</span>
                                            <span className={`font-mono font-medium ${amount >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                {amount >= 0 ? '+' : ''}{amount.toFixed(2)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <p className="text-xs text-gray-400 mt-4">
                            * 收益计算采用“最低目标价优先”原则，与首页“收割”逻辑一致。
                            仅统计已完全平仓（买入+卖出配对）的交易。
                            未卖出的持仓不计入统计。
                        </p>
                    </div>
                )}
            </Modal>
        </>
    );
}
