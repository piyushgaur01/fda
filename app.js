const async = require('async');
const fs = require('fs');
const csv = require('csv-parser');
const { parse } = require('json2csv');

const {
  averageReturn,
  standardDeviation,
  leastSquareRegression,
} = require('./library');

const RISK_FREE_RETURN = 0.06;
const EXPECTED_MARKET_RETURN = 0.1;
let MARKET_RETURN;

const filePath = `${__dirname}\\data\\securities`;
const market = [];
const finalData = [];

let adjCloseMarket;

function calculateStockParameters(filename, cb) {
  const code = filename.split('.json')[0];
  const data = JSON.parse(fs.readFileSync(`${filePath}\\${filename}`, { encoding: 'utf-8' }))[0];
  const { adjclose } = data.indicators.adjclose[0];

  const avgReturn = averageReturn(adjclose);
  const stdDevDailyReturn = standardDeviation(adjclose);

  // const slope = leastSquareRegression(adjclose, adjCloseMarket);
  const slope = leastSquareRegression(adjCloseMarket, adjclose);
  const adjBeta = 0.67 * slope + 0.33;

  const treynorRatio = (avgReturn - RISK_FREE_RETURN) / adjBeta;

  const security = {
    // name: stock.name,
    code,
    'Average Return': avgReturn,
    'Std Dev': stdDevDailyReturn,
    'Raw Beta': slope,
    'Adj Beta': adjBeta,
    TR: treynorRatio,
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
          const opts = { ...Object.keys(finalData[0]) };
          const csvData = parse(finalData, opts);
          fs.writeFileSync(`${__dirname}\\data\\final-data.csv`, csvData);
        } catch (err2) {
          console.error(err2);
        }

        console.log('All done!');
      });
  });
}

fs.createReadStream(`${__dirname}\\data\\market.csv`)
  .pipe(csv())
  .on('data', (data) => market.push(data))
  .on('end', () => {
    adjCloseMarket = market.map((item) => parseFloat(item['Adj Close']));
    MARKET_RETURN = averageReturn(adjCloseMarket);
    const stdDevMarket = standardDeviation(adjCloseMarket);
    console.log(`Market Return: ${MARKET_RETURN}`);
    console.log(`Market Std Dev: ${stdDevMarket}`);
    start();
  });
