import { getDashboardData, logoutAction } from '@/lib/actions';
import { StockSearch } from '@/components/StockSearch';
import { StockTable } from '@/components/StockTable';
import { SettingsDialog } from '@/components/SettingsDialog';
import { StatisticsModal } from '@/components/StatisticsModal';
import { CheckDividendsButton } from '@/components/CheckDividendsButton';
import { RefreshButton } from '@/components/RefreshButton';
import { DividendAutoChecker } from '@/components/DividendAutoChecker';
import { redirect } from 'next/navigation';

import { TodaysTransactions } from '@/components/TodaysTransactions';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const data = await getDashboardData();

  if (!data) {
    redirect('/login');
  }

  const { settings, stocks } = data;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <DividendAutoChecker />
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            A股交易助手
          </h1>
          <div className="flex items-center gap-4">
            <StatisticsModal />
            <SettingsDialog settings={settings} />
            <CheckDividendsButton />
            <RefreshButton />
            <form action={logoutAction}>
              <button type="submit" className="text-sm text-red-600 hover:text-red-800 font-medium">
                退出登录
              </button>
            </form>
          </div>
        </div>

        {/* Search */}
        <div className="w-full max-w-2xl mx-auto">
          <StockSearch />
        </div>

        {/* Stock Table */}
        <div className="w-full">
          <StockTable stocks={stocks} settings={settings} />
        </div>

        {/* Today's Activity Section */}
        <TodaysTransactions activity={data.todaysActivity} />
      </div>
    </main>
  );
}
