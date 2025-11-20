'use client';

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { Modal } from './ui/Modal';
import { getSettings, updateSettings } from '@/lib/actions';

export function SettingsDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [annualRate, setAnnualRate] = useState('15');
    const [buyStep, setBuyStep] = useState('3.5');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            getSettings().then(s => {
                setAnnualRate(s.annualRate.toString());
                setBuyStep(s.buyStep.toString());
            });
        }
    }, [isOpen]);

    const handleSave = async () => {
        setLoading(true);
        await updateSettings(parseFloat(annualRate), parseFloat(buyStep));
        setLoading(false);
        setIsOpen(false);
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                title="Settings"
            >
                <SettingsIcon className="w-5 h-5" />
            </button>

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Global Settings">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Annual Interest Rate (%)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={annualRate}
                            onChange={(e) => setAnnualRate(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                        />
                        <p className="text-xs text-gray-500 mt-1">Target annual return (e.g. 15%)</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Buy Step (%)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={buyStep}
                            onChange={(e) => setBuyStep(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                        />
                        <p className="text-xs text-gray-500 mt-1">Drop required for next buy (e.g. 3.5%)</p>
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
