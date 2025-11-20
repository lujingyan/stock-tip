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

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Realized Profit (FIFO)">
                {!stats ? (
                    <div className="p-4 text-center text-gray-500">Loading...</div>
                ) : (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">Monthly</h3>
                            <div className="space-y-2">
                                {Object.entries(stats.monthlyStats).length === 0 ? (
                                    <div className="text-sm text-gray-400 italic">No realized profit yet</div>
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
                            <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">Yearly</h3>
                            <div className="space-y-2">
                                {Object.entries(stats.yearlyStats).length === 0 ? (
                                    <div className="text-sm text-gray-400 italic">No realized profit yet</div>
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
                            * Profit is calculated using FIFO (First-In-First-Out) method.
                            Only fully closed positions (Buy + Sell pairs) contribute to these figures.
                            Unsold holdings are not included.
                        </p>
                    </div>
                )}
            </Modal>
        </>
    );
}
