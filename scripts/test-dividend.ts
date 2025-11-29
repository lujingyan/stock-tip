

async function main() {
    const symbol = 'sz002027'; // Focus Media
    console.log(`Fetching dividends for ${symbol}...`);
    // We need to modify the imported function to expose HTML or just fetch it here again for debugging.
    // Since we can't easily modify the imported function's return type without changing the codebase,
    // let's just copy the fetch logic here for debugging.

    const code = symbol.replace(/^[a-z]+/, '');
    const url = `http://vip.stock.finance.sina.com.cn/corp/go.php/vISSUE_ShareBonus/stockid/${code}.phtml`;
    console.log(`Fetching from ${url}`);

    const response = await fetch(url, {
        headers: { 'Referer': 'https://finance.sina.com.cn' },
        cache: 'no-store'
    });

    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder('gbk');
    const html = decoder.decode(buffer);

    console.log("HTML Preview (first 500 chars):", html.substring(0, 500));

    // Manual Table Parsing
    const tableStart = html.indexOf('<table id="sharebonus_1"');
    if (tableStart !== -1) {
        const tableEnd = html.indexOf('</table>', tableStart);
        const tableContent = html.substring(tableStart, tableEnd);

        // Split by rows
        const rows = tableContent.split('</tr>');
        console.log(`Found ${rows.length} rows.`);

        // Print first 5 rows (skipping header)
        for (let i = 1; i < Math.min(rows.length, 6); i++) {
            const row = rows[i].replace(/[\n\r\t]/g, '').trim();
            if (!row) continue;

            // Extract cells
            const cells = row.match(/<td>(.*?)<\/td>/g);
            if (cells) {
                const cleanCells = cells.map(c => c.replace(/<\/?td>/g, '').replace(/<a.*?>.*?<\/a>/g, '').trim());
                console.log(`Row ${i}:`, cleanCells.join(' | '));
            }
        }
    } else {
        console.log("Table not found.");
    }
}

main().catch(console.error);
