// https://docs.aws.amazon.com/AmazonS3/latest/userguide/example_s3_Scenario_UsingLargeFiles_section.html

import fs from "fs";
import path from "path";
import { GetObjectCommand, HeadObjectCommand, S3 } from "@aws-sdk/client-s3";
import { Promise as Bluebird } from "bluebird";
import { createWriteStream } from "fs";

const oneMB = 1024 * 1024;
const chunkSize = oneMB * 10;

/**
 * massively parallel download ranges from s3
 * speedy, optimized for large files
 */
export const downloadFromS3 = async ({
  s3Client,
  Bucket,
  Key,
  savePath,
}: {
  s3Client: S3;
  Bucket: string;
  Key: string;
  savePath: string;
}) => {
  const headObject = ({ bucket, key }: { bucket: string; key: string }) => {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    return s3Client.send(command);
  };

  const getObjectRange = ({
    bucket,
    key,
    start,
    end,
  }: {
    bucket: string;
    key: string;
    start: number;
    end: number;
  }) => {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      Range: `bytes=${start}-${end}`,
    });

    return s3Client.send(command);
  };

  fs.mkdirSync(path.dirname(savePath), { recursive: true });

  const writeStream = createWriteStream(savePath).on("error", (err) => {
    throw new Error(`Could not write to ${savePath}: ${err.message}`);
  });

  const { ContentLength: length } = await headObject({
    bucket: Bucket,
    key: Key,
  });
  if (!length) {
    throw new Error(`Object ${Key} does not exist in bucket ${Bucket}`);
  }

  const numberOfChunks = Math.ceil(length / chunkSize);

  let chunkIndexOrder = 0;

  await Bluebird.map(
    Array.from({ length: numberOfChunks }, (_, i) => i),
    async (i) => {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize - 1, length - 1);
      const { Body } = await getObjectRange({
        bucket: Bucket,
        key: Key,
        start,
        end,
      });

      if (Body === undefined) {
        return;
      }
      const byteArray = await Body.transformToByteArray();

      while (chunkIndexOrder !== i) {
        await Bluebird.delay(100);
      }

      writeStream.write(byteArray);
      chunkIndexOrder++;
    },
    // up to Gigabit
    { concurrency: 100 }
  );
};
