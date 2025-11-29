'use client';

import { useState } from 'react';
import { Coins } from 'lucide-react';
import { checkAllDividends } from '@/lib/actions';
import { useRouter } from 'next/navigation';

export function CheckDividendsButton() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleCheck = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const result = await checkAllDividends();
            if (result.success) {
                if (result.updatedCount && result.updatedCount > 0) {
                    alert(`成功更新！已为 ${result.updatedCount} 只股票应用了分红。`);
                } else {
                    alert('检查完成，暂无新的分红需要应用。');
                }
                router.refresh();
            } else {
                alert('检查分红失败：' + result.error);
            }
        } catch (error) {
            alert('发生错误，请重试');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleCheck}
            disabled={loading}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-600 dark:text-gray-300 disabled:opacity-50"
            title="检查分红"
        >
            <Coins className={`w-5 h-5 ${loading ? 'animate-pulse text-yellow-500' : ''}`} />
        </button>
    );
}
