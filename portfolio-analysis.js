const async = require('async');
const fs = require('fs');
const csv = require('csv-parser');
const stats = require('simple-statistics');

const {
  averageReturn,
  calcDailyReturns,
} = require('./library');

const filePath = `${__dirname}\\data\\securities\\current`;

let ratios;

const portfolio = [];

function calculateStockParameters(filename, cb) {
  const Symbol = filename.split('.json')[0];
  const data = JSON.parse(fs.readFileSync(`${filePath}\\${filename}`, { encoding: 'utf-8' }))[0];
  const { adjclose } = data.indicators.adjclose[0];
  const weightedClose = [];
  const dailyReturns = calcDailyReturns(adjclose);
  const avgReturn = averageReturn(dailyReturns);

  const stock = portfolio.find((s) => s.Symbol === Symbol);

  adjclose.forEach((p) => {
    weightedClose.push(p * stock.Wi);
  });

  const dailyWeightedReturn = calcDailyReturns(weightedClose);
  dailyWeightedReturn.forEach((r, i) => {
    stock[`Day${i + 1}`] = r;
  });

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
          ratios.Rp = 0; // return of portfolio
          portfolio.forEach((stock) => {
            ratios.Rp += (stock.Wi / 100) * stock.avgReturn;
          });

          const summation = {
            Symbol: 'Sum',
            Wi: 0,
            avgReturn: 0,
          };

          const length = Object.keys(portfolio[0]).length - 3;
          for (let j = 1; j <= length; j++) {
            summation[`Day${j}`] = 0;
            for (let i = 0; i < portfolio.length; i++) {
              summation[`Day${j}`] += portfolio[i][`Day${j}`];
            }
          }
          portfolio.push(summation);
          ratios.PortfolioSigma = [];
          Object.keys(summation).forEach((key) => {
            // eslint-disable-next-line no-restricted-globals
            if (key.startsWith('Day') && !isNaN(summation[key])) ratios.PortfolioSigma.push(summation[key]);
          });

          ratios.PortfolioSigma = stats.standardDeviation(ratios.PortfolioSigma);

          ratios.JensonsAlpha = ratios.Rp - ratios['E(Rp)'];
          ratios.SharpeRatio = (ratios['E(Rp)'] - ratios.ANNUAL_RISK_FREE_RETURN) / ratios.PortfolioBeta;
          ratios.TreynorsRatio = (ratios['E(Rp)'] - ratios.ANNUAL_RISK_FREE_RETURN) / ratios.PortfolioSigma;

          console.table(ratios);
          fs.writeFileSync(`${__dirname}\\data\\ratios.json`, JSON.stringify(ratios, null, 2));
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
    ratios = JSON.parse(fs.readFileSync(`${__dirname}\\data\\ratios.json`, { encoding: 'utf-8' }));
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
    start();
  });
