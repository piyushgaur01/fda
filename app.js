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

const filePath = `${__dirname}\\data\\securities`;

const constants = {
  MARKET_RETURN: 0.0,
  SIGMA_M: 0.0,
  ANNUAL_RISK_FREE_RETURN: 0.06,
  // DAILY_RISK_FREE_RETURN: 0.000047762540695384104,
  DAILY_RISK_FREE_RETURN: 0.00015965358745284597,
};

let finalData = [];

let adjCloseMarket;
let DAILY_MKT_RTN;

function calculateStockParameters(filename, cb) {
  const code = filename.split('.json')[0];
  const data = JSON.parse(fs.readFileSync(`${filePath}\\${filename}`, { encoding: 'utf-8' }))[0];
  const { adjclose } = data.indicators.adjclose[0];

  const dailyReturns = calcDailyReturns(adjclose);
  const avgReturn = averageReturn(dailyReturns);
  // const sigmaRi = stats.standardDeviation(dailyReturns.map());

  // Calcuting beta using linear regression
  const valX = [...dailyReturns];
  const valY = [...DAILY_MKT_RTN];
  if (valX.length > valY.length) {
    const extra = valX.length - valY.length;
    valX.splice(valX.length - extra, extra);
  } else {
    const extra = valY.length - valX.length;
    valY.splice(valY.length - extra, extra);
  }

  // const beta = leastSquareRegression(valY, valX);

  let beta = (avgReturn - constants.DAILY_RISK_FREE_RETURN) / (constants.MARKET_RETURN - constants.DAILY_RISK_FREE_RETURN);
  beta = 0.67 * beta + 0.33;

  const sigmaEpsilonSquared = (stats.standardDeviation(dailyReturns.map((x) => x - constants.DAILY_RISK_FREE_RETURN)) ** 2
    - (beta ** 2) * (stats.standardDeviation(DAILY_MKT_RTN.map((x) => x - constants.DAILY_RISK_FREE_RETURN))) ** 2);

  const expectedReturn = constants.DAILY_RISK_FREE_RETURN + beta * (constants.MARKET_RETURN - constants.DAILY_RISK_FREE_RETURN);

  const treynorRatio = (avgReturn - constants.ANNUAL_RISK_FREE_RETURN) / beta;

  const security = {
    // Name: stockInfo.name,
    code,
    'Average Return': avgReturn,
    // 'Std Dev (Sigma_Ri)': sigmaRi,
    beta,
    'Sigma Epsilon': sigmaEpsilonSquared,
    expectedReturn,
    'Treynor Ratio (TR)': treynorRatio,
  };

  finalData.push(security);
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
          finalData = finalData.filter((stock) => (stock.beta > 0));

          // Sorting the data in decreasing order based on Treynor's Ratio
          finalData.sort((a, b) => (a['Treynor Ratio (TR)'] > b['Treynor Ratio (TR)'] ? -1 : 1));

          for (let i = 0; i < finalData.length; i++) {
            let summNumerator = 0;
            let summDenominator = 0;
            const stock = finalData[i];
            for (let j = 0; j <= i; j++) {
              const tempStock = finalData[j];
              summNumerator += ((tempStock.expectedReturn - constants.ANNUAL_RISK_FREE_RETURN) * tempStock.beta) / ((tempStock['Sigma Epsilon']));
              summDenominator += (tempStock.beta ** 2) / ((tempStock['Sigma Epsilon']));
            }
            stock.Ci = ((constants.SIGMA_M ** 2) * summNumerator) / (1 + (constants.SIGMA_M ** 2) * summDenominator);
          }

          finalData.forEach((stock) => {
            stock.test = stock['Treynor Ratio (TR)'] > stock.Ci ? 'T' : 'F';
          });

          finalData = finalData.filter((stock) => stock.test === 'T');

          // Cutpoint will be last value of array as we have removed the other values and array is sorted
          const cStar = finalData[finalData.length - 1].Ci;
          let sumOfZi = 0;
          finalData.forEach((stock) => {
            stock.Zi = Math.abs((stock.beta / stock['Sigma Epsilon']) * (((stock.expectedReturn - constants.ANNUAL_RISK_FREE_RETURN) / stock.beta) - cStar));
            sumOfZi += stock.Zi;
          });

          finalData.forEach((stock) => {
            stock.Wi = parseFloat(((stock.Zi / sumOfZi) * 100).toPrecision(3));
          });

          const opts = { ...Object.keys(finalData[0]) };
          const csvData = parse(finalData, opts);
          fs.writeFileSync(`${__dirname}\\data\\final-data.csv`, csvData); // -${Date.now()}
          console.table(finalData, ['code', 'Average Return', 'expectedReturn', 'beta', 'Treynor Ratio (TR)', 'Ci', 'Zi', 'Wi']);
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
    console.table(constants);
    start();
  });
