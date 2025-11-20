import { getDashboardData } from '@/lib/actions';
import { StockSearch } from '@/components/StockSearch';
import { StockCard } from '@/components/StockCard';
import { SettingsDialog } from '@/components/SettingsDialog';
import { StatisticsModal } from '@/components/StatisticsModal';
import { RefreshButton } from '@/components/RefreshButton';
import { TrendingUp } from 'lucide-react';
import { DashboardStock } from '@/types';

export const dynamic = 'force-dynamic'; // Ensure we always get fresh data

export default async function Home() {
  const { stocks, settings } = await getDashboardData();

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/20">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Stock Trading Tips</h1>
              <p className="text-sm text-gray-500">
                Rate: {settings.annualRate}% | Step: {settings.buyStep}%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <StockSearch />
            <RefreshButton />
            <SettingsDialog />
            <StatisticsModal />
          </div>
        </div>

        {/* Content */}
        {stocks.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-block p-6 rounded-full bg-gray-100 dark:bg-gray-900 mb-4">
              <TrendingUp className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No stocks tracked yet</h2>
            <p className="text-gray-500 max-w-md mx-auto">
              Search for a stock above (e.g., "600519" or "Moutai") to start tracking prices and getting trading tips.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stocks.map((stock: DashboardStock) => (
              // @ts-ignore - Date serialization issue from Server Actions to Client Component
              <StockCard key={stock.id} stock={stock as any} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
