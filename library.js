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

const averageReturn = (dailyReturns) => {
  // Average Daily Return (ADR) = ((1+r1)(1+r2)(1+r3)(1+r4)…(1+rn))^(1/n) -1
  const avgDailyReturn = Math.pow(
    dailyReturns.reduce((acc, val) => (acc) * (1 + val), 1), 1 / (dailyReturns.length),
  ) - 1;

  // Average Return = (1+ADR)^(array.length) - 1
  let avgReturn = Math.pow(1 + avgDailyReturn, (dailyReturns.length)) - 1;
  avgReturn = Math.pow((1 + avgReturn), (1 / (dailyReturns.length / 252))) - 1;
  return avgReturn;
};

const average = (data) => {
  const sum = data.reduce((acc, value) => acc + value, 0);
  const avg = sum / data.length;
  return avg;
};

const standardDeviation = (values) => {
  const avg = average(values);

  const squareDiffs = values.map((value) => {
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
  const valX = [...values_x];
  const valY = [...values_y];

  if (valX.length === 0 || valY.length === 0) {
    return [[], []];
  }

  if (valX.length > valY.length) {
    const extra = valX.length - valY.length;
    valX.splice(valX.length - extra, extra);
  } else {
    const extra = valY.length - valX.length;
    valY.splice(valY.length - extra, extra);
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
  const values_length = valX.length;

  /*
   * Calculate the sum for each of the parts necessary.
   */
  for (let v = 0; v < values_length; v++) {
    x = valX[v];
    y = valY[v];
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
    x = valX[v];
    y = x * m + b;
    result_values_x.push(x);
    result_values_y.push(y);
  }

  return m;
};

module.exports = {
  averageReturn,
  calcDailyReturns,
  leastSquareRegression,
  standardDeviation,
};
