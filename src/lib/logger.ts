import chalk from "chalk";
import ora, { type Ora } from "ora";

export function success(msg: string): void {
  console.log(chalk.green("  " + msg));
}

export function info(msg: string): void {
  console.log(chalk.blue("  " + msg));
}

export function warn(msg: string): void {
  console.log(chalk.yellow("  " + msg));
}

export function error(msg: string): void {
  console.error(chalk.red("  " + msg));
}

export function dim(msg: string): void {
  console.log(chalk.dim("  " + msg));
}

export function label(key: string, value: string): void {
  console.log(`  ${chalk.bold(key)}  ${value}`);
}

export function header(msg: string): void {
  console.log();
  console.log(chalk.bold(msg));
}

export function spinner(msg: string): Ora {
  return ora({ text: msg, indent: 2 }).start();
}

export function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 8) + "..." + key.slice(-4);
}
