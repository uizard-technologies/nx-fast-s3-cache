import { RemoteCache } from "@nrwl/workspace/src/tasks-runner/default-tasks-runner";
import path from "path";
import { getFileNameFromHash } from "./get-file-name-from-hash";
import { RemoteCacheImplementation } from "./types/remote-cache-implementation";

export const createRemoteCacheStore =
  (
    safeImplementation: Promise<RemoteCacheImplementation | null>
  ): RemoteCache["store"] =>
  async (hash, cacheDirectory) => {
    const implementation = await safeImplementation;

    if (!implementation) {
      return false;
    }

    const file = getFileNameFromHash(hash);
    const { storeFile } = implementation;

    await storeFile(path.join(cacheDirectory, file), hash);

    return true;
  };
