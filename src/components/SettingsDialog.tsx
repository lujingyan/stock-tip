'use client';

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { Modal } from './ui/Modal';
import { getSettings, updateSettings, exportUserData, importUserData } from '@/lib/actions';
import { useRef } from 'react';

export function SettingsDialog({ settings }: { settings?: { annualRate: number; buyStep: number } }) {
    const [isOpen, setIsOpen] = useState(false);
    const [annualRate, setAnnualRate] = useState(settings?.annualRate.toString() || '15');
    const [buyStep, setBuyStep] = useState(settings?.buyStep.toString() || '3.5');
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && !settings) {
            getSettings().then(s => {
                if (s) {
                    setAnnualRate(s.annualRate.toString());
                    setBuyStep(s.buyStep.toString());
                }
            });
        } else if (isOpen && settings) {
            setAnnualRate(settings.annualRate.toString());
            setBuyStep(settings.buyStep.toString());
        }
    }, [isOpen, settings]);

    const handleSave = async () => {
        setLoading(true);
        await updateSettings(parseFloat(annualRate), parseFloat(buyStep));
        setLoading(false);
        setIsOpen(false);
    };

    const handleExport = async () => {
        const data = await exportUserData();
        if (data) {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `stock-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                setLoading(true);
                const result = await importUserData(json);
                setLoading(false);
                if (result.success) {
                    alert('数据导入成功！');
                    setIsOpen(false);
                    window.location.reload(); // Reload to reflect changes
                } else {
                    alert('数据导入失败: ' + result.error);
                }
            } catch (err) {
                console.error(err);
                alert('无效的 JSON 文件');
            }
        };
        reader.readAsText(file);
        // Reset input
        e.target.value = '';
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

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="全局设置">
                <div className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b pb-2">参数设置</h3>
                        <div>
                            <label className="block text-sm font-medium mb-1">年化收益率 (%)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={annualRate}
                                onChange={(e) => setAnnualRate(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                            />
                            <p className="text-xs text-gray-500 mt-1">目标年化收益 (例如 15%)</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">买入步长 (%)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={buyStep}
                                onChange={(e) => setBuyStep(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                            />
                            <p className="text-xs text-gray-500 mt-1">下次买入所需跌幅 (例如 3.5%)</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b pb-2">数据管理</h3>
                        <div className="flex gap-4">
                            <button
                                onClick={handleExport}
                                className="flex-1 py-2 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                            >
                                导出数据
                            </button>
                            <button
                                onClick={handleImportClick}
                                className="flex-1 py-2 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                            >
                                导入数据
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".json"
                                className="hidden"
                            />
                        </div>
                        <p className="text-xs text-gray-500">
                            导出数据为 JSON 文件以进行备份或迁移。导入以恢复数据。
                        </p>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {loading ? '处理中...' : '保存设置'}
                    </button>
                </div>
            </Modal>
        </>
    );
}
