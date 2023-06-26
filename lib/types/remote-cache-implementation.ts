export interface RemoteCacheImplementation {
  /**
   * Stores the file on the remote cache.
   * @param filename Filename of the file..
   * @param data Buffer of the data that will be stored on the remote cache.
   */
  storeFile: (
    filename: string,
    folderToArchive: string
  ) => Promise<{
    path: string | null;
    timings: Record<string, number>;
  } | null>;
  /**
   * Checks whether a file exists on the remote cache.
   * @param filename Filename of the file.
   * @returns `true` if the file exists, `false` if not.
   */
  fileExists: (
    filename: string
  ) => Promise<{ result: boolean; timings?: Record<string, number> } | null>;
  /**
   * Retrieves a file from the remote cache.
   * @param filename Filename of the file.
   * @returns The path to the file that was retrieved
   */
  retrieveFile: (
    file: string,
    destination: string
  ) => Promise<{
    path: string | null;
    timings: Record<string, number>;
  } | null>;
  /**
   * A name to identify your remote cache.
   * Mainly used for console logging. So please use a pretty string.
   * @example `name: 'My Beautiful Cache'`
   */
  name: string;
}
