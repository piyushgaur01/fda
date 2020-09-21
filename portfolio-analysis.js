const async = require('async');
const fs = require('fs');
const csv = require('csv-parser');
const { parse } = require('json2csv');

const {
  averageReturn,
  calcDailyReturns,
} = require('./library');

const filePath = `${__dirname}\\data\\securities\\current`;

const constants = {
  ANNUAL_RISK_FREE_RETURN: 0.06,
  // DAILY_RISK_FREE_RETURN: 0.000047762540695384104,
  DAILY_RISK_FREE_RETURN: 0.00015965358745284597,
};

let portfolio = [];

function calculateStockParameters(filename, cb) {
  const Symbol = filename.split('.json')[0];
  const data = JSON.parse(fs.readFileSync(`${filePath}\\${filename}`, { encoding: 'utf-8' }))[0];
  const { adjclose } = data.indicators.adjclose[0];

  const dailyReturns = calcDailyReturns(adjclose);
  const avgReturn = averageReturn(dailyReturns);

  const stock = portfolio.find(s => s.Symbol === Symbol);

  stock.avgReturn = avgReturn;
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
          constants.Rp = 0; // return of portfolio
          portfolio.forEach((stock) => {
            constants.Rp += (stock.Wi / 100) * stock.avgReturn;
          });

          console.table(portfolio);
          console.table(constants);
          // const opts = { ...Object.keys(portfolio[0]) };
          // const csvData = parse(portfolio, opts);
          // fs.writeFileSync(`${__dirname}\\data\\portfolio.csv`, csvData); // -${Date.now()}
          // console.table(portfolio, ['Symbol', 'Average Return', 'expectedReturn', 'beta', 'Treynor Ratio (TR)', 'Ci', 'Zi', 'Wi']);
        } catch (err2) {
          console.error(err2);
        }
      });
  });
}

// start();

fs.createReadStream(`${__dirname}\\data\\portfolio.csv`)
  .pipe(csv())
  .on('data', (data) => portfolio.push(data))
  .on('end', () => {
    portfolio.forEach((s) => {
      delete s['Average Return'];
      delete s.beta;
      delete s['Sigma Epsilon'];
      delete s.expectedReturn;
      delete s['Treynor Ratio (TR)'];
      delete s.test;
      delete s.Ci;
      delete s.Zi;
    });
    console.table(portfolio);
    start();
  });
