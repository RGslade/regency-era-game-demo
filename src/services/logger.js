const APP_LOG_PREFIX = '[Regency Era Game]';

const normalizeStack = (stack) => {
  if (!stack) {
    return undefined;
  }
  const filteredStack = String(stack)
    .split('\n')
    .filter((line) => !line.includes('InternalBytecode.js'))
    .join('\n');
  return filteredStack || undefined;
};

const normalizeError = (error) => {
  if (!error) {
    return null;
  }
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: normalizeStack(error.stack),
      cause: normalizeError(error.cause),
    };
  }
  if (typeof error === 'object') {
    return {
      message: error.message || String(error),
      code: error.code,
      stack: normalizeStack(error.stack),
      details: error,
    };
  }
  return { message: String(error) };
};

const writeLog = (level, message, details = {}) => {
  const payload = {
    time: new Date().toISOString(),
    level,
    message,
    ...details,
  };
  const formattedMessage = `${APP_LOG_PREFIX} ${level.toUpperCase()}: ${message}`;

  if (level === 'error') {
    console.error(formattedMessage, payload);
    return;
  }
  if (level === 'warn') {
    console.warn(formattedMessage, payload);
    return;
  }
  console.info(formattedMessage, payload);
};

export const logInfo = (message, context = {}) => {
  writeLog('info', message, { context });
};

export const logWarn = (message, context = {}) => {
  writeLog('warn', message, { context });
};

export const logError = (message, error, context = {}) => {
  writeLog('error', message, {
    error: normalizeError(error),
    context,
  });
};

export const buildUserErrorMessage = (fallbackMessage, error) => {
  const message = error?.message ? ` Details: ${error.message}` : '';
  return `${fallbackMessage}${message}`;
};

export const registerGlobalErrorLogger = () => {
  const errorUtils = globalThis.ErrorUtils;
  if (!errorUtils?.getGlobalHandler || !errorUtils?.setGlobalHandler) {
    return undefined;
  }

  const previousHandler = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    logError('Unhandled JavaScript error', error, { isFatal });
    previousHandler?.(error, isFatal);
  });

  return () => {
    errorUtils.setGlobalHandler(previousHandler);
  };
};
