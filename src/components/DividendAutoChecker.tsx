'use client';

import { useEffect, useRef } from 'react';
import { checkAllDividends } from '@/lib/actions';

export function DividendAutoChecker() {
    const hasChecked = useRef(false);

    useEffect(() => {
        if (hasChecked.current) return;
        hasChecked.current = true;

        const check = async () => {
            // Simple check: Don't spam the server. 
            // In a real app, we might store 'lastCheckTime' in localStorage to avoid checking on every reload.
            const lastCheck = localStorage.getItem('lastDividendCheck');
            const now = Date.now();

            // Check at most once every 1 hour
            if (lastCheck && now - parseInt(lastCheck) < 1 * 60 * 60 * 1000) {
                return;
            }

            console.log("Checking for dividends...");
            const result = await checkAllDividends();

            if (result.success) {
                localStorage.setItem('lastDividendCheck', now.toString());
                if (result.updatedCount && result.updatedCount > 0) {
                    // Could show a toast here
                    alert(`自动为 ${result.updatedCount} 只股票应用了分红。价格已更新。`);
                }
            }
        };

        check();
    }, []);

    return null; // Invisible component
}
