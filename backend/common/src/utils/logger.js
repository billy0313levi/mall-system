function formatArgs(args) {
  return args.map((item) => (item instanceof Error ? item.stack || item.message : item));
}

module.exports = {
  info(message, ...args) {
    console.log(new Date().toISOString(), '[INFO]', message, ...formatArgs(args));
  },
  warn(message, ...args) {
    console.warn(new Date().toISOString(), '[WARN]', message, ...formatArgs(args));
  },
  error(message, ...args) {
    console.error(new Date().toISOString(), '[ERROR]', message, ...formatArgs(args));
  }
};

