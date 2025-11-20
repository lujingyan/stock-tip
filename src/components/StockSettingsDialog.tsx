'use client';

import { useState, useEffect } from 'react';
import { Settings2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { updateStockSettings } from '@/lib/actions';
import { DashboardStock } from '@/types';

interface StockSettingsDialogProps {
    stock: DashboardStock;
}

export function StockSettingsDialog({ stock }: StockSettingsDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [annualRate, setAnnualRate] = useState(stock.annualRate?.toString() || '');
    const [buyStep, setBuyStep] = useState(stock.buyStep?.toString() || '');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        const rate = annualRate ? parseFloat(annualRate) : null;
        const step = buyStep ? parseFloat(buyStep) : null;

        await updateStockSettings(stock.id, rate, step);
        setLoading(false);
        setIsOpen(false);
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                title="Stock Settings"
            >
                <Settings2 className="w-5 h-5" />
            </button>

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={`Settings for ${stock.liveName}`}>
                <div className="space-y-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm rounded-lg">
                        Leave fields empty to use global defaults.
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Annual Interest Rate (%)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={annualRate}
                            onChange={(e) => setAnnualRate(e.target.value)}
                            placeholder="Global Default"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Buy Step (%)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={buyStep}
                            onChange={(e) => setBuyStep(e.target.value)}
                            placeholder="Global Default"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                        />
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </Modal>
        </>
    );
}
