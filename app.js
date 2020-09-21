const async = require('async');
const { exec } = require('child_process');

const commands = [
  'node get-stocks-data.js index',
  'node index-analysis.js',
  'node get-stocks-data.js portfolio',
  'node portfolio-analysis.js',
];

function execute(task, cb) {
  exec(task,
    { shell: 'cmd.exe' }, (error, stdout, stderr) => {
      if (error) {
        console.error(`FATAL ERROR: executing: ${task}`);
        process.exit(1);
      }
      console.log(stdout);
      console.error(stderr);
      console.log(`${task} completed successfully`);
      console.log('**************************************************\n\n');
      cb();
    });
}

async.eachSeries(commands,
  execute,
  (err) => {
    // if any of the file processing produced an error, err would equal that error
    if (err) {
      console.error(err);
      return;
    }
    console.log('***********************************');
    console.log('       All commands executed');
    console.log('***********************************');
  });
