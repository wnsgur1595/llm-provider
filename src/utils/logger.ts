import winston from "winston";
import chalk from "chalk";

const logLevel = process.env.LOG_LEVEL || "info";

const consoleFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} `;
  
  switch (level) {
    case "error":
      msg += chalk.red(`[ERROR]`);
      break;
    case "warn":
      msg += chalk.yellow(`[WARN]`);
      break;
    case "info":
      msg += chalk.blue(`[INFO]`);
      break;
    case "debug":
      msg += chalk.gray(`[DEBUG]`);
      break;
    default:
      msg += `[${level.toUpperCase()}]`;
  }
  
  msg += ` ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  return msg;
});

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat()
  ),
  transports: [
    new winston.transports.Console({
      format: consoleFormat
    }),
    new winston.transports.File({
      filename: "llm-provider.log",
      format: winston.format.json(),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});
