const calcDailyReturns = (array) => {
  const dailyReturns = [];
  // eslint-disable-next-line no-plusplus
  for (let index = 1; index < array.length; index++) {
    const prev = array[index - 1];
    const curr = array[index];
    const ri = (curr - prev) / prev;
    dailyReturns.push(ri);
  }
  return dailyReturns;
};

const averageReturn = (array) => {
  const dailyReturns = calcDailyReturns(array);

  // Average Daily Return (ADR) = ((1+r1)(1+r2)(1+r3)(1+r4)…(1+rn))^(1/n) -1
  const avgDailyReturn = Math.pow(
    dailyReturns.reduce((acc, val) => (acc) * (1 + val), 1), 1 / (dailyReturns.length),
  ) - 1;

  // Average Return = (1+ADR)^(array.length) - 1
  const avgReturn = Math.pow(1 + avgDailyReturn, dailyReturns.length) - 1;
  return avgReturn;
};

const average = (data) => {
  const sum = data.reduce((acc, value) => acc + value, 0);
  const avg = sum / data.length;
  return avg;
};

const standardDeviation = (values) => {
  const dailyReturns = calcDailyReturns(values);
  const avg = average(dailyReturns);

  const squareDiffs = dailyReturns.map((value) => {
    const diff = value - avg;
    const sqrDiff = diff * diff;
    return sqrDiff;
  });

  const avgSquareDiff = average(squareDiffs);
  let stdDev = Math.sqrt(avgSquareDiff);
  stdDev *= Math.sqrt(stdDev);
  return stdDev;
};

const leastSquareRegression = (values_x, values_y) => {
  /*
   * Nothing to do.
   */
  if (values_x.length === 0 || values_y.length === 0) {
    return [[], []];
  }

  if (values_x.length > values_y.length) {
    const extra = values_x.length - values_y.length;
    values_x.splice(values_x.length - extra, extra);
  } else {
    const extra = values_y.length - values_x.length;
    values_y.splice(values_y.length - extra, extra);
  }
  let sum_x = 0;
  let sum_y = 0;
  let sum_xy = 0;
  let sum_xx = 0;
  let count = 0;

  /*
   * We'll use those variables for faster read/write access.
   */
  let x = 0;
  let y = 0;
  const values_length = values_x.length;

  /*
   * Calculate the sum for each of the parts necessary.
   */
  for (let v = 0; v < values_length; v++) {
    x = values_x[v];
    y = values_y[v];
    sum_x += x;
    sum_y += y;
    sum_xx += x * x;
    sum_xy += x * y;
    count++;
  }

  /*
   * Calculate m and b for the formular:
   * y = x * m + b
   */
  const m = (count * sum_xy - sum_x * sum_y) / (count * sum_xx - sum_x * sum_x);
  const b = (sum_y / count) - (m * sum_x) / count;

  /*
   * We will make the x and y result line now
   */
  const result_values_x = [];
  const result_values_y = [];

  for (let v = 0; v < values_length; v++) {
    x = values_x[v];
    y = x * m + b;
    result_values_x.push(x);
    result_values_y.push(y);
  }

  return m;
};

const calcStockBeta = () => {

};

module.exports = {
  averageReturn,
  calcDailyReturns,
  calcStockBeta,
  leastSquareRegression,
  standardDeviation,
};
