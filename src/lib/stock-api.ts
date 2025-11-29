/**
 * Fetches stock data from Sina Finance.
 */

export interface StockData {
    symbol: string;
    name: string;
    currentPrice: number;
    open: number;
    prevClose: number;
    high: number;
    low: number;
    volume: number;
    amount: number;
}

export interface StockSuggestion {
    symbol: string;
    name: string;
    code: string; // The numeric code (e.g. 002027)
}

/**
 * Fetches the real-time price for a given stock symbol.
 * Symbol should be in the format "sh600000" or "sz002027".
 */
export async function fetchStockPrice(symbol: string): Promise<StockData | null> {
    try {
        // Sina API returns GBK encoding, but fetch handles it usually if we decode correctly.
        // However, in Node environment, we might need iconv-lite if we care about the name.
        // For now, let's try fetching and see if we get the numbers right.
        // Note: This runs on the server, so we can use fetch.

        const response = await fetch(`http://hq.sinajs.cn/list=${symbol}`, {
            headers: { 'Referer': 'https://finance.sina.com.cn' },
            cache: 'no-store'
        });

        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder('gbk');
        const text = decoder.decode(buffer);
        // Response format: var hq_str_sh600000="浦发银行,9.580,9.590,9.560,9.620,9.540,9.560,9.570,30023518,287619284.000,18900,9.560,204200,9.550,130300,9.540,216300,9.530,161500,9.520,15000,9.570,11200,9.580,102200,9.590,134500,9.600,175300,9.610,2024-05-17,15:00:00,00,";

        const match = text.match(/="([^"]+)";/);
        if (!match) return null;

        const data = match[1].split(',');
        if (data.length < 10) return null;

        return {
            symbol,
            name: data[0], // Might be garbled if not decoded properly, but we can fix that later or use the suggestion name
            open: parseFloat(data[1]),
            prevClose: parseFloat(data[2]),
            currentPrice: parseFloat(data[3]),
            high: parseFloat(data[4]),
            low: parseFloat(data[5]),
            volume: parseFloat(data[8]),
            amount: parseFloat(data[9]),
        };
    } catch (error) {
        console.error("Error fetching stock price:", error);
        return null;
    }
}

/**
 * Searches for stocks using Sina's suggestion API.
 */
export async function searchStocks(query: string): Promise<StockSuggestion[]> {
    if (!query) return [];

    try {
        const response = await fetch(`http://suggest3.sinajs.cn/suggest/type=&key=${query}&name=suggestdata_${Date.now()}`, {
            headers: { 'Referer': 'https://finance.sina.com.cn' },
        });
        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder('gbk');
        const text = decoder.decode(buffer);
        // Format: var suggestdata_1715930000="分众传媒,11,002027,sz002027,fzcm,880559,0,0|...";

        const match = text.match(/="([^"]*)"/);
        if (!match) return [];

        const rawData = match[1];
        if (!rawData) return [];

        const items = rawData.split(';');
        return items.map(item => {
            const parts = item.split(',');
            if (parts.length < 4) return null;
            return {
                name: parts[0],
                code: parts[2],
                symbol: parts[3], // e.g. sz002027
            };
        }).filter((item): item is StockSuggestion => item !== null);

    } catch (error) {
        console.error("Error searching stocks:", error);
        return [];
    }
}

/**
 * Fetches dividend history and returns the latest dividend per share and its date.
 */
export async function fetchStockDividends(symbol: string): Promise<{ dividend: number; date: string } | null> {
    try {
        // Strip prefix (sh/sz)
        const code = symbol.replace(/^[a-z]+/, '');

        const response = await fetch(`http://vip.stock.finance.sina.com.cn/corp/go.php/vISSUE_ShareBonus/stockid/${code}.phtml`, {
            headers: { 'Referer': 'https://finance.sina.com.cn' },
            cache: 'no-store'
        });

        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder('gbk');
        const html = decoder.decode(buffer);

        // We want to find the latest "实施" (Implementation) dividend.
        // Table row usually looks like:
        // <tr>...<td>2023-06-15</td>...<td>10派10元</td>...<td>实施</td>...</tr>
        // The date column is usually the "Ex-Dividend Date" (除权除息日) or "Registration Date" (股权登记日).
        // Sina table columns: 公告日期, 送股, 转增, 派息, 进度, 除权除息日, 股权登记日, 红股上市日

        // Regex parsing is fragile. Let's parse the table structure.
        // Table ID is usually "sharebonus_1"
        const tableStart = html.indexOf('<table id="sharebonus_1"');
        if (tableStart === -1) return null;

        const tableEnd = html.indexOf('</table>', tableStart);
        const tableContent = html.substring(tableStart, tableEnd);

        // Split by rows
        const rows = tableContent.split('</tr>');

        // Iterate rows (skip header)
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i].replace(/[\n\r\t]/g, '').trim();
            if (!row) continue;

            // Extract cells
            const cells = row.match(/<td>(.*?)<\/td>/g);
            if (cells && cells.length >= 6) {
                const cleanCells = cells.map(c => c.replace(/<\/?td>/g, '').replace(/<a.*?>.*?<\/a>/g, '').trim());

                // Columns (based on observation):
                // 0: Announcement Date
                // 1: Bonus Shares
                // 2: Transferred Shares
                // 3: Dividend (per 10 shares)
                // 4: Status
                // 5: Ex-Dividend Date
                // 6: Registration Date

                const dividendStr = cleanCells[3];
                const status = cleanCells[4];
                const exDate = cleanCells[5];

                if (status === '实施' && exDate && exDate !== '--') {
                    const payoutFor10 = parseFloat(dividendStr);
                    if (!isNaN(payoutFor10)) {
                        return {
                            dividend: payoutFor10 / 10,
                            date: exDate
                        };
                    }
                }
            }
        }

        return null;
    } catch (error) {
        console.error("Error fetching dividends:", error);
        return null;
    }
}
