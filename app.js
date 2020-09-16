const async = require('async');
const fs = require('fs');
const { parse } = require('json2csv');

const { calculateDailyReturn, standardDeviation, getStockBeta } = require('./library');

const filePath = `${__dirname}\\data\\securities`;
const processedData = [];

function calculateStockParameters(filename, cb) {
  const code = filename.split('.json')[0];
  const data = JSON.parse(fs.readFileSync(`${filePath}\\${filename}`, { encoding: 'utf-8' }))[0];
  const { adjclose } = data.indicators.adjclose[0];

  const dailyReturns = calculateDailyReturn(adjclose);
  const meanDailyReturn = Math.pow(
    dailyReturns.reduce((acc, val) => (acc) * (1 + val), 1), 1 / (dailyReturns.length),
  ) - 1;
  const stdDailyReturn = standardDeviation(dailyReturns);

  const meanReturn = Math.pow(1 + meanDailyReturn, dailyReturns.length) - 1;
  const stdReturn = Math.sqrt(stdDailyReturn) * stdDailyReturn;

  const stock = getStockBeta(code);

  const security = {
    name: stock.name,
    code,
    meanReturn,
    stdReturn,
    beta: stock['short term / long term beta'].split(' / ')[1],
  };

  processedData.push(security);
  cb();
}

function start() {
  fs.readdir(`${filePath}`, (error, files) => {
    if (error) console.log(error);

    async.eachSeries(files,
      calculateStockParameters,
      (err) => {
        // if any of the file processing produced an error, err would equal that error
        if (err) {
          console.log(err);
          return;
        }

        try {
          const opts = { ...Object.keys(processedData[0]) };
          const csv = parse(processedData, opts);
          fs.writeFileSync(`${__dirname}\\data\\final-data.csv`, csv);
        } catch (err2) {
          console.error(err2);
        }

        console.log('All done!');
      });
  });
}

start();
