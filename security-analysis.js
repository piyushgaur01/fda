const async = require('async');
const fs = require('fs');
const csv = require('csv-parser');
const stats = require('simple-statistics');
const { parse } = require('json2csv');

const {
  averageReturn,
  calcDailyReturns,
} = require('./library');

const MARKET_DATA = [];

const filePath = `${__dirname}\\data\\securities\\historical`;

const constants = {
  MARKET_RETURN: 0.0,
  SIGMA_M: 0.0,
  ANNUAL_RISK_FREE_RETURN: 0.06,
  // DAILY_RISK_FREE_RETURN: 0.000047762540695384104,
  DAILY_RISK_FREE_RETURN: 0.00015965358745284597,
};

let portfolio = [];

let adjCloseMarket;
let DAILY_MKT_RTN;

function calculateStockParameters(filename, cb) {
  const Symbol = filename.split('.json')[0];
  const data = JSON.parse(fs.readFileSync(`${filePath}\\${filename}`, { encoding: 'utf-8' }))[0];
  const { adjclose } = data.indicators.adjclose[0];

  const dailyReturns = calcDailyReturns(adjclose);
  const avgReturn = averageReturn(dailyReturns);

  let beta = (avgReturn - constants.DAILY_RISK_FREE_RETURN) / (constants.MARKET_RETURN - constants.DAILY_RISK_FREE_RETURN);
  beta = 0.67 * beta + 0.33;

  const sigmaEpsilonSquared = (stats.standardDeviation(dailyReturns.map((x) => x - constants.DAILY_RISK_FREE_RETURN)) ** 2
    - (beta ** 2) * (stats.standardDeviation(DAILY_MKT_RTN.map((x) => x - constants.DAILY_RISK_FREE_RETURN))) ** 2);

  const expectedReturn = constants.DAILY_RISK_FREE_RETURN + beta * (constants.MARKET_RETURN - constants.DAILY_RISK_FREE_RETURN);

  const treynorRatio = (avgReturn - constants.ANNUAL_RISK_FREE_RETURN) / beta;

  const security = {
    // Name: stockInfo.name,
    Symbol,
    'Average Return': avgReturn,
    // 'Std Dev (Sigma_Ri)': sigmaRi,
    beta,
    'Sigma Epsilon': sigmaEpsilonSquared,
    expectedReturn,
    'Treynor Ratio (TR)': treynorRatio,
  };

  portfolio.push(security);
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
          // Filter out the stocks which have a negative beta
          portfolio = portfolio.filter((stock) => (stock.beta > 0));

          // Sorting the data in decreasing order based on Treynor's Ratio
          portfolio.sort((a, b) => (a['Treynor Ratio (TR)'] > b['Treynor Ratio (TR)'] ? -1 : 1));

          for (let i = 0; i < portfolio.length; i++) {
            let summNumerator = 0;
            let summDenominator = 0;
            const stock = portfolio[i];
            for (let j = 0; j <= i; j++) {
              const tempStock = portfolio[j];
              summNumerator += ((tempStock.expectedReturn - constants.ANNUAL_RISK_FREE_RETURN) * tempStock.beta) / ((tempStock['Sigma Epsilon']));
              summDenominator += (tempStock.beta ** 2) / ((tempStock['Sigma Epsilon']));
            }
            stock.Ci = ((constants.SIGMA_M ** 2) * summNumerator) / (1 + (constants.SIGMA_M ** 2) * summDenominator);
          }

          portfolio.forEach((stock) => {
            stock.test = stock['Treynor Ratio (TR)'] > stock.Ci ? 'T' : 'F';
          });

          portfolio = portfolio.filter((stock) => stock.test === 'T');

          // Cutpoint will be last value of array as we have removed the other values and array is sorted
          const cStar = portfolio[portfolio.length - 1].Ci;
          let sumOfZi = 0;
          portfolio.forEach((stock) => {
            stock.Zi = Math.abs((stock.beta / stock['Sigma Epsilon']) * (((stock.expectedReturn - constants.ANNUAL_RISK_FREE_RETURN) / stock.beta) - cStar));
            sumOfZi += stock.Zi;
          });

          constants['E(Rp)'] = 0; // return of portfolio
          portfolio.forEach((stock) => {
            stock.Wi = parseFloat(((stock.Zi / sumOfZi) * 100).toPrecision(3));
            constants['E(Rp)'] += (stock.Wi / 100) * stock.expectedReturn;
          });

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

fs.createReadStream(`${__dirname}\\data\\market.csv`)
  .pipe(csv())
  .on('data', (data) => MARKET_DATA.push(data))
  .on('end', () => {
    adjCloseMarket = MARKET_DATA.map((item) => parseFloat(item['Adj Close']));
    DAILY_MKT_RTN = calcDailyReturns(adjCloseMarket);
    constants.MARKET_RETURN = averageReturn(DAILY_MKT_RTN);
    constants.SIGMA_M = stats.standardDeviation(DAILY_MKT_RTN);
    start();
  });
