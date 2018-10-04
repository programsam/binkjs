const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

function makeLogger(incomingLabel) {
  var theFormat = combine(
    label({label: incomingLabel}),
    timestamp(),
    printf(info => {
      return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
    })
  );

  return createLogger({
    format: theFormat,
    transports: [new transports.Console()]
  });
}


module.exports = makeLogger;
