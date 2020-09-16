const async = require('async');
const axios = require('axios');
const csv = require('csv-parser');
const fs = require('fs');

const INDEX_FILE = './data/nifty_stocks.csv';

const saveStockData = async (stock) => {
  const URL = `https://query1.finance.yahoo.com/v8/finance/chart/${stock.Symbol}.NS?&crumb=Q18c6fJhjCK&lang=en-IN&region=IN&interval=1d&period1=1420050600&period2=1577730600&events=div%7Csplit&corsDomain=in.finance.yahoo.com`;
  const data = await axios.get(URL);
  fs.writeFileSync(`${__dirname}\\data\\${stock.Symbol}.json`, JSON.stringify(data.data.chart.result, null, 2));
};

((filename) => {
  const stocks = [];
  fs.createReadStream(filename)
    .pipe(csv())
    .on('data', (data) => stocks.push(data))
    .on('end', () => {
      async.eachSeries(stocks,
        saveStockData,
        (err) => {
          // if any of the file processing produced an error, err would equal that error
          if (err) {
            console.log('An error occurred!');
            console.log(err);
            return;
          }
          console.log('All done!');
        });
    });
})(INDEX_FILE);
