const async = require('async');
const fs = require('fs');
const csv = require('csv-parser');
const { parse } = require('json2csv');

const {
  averageReturn,
  standardDeviation,
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

function calculateStockParameters(filename, cb) {
  const code = filename.split('.json')[0];
  const data = JSON.parse(fs.readFileSync(`${filePath}\\${filename}`, { encoding: 'utf-8' }))[0];
  const { adjclose } = data.indicators.adjclose[0];

  const avgReturn = averageReturn(adjclose);
  const sigmaRi = standardDeviation(adjclose);

  const slope = leastSquareRegression(adjCloseMarket, adjclose);
  const adjBeta = 0.67 * slope + 0.33;

  const expectedReturn = constants.RISK_FREE_RETURN + (adjBeta * (constants.MARKET_RETURN - constants.RISK_FREE_RETURN));

  const treynorRatio = (expectedReturn - constants.RISK_FREE_RETURN) / adjBeta;

  const sigmaEpsilon = Math.sqrt((sigmaRi ** 2) - ((adjBeta ** 2) * (constants.SIGMA_M ** 2)));

  // Calculating Ci
  let Ci;
  if (finalData.length > 0) {
    let summNumerator = 0;
    let summDenominator = 0;
    finalData.forEach((stock) => {
      summNumerator += ((stock['Expected Return E(Ri)'] - constants.RISK_FREE_RETURN) * stock['Adj Beta']) / (stock['Sigma Epsilon'] ** 2);
      summDenominator += (stock['Adj Beta'] ** 2) / (stock['Sigma Epsilon'] ** 2);
    });
    Ci = ((constants.SIGMA_M ** 2) * summNumerator) / (1 + (constants.SIGMA_M ** 2) * summDenominator);
  } else {
    // for first security in the array
    const numerator = ((constants.SIGMA_M ** 2) * (((expectedReturn - constants.RISK_FREE_RETURN) * adjBeta) / (sigmaEpsilon ** 2)));
    const denominator = (1 + (constants.SIGMA_M ** 2) * (adjBeta ** 2 / (sigmaEpsilon ** 2)));
    Ci = numerator / denominator;
  }

  const security = {
    // name: stock.name,
    code,
    'Average Return': avgReturn,
    'Std Dev (Sigma_Ri)': sigmaRi,
    'Raw Beta': slope,
    'Adj Beta': adjBeta,
    'Expected Return E(Ri)': expectedReturn,
    'Treynor Ratio (TR)': treynorRatio,
    'Sigma Epsilon': sigmaEpsilon,
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
          finalData = finalData.filter((stock) => stock['Adj Beta'] > 0);
          // Sorting the data in decreasing order based on Treynor's Ratio
          finalData.sort((a, b) => (a.TR > b.TR ? -1 : 1));
          const opts = { ...Object.keys(finalData[0]) };
          const csvData = parse(finalData, opts);
          fs.writeFileSync(`${__dirname}\\data\\final-data-${Date.now()}.csv`, csvData);
        } catch (err2) {
          console.error(err2);
        }

        console.log('All done!');
      });
  });
}

fs.createReadStream(`${__dirname}\\data\\market.csv`)
  .pipe(csv())
  .on('data', (data) => MARKET_DATA.push(data))
  .on('end', () => {
    adjCloseMarket = MARKET_DATA.map((item) => parseFloat(item['Adj Close']));
    constants.MARKET_RETURN = averageReturn(adjCloseMarket);
    constants.SIGMA_M = standardDeviation(adjCloseMarket);
    console.table(constants);
    start();
  });
