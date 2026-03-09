const SVG_NUMBER_REGEX = /^-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i;
const SVG_TOKEN_REGEX = /[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g;
const SVG_ALLOWED_CHARS_REGEX = /^[0-9eE+\-.,\sMmLlHhVvCcSsQqTtAaZz]*$/;

const SVG_COMMAND_ARG_COUNTS: Record<string, number> = {
  M: 2,
  m: 2,
  L: 2,
  l: 2,
  H: 1,
  h: 1,
  V: 1,
  v: 1,
  C: 6,
  c: 6,
  S: 4,
  s: 4,
  Q: 4,
  q: 4,
  T: 2,
  t: 2,
  A: 7,
  a: 7,
  Z: 0,
  z: 0,
};

const isSvgCommandToken = (token: string) =>
  Object.prototype.hasOwnProperty.call(SVG_COMMAND_ARG_COUNTS, token);

const normalizeSvgPathData = (pathData: string) =>
  pathData
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const validateSvgPathTokens = (tokens: string[]) => {
  if (!tokens.length || !isSvgCommandToken(tokens[0])) {
    return false;
  }

  let currentCommand: string | null = null;
  let expectedArgs = 0;
  let consumedArgs = 0;
  let firstMoveSegment = false;

  for (const token of tokens) {
    if (isSvgCommandToken(token)) {
      if (currentCommand && expectedArgs > 0 && consumedArgs !== 0) {
        return false;
      }

      currentCommand = token;
      expectedArgs = SVG_COMMAND_ARG_COUNTS[token];
      consumedArgs = 0;
      firstMoveSegment = token === "M" || token === "m";
      continue;
    }

    if (!currentCommand || expectedArgs === 0 || !SVG_NUMBER_REGEX.test(token)) {
      return false;
    }

    const parsedValue = Number(token);
    if (!Number.isFinite(parsedValue)) {
      return false;
    }

    consumedArgs += 1;
    if (consumedArgs === expectedArgs) {
      consumedArgs = 0;

      if (firstMoveSegment) {
        currentCommand = currentCommand === "M" ? "L" : "l";
        expectedArgs = SVG_COMMAND_ARG_COUNTS[currentCommand];
        firstMoveSegment = false;
      }
    }
  }

  return consumedArgs === 0;
};

export const sanitizeSvgPathData = (
  pathData: string,
  maxLength = 320000,
): string | null => {
  if (typeof pathData !== "string") {
    return null;
  }

  const normalizedPath = normalizeSvgPathData(pathData);
  if (!normalizedPath || normalizedPath.length > maxLength) {
    return null;
  }

  if (!SVG_ALLOWED_CHARS_REGEX.test(normalizedPath)) {
    return null;
  }

  const tokens = normalizedPath.match(SVG_TOKEN_REGEX);
  if (!tokens || tokens.length === 0) {
    return null;
  }

  const unmatchedText = normalizedPath
    .replace(SVG_TOKEN_REGEX, "")
    .replace(/\s+/g, "");
  if (unmatchedText.length > 0) {
    return null;
  }

  return validateSvgPathTokens(tokens) ? normalizedPath : null;
};

