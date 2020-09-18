const async = require('async');
const fs = require('fs');
const csv = require('csv-parser');
const stats = require('simple-statistics');
const { parse } = require('json2csv');

const stocksInfo = require('./data/beta');

const {
  averageReturn,
  calcDailyReturns,
  leastSquareRegression,
} = require('./library');

const MARKET_DATA = [];

const filePath = `${__dirname}\\data\\securities`;

const constants = {
  MARKET_RETURN: 0.0,
  SIGMA_M: 0.0,
  RISK_FREE_RETURN: 0.06,
};

let finalData = [];

let adjCloseMarket;
let DAILY_MKT_RTN;

const getStockInfo = (code) => stocksInfo.find((s) => s.code === code);

function calculateStockParameters(filename, cb) {
  const code = filename.split('.json')[0];
  const data = JSON.parse(fs.readFileSync(`${filePath}\\${filename}`, { encoding: 'utf-8' }))[0];
  const { adjclose } = data.indicators.adjclose[0];

  const dailyReturns = calcDailyReturns(adjclose);
  const avgReturn = averageReturn(dailyReturns);
  const sigmaRi = stats.standardDeviation(dailyReturns);

  // Using beta from websites
  // const stockInfo = getStockInfo(code);

  // const [shortTermBeta, longTermBeta] = stockInfo['short term / long term beta'].split(' / ');
  // const beta = parseFloat(longTermBeta) === 0 ? parseFloat(shortTermBeta) : parseFloat(longTermBeta);

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
  if (code === 'RELIANCE' || code === 'BAJAJFINSV') {
    const d = [];
    for (let index = 0; index < valX.length; index++) {
      d.push({
        [code]: valX[index],
        Nifty: valY[index]
      });
    }
    const opts = { ...[`${code}`, 'Nifty'] };
    const csvData = parse(d, opts);
    fs.writeFileSync(`${__dirname}\\data\\${code}.csv`, csvData);
  }

  const { m: beta, b: intercept } = stats.linearRegression([valY, valX]);

  // const beta = leastSquareRegression(valY, valX);

  const treynorRatio = (avgReturn - constants.RISK_FREE_RETURN) / beta;

  const sigmaEpsilon = Math.sqrt((sigmaRi ** 2) - ((beta ** 2) * (constants.SIGMA_M ** 2)));

  // Calculating Ci
  let Ci;
  if (finalData.length > 0) {
    let summNumerator = 0;
    let summDenominator = 0;
    finalData.forEach((stock) => {
      summNumerator += ((stock['Average Return'] - constants.RISK_FREE_RETURN) * stock.beta) / (stock['Sigma Epsilon'] ** 2);
      summDenominator += (stock.beta ** 2) / (stock['Sigma Epsilon'] ** 2);
    });
    Ci = ((constants.SIGMA_M ** 2) * summNumerator) / (1 + (constants.SIGMA_M ** 2) * summDenominator);
  } else {
    // for first security in the array
    const numerator = ((constants.SIGMA_M ** 2) * (((avgReturn - constants.RISK_FREE_RETURN) * beta) / (sigmaEpsilon ** 2)));
    const denominator = (1 + (constants.SIGMA_M ** 2) * (beta ** 2 / (sigmaEpsilon ** 2)));
    Ci = numerator / denominator;
  }

  const security = {
    // Name: stockInfo.name,
    code,
    'Average Return': avgReturn,
    'Std Dev (Sigma_Ri)': sigmaRi,
    beta,
    'Sigma Epsilon': sigmaEpsilon,
    'Treynor Ratio (TR)': treynorRatio,
    Ci,
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
          // finalData = finalData.filter((stock) => stock.beta > 0);

          // Sorting the data in decreasing order based on Treynor's Ratio
          // finalData.sort((a, b) => (a['Treynor Ratio (TR)'] > b['Treynor Ratio (TR)'] ? -1 : 1));

          const opts = { ...Object.keys(finalData[0]) };
          const csvData = parse(finalData, opts);
          fs.writeFileSync(`${__dirname}\\data\\final-data-${Date.now()}.csv`, csvData);
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
