import * as log from "./log";
import { CustomRunnerOptions } from "./types/custom-runner-options";
import { RemoteCacheImplementation } from "./types/remote-cache-implementation";

const attachLogsToFileOperation =
  <
    T extends { timings?: Record<string, number> },
    OtherArgs extends unknown[]
  >({
    operation,
    success,
    failure,
    verbose,
    silent,
  }: {
    operation: (filename: string, ...args: OtherArgs) => Promise<T | null>;
    success?: (filename: string, timings?: Record<string, number>) => void;
    failure: (filename: string, error: unknown) => void;
    verbose: boolean;
    silent: boolean;
  }): ((filename: string, ...args: OtherArgs) => Promise<T | null>) =>
  async (filename, ...args) => {
    try {
      const result = await operation(filename, ...args);

      if (!silent) {
        success?.(filename, result?.timings);
      }

      return result;
    } catch (error) {
      failure(filename, error);

      if (verbose) {
        console.error(error);
      }

      return null;
    }
  };

export const getSafeRemoteCacheImplementation = async (
  implementationPromise: Promise<RemoteCacheImplementation>,
  options: CustomRunnerOptions
): Promise<RemoteCacheImplementation | null> => {
  const verbose = !!options.verbose;
  const silent = !!options.silent;

  try {
    const implementation = await implementationPromise;
    const { fileExists, storeFile, retrieveFile } = implementation;
    const name =
      process.env.NXCACHE_NAME || options.name || implementation.name;

    return {
      name,
      retrieveFile: attachLogsToFileOperation({
        operation: retrieveFile,
        success: (filename, timings) =>
          log.retrieveSuccess(implementation, filename, timings),
        failure: (filename, error) =>
          log.retrieveFailure(implementation, filename, error),
        verbose,
        silent,
      }),
      storeFile: attachLogsToFileOperation({
        operation: storeFile,
        success: (filename, timings) =>
          log.storeSuccess(implementation, filename, timings),
        failure: (filename, error) =>
          log.storeFailure(implementation, filename, error),
        verbose,
        silent,
      }),
      fileExists: attachLogsToFileOperation({
        operation: fileExists,
        failure: (filename, error) =>
          log.checkFailure(implementation, filename, error),
        verbose,
        silent,
      }),
    };
  } catch (error) {
    log.setupFailure(error);

    if (verbose) {
      console.error(error);
    }

    return null;
  }
};
