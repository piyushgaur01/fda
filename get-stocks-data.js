const async = require('async');
const axios = require('axios');
const csv = require('csv-parser');
const fs = require('fs');

const INDEX = {
  type: 'index',
  filename: './data/nifty_stocks.csv',
  startDate: '2015-01-01 00:00',
  endDate: '2019-12-31 00:00',
};

const PORTFOLIO = {
  type: 'portfolio',
  filename: './data/portfolio.csv',
  startDate: '2020-01-01 00:00',
  endDate: '2020-06-30 00:00',
};

let type;

const saveStockData = async (stock) => {
  const obj = type === 'index' ? INDEX : PORTFOLIO;
  const dir = type === 'index' ? 'historical' : 'current';
  obj.startDate = new Date(obj.startDate).getTime() / 1000;
  obj.endDate = new Date(obj.endDate).getTime() / 1000;
  const URL = `https://query1.finance.yahoo.com/v8/finance/chart/${stock.Symbol}.NS?&crumb=Q18c6fJhjCK&lang=en-IN&region=IN&interval=1d&period1=${obj.startDate}&period2=${obj.endDate}}&events=div%7Csplit&corsDomain=in.finance.yahoo.com`;
  const data = await axios.get(URL);
  fs.writeFileSync(`${__dirname}\\data\\securities\\${dir}\\${stock.Symbol}.json`, JSON.stringify(data.data.chart.result, null, 2));
};

((obj) => {
  const stocks = [];
  fs.createReadStream(obj.filename)
    .pipe(csv())
    .on('data', (data) => stocks.push(data))
    .on('end', () => {
      type = obj.type;
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
})(PORTFOLIO);
