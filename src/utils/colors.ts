/**
 * Terminal color utility using Bun's native color functionality
 * Replacement for picocolors library
 */

// Define common colors for terminal output
type ColorFunction = (text: string) => string;

const wrapColor = (colorValue: string): ColorFunction => {
  return (text: string) => {
    const ansi = Bun.color(colorValue, "ansi");
    return ansi ? `${ansi}${text}\x1b[0m` : text;
  };
};

const colors = {
  // Basic colors
  red: wrapColor("#ff0000"),
  green: wrapColor("#00aa00"),
  blue: wrapColor("#0000ff"),
  yellow: wrapColor("#ffbb00"),
  magenta: wrapColor("#ff00ff"),
  cyan: wrapColor("#00aaaa"),
  white: wrapColor("#ffffff"),
  black: wrapColor("#000000"),
  gray: wrapColor("#888888"),
  grey: wrapColor("#888888"),
  
  // Bright variants
  redBright: wrapColor("#ff5555"),
  greenBright: wrapColor("#55ff55"),
  blueBright: wrapColor("#5555ff"),
  yellowBright: wrapColor("#ffff55"),
  magentaBright: wrapColor("#ff55ff"),
  cyanBright: wrapColor("#55ffff"),
  whiteBright: wrapColor("#ffffff"),
  
  // Text styles
  bold: (text: string) => `\x1b[1m${text}\x1b[22m`,
  italic: (text: string) => `\x1b[3m${text}\x1b[23m`,
  underline: (text: string) => `\x1b[4m${text}\x1b[24m`,
  dim: (text: string) => `\x1b[2m${text}\x1b[22m`,
  
  // Background colors
  bgRed: wrapColor("bg-#ff0000"),
  bgGreen: wrapColor("bg-#00aa00"),
  bgBlue: wrapColor("bg-#0000ff"),
  bgYellow: wrapColor("bg-#ffbb00"),
  bgMagenta: wrapColor("bg-#ff00ff"),
  bgCyan: wrapColor("bg-#00aaaa"),
  bgWhite: wrapColor("bg-#ffffff"),
  bgBlack: wrapColor("bg-#000000"),
};

export default colors;