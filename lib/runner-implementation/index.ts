import fs from "fs";
import path from "path";
import { initEnv } from "../init-env";
import { CustomRunnerOptions } from "../types/custom-runner-options";
import { RemoteCacheImplementation } from "../types/remote-cache-implementation";
import { downloadFromS3 } from "./download";
import { buildS3Client } from "./s3-client";
import { uploadToS3 } from "./upload";
import { buildCommonCommandInput, isReadOnly } from "./util";
import { spawn } from "child_process";

const extractFolder = async (zipFilePath: string, destination: string) => {
  await fs.mkdirSync(destination, { recursive: true });

  await new Promise((res, rej) => {
    const args = ["xf", zipFilePath, "--strip", "1"];
    const spawnedProcess = spawn("/usr/bin/tar", args, { cwd: destination });

    spawnedProcess.stdout.on("data", (data) => {
      process.stdout.write(data.toString());
    });

    spawnedProcess.stderr.on("data", (data) => {
      process.stderr.write(data.toString());
    });

    spawnedProcess.on("exit", (code) => {
      if (code !== 0) {
        rej(`Non zero exit code: ${code}`);
      } else {
        res({ code });
      }
    });
  });
};

const archiveFolder = async ({
  folder,
  destinationFile,
}: {
  folder: string;
  destinationFile: string;
}): Promise<string> => {
  await new Promise((res, rej) => {
    const args = [
      "--use-compress-program=pigz",
      "-cf",
      path.basename(destinationFile),
      folder,
    ];

    const spawnedProcess = spawn("/usr/bin/tar", args, {
      cwd: path.dirname(destinationFile),
    });

    spawnedProcess.stdout.on("data", (data) => {
      process.stdout.write(data.toString());
    });

    spawnedProcess.stderr.on("data", (data) => {
      process.stderr.write(data.toString());
    });

    spawnedProcess.on("exit", (code) => {
      if (code !== 0) {
        rej(`Non zero exit code: ${code}`);
      } else {
        res({ code });
      }
    });
  });

  return destinationFile;
};

export interface S3Options {
  bucket?: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  prefix?: string;
  profile?: string;
  readOnly?: boolean;
  region?: string;
}

const ENV_BUCKET = "NXCACHE_S3_BUCKET";
const ENV_PREFIX = "NXCACHE_S3_PREFIX";
const ENV_READ_ONLY = "NXCACHE_S3_READ_ONLY";

export default async (options: CustomRunnerOptions<S3Options>) => {
  initEnv(options);

  const s3Client = buildS3Client(options);

  const bucket = process.env[ENV_BUCKET] ?? options.bucket;
  const prefix = process.env[ENV_PREFIX] ?? options.prefix ?? "";
  const readOnly = isReadOnly(options, ENV_READ_ONLY);

  const config: RemoteCacheImplementation = {
    name: "S3",
    fileExists: async (filename: string) => {
      try {
        const result = await s3Client.headObject(
          buildCommonCommandInput({ bucket, prefix, filename })
        );
        return { result: !!result };
      } catch (error) {
        if (
          (error as Error).name === "403" ||
          (error as Error).name === "NotFound"
        ) {
          return { result: false };
        } else {
          throw error;
        }
      }
    },
    retrieveFile: async (file: string, destination: string) => {
      const tmpFolder = fs.mkdtempSync("/tmp/nx-cache-");
      const tmpFile = path.join(tmpFolder, path.basename(file));
      const timings = { download: 0, extract: 0 };

      timings.download = Date.now();
      await downloadFromS3({
        ...buildCommonCommandInput({ bucket, prefix, filename: file }),
        s3Client,
        savePath: tmpFile,
      });
      timings.download = Date.now() - timings.download;

      timings.extract = Date.now();
      await extractFolder(tmpFile, destination);
      timings.extract = Date.now() - timings.extract;

      fs.rmdir(tmpFolder, { recursive: true }, () => {});

      return { path: destination, timings };
    },
    storeFile: async (filename: string, folderToArchive: string) => {
      if (readOnly) {
        throw new Error("ReadOnly storage, cannot store file");
      }

      const timings = { compress: 0, upload: 0 };

      timings.compress = Date.now();
      await archiveFolder({
        folder: folderToArchive,
        destinationFile: filename,
      });
      timings.compress = Date.now() - timings.compress;

      timings.upload = Date.now();
      await uploadToS3({
        ...buildCommonCommandInput({
          bucket,
          prefix,
          filename: path.basename(filename),
        }),
        s3Client,
        filePath: filename,
      });
      timings.upload = Date.now() - timings.upload;

      return { path: filename, timings };
    },
  };

  return config;
};
