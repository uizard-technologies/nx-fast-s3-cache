import { RemoteCache } from "@nx/workspace/src/tasks-runner/default-tasks-runner";
import fs from "fs";
import { join } from "path";
import { getFileNameFromHash } from "./get-file-name-from-hash";
import { RemoteCacheImplementation } from "./types/remote-cache-implementation";

const COMMIT_FILE_EXTENSION = ".commit";
const COMMIT_FILE_CONTENT = "true";

const writeCommitFile = (destination: string) => {
  const commitFilePath = destination + COMMIT_FILE_EXTENSION;
  return fs.writeFileSync(commitFilePath, COMMIT_FILE_CONTENT);
};

export const createRemoteCacheRetrieve =
  (
    safeImplementation: Promise<RemoteCacheImplementation | null>
  ): RemoteCache["retrieve"] =>
  async (hash, cacheDirectory) => {
    const implementation = await safeImplementation;

    if (!implementation) {
      return false;
    }

    const { fileExists, retrieveFile, writeOnly } = implementation;

    if (writeOnly) {
      // cannot retrieve from write-only cache
      return false;
    }

    const file = getFileNameFromHash(hash);
    const fileExistsRes = await fileExists(file);

    if (!fileExistsRes?.result) {
      return false;
    }

    const result = await retrieveFile(file, join(cacheDirectory, hash));
    const destination = result?.path;

    if (!destination) {
      return false;
    }

    await writeCommitFile(destination);

    return true;
  };
