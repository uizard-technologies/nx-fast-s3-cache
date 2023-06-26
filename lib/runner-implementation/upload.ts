import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  S3,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Promise as Bluebird } from "bluebird";
import fs from "fs";

const oneMB = 1024 * 1024;
// Multipart uploads require a minimum size of 5 MB per part.
const chunkSize = oneMB * 7;

const readPartOfFile = ({
  filePath,
  start,
  end,
}: {
  filePath: string;
  start: number;
  end: number;
}) =>
  new Promise<Buffer>((res, rej) => {
    const buffers: Buffer[] = [];
    const stream = fs.createReadStream(filePath, { start, end });

    stream.on("data", (chunk: Buffer) => buffers.push(chunk));
    stream.on("error", rej);
    stream.on("end", () => res(Buffer.concat(buffers)));
  });

export const uploadToS3 = async ({
  s3Client,
  Bucket,
  Key,
  filePath,
}: {
  s3Client: S3;
  Bucket: string;
  Key: string;
  filePath: string;
}) => {
  const { size: fileSize } = fs.statSync(filePath);

  let multipartUploadId: string | undefined = "";

  try {
    const numberOfChunks = Math.ceil(fileSize / chunkSize);

    if (numberOfChunks === 1) {
      // no reason to do a multipart upload

      const fileContent = await new Promise<Buffer>((res, rej) =>
        fs.readFile(filePath, (err, data) => (err ? rej(err) : res(data)))
      );

      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket,
          Key,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          Body: fileContent,
        },
      });

      return upload.done();
    }

    const multipartUpload = await s3Client.send(
      new CreateMultipartUploadCommand({
        Bucket: Bucket,
        Key: Key,
      })
    );

    multipartUploadId = multipartUpload.UploadId;

    const uploadResults = await Bluebird.map(
      Array.from({ length: numberOfChunks }, (_, i) => i),
      async (i) => {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize - 1, fileSize - 1);

        const result = await s3Client.send(
          new UploadPartCommand({
            Bucket,
            Key,
            UploadId: multipartUploadId,
            Body: await readPartOfFile({ filePath, start, end }),
            PartNumber: i + 1,
          })
        );
        return result;
      },
      { concurrency: 30 }
    );

    return await s3Client.send(
      new CompleteMultipartUploadCommand({
        Bucket,
        Key,
        UploadId: multipartUploadId,
        MultipartUpload: {
          Parts: uploadResults.map(({ ETag }, i) => ({
            ETag,
            PartNumber: i + 1,
          })),
        },
      })
    );
  } catch (err) {
    if (multipartUploadId) {
      const abortCommand = new AbortMultipartUploadCommand({
        Bucket,
        Key,
        UploadId: multipartUploadId,
      });

      await s3Client.send(abortCommand);
    }

    throw err;
  }
};
