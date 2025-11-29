export interface Transaction {
    id: number;
    stockId: number;
    type: string; // 'BUY' | 'SELL'
    price: number;
    quantity: number;
    date: Date;
    relatedTransactionId?: number | null;
    isVirtual: boolean;
    status: string; // 'OPEN' | 'CLOSED'
    createdAt: Date;
    updatedAt: Date;
}

export interface Stock {
    id: number;
    symbol: string;
    name: string;
    annualRate?: number | null;
    buyStep: number;
    maxInvestment: number | null;
    transactions: Transaction[];
    createdAt: Date;
    updatedAt: Date;
}

export interface Settings {
    id: number;
    annualRate: number;
    buyStep: number;
    createdAt: Date;
    updatedAt: Date;
}

// Extended Stock type with calculated fields for the Dashboard
export interface DashboardStock extends Stock {
    livePrice: number;
    liveName: string;
    latestBuy?: Transaction;
    targetSellPrice?: number | null;
    nextBuyPrice?: number | null;
}

export interface TodaysBuy {
    index: number;
    stockName: string;
    currentPrice: number;
    buyPrice: number;
    targetSellPrice: number;
    buyDate: Date;
    absoluteReturn: number;
    annualizedReturn: number;
}

export interface TodaysSell {
    index: number;
    stockName: string;
    buyPrice: number;
    sellPrice: number;
    currentPrice: number;
    buyDate: Date;
    sellDate: Date;
    daysHeld: number;
    absoluteReturn: number;
    annualizedReturn: number;
    quantity: number;
    profit: number;
}

export interface DashboardData {
    settings: Settings;
    stocks: DashboardStock[];
    todaysActivity: {
        buys: TodaysBuy[];
        sells: TodaysSell[];
    };
}
