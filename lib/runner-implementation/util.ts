import type { S3Options } from ".";
import { CustomRunnerOptions } from "../types/custom-runner-options";

export const buildCommonCommandInput = ({
  bucket,
  prefix,
  filename,
}: {
  bucket: string | undefined;
  prefix: string;
  filename: string;
}) => ({
  /* eslint-disable @typescript-eslint/naming-convention */
  Bucket: bucket || "",
  Key: `${prefix}${filename}`,
  /* eslint-enable @typescript-eslint/naming-convention */
});

export const isReadOnly = (
  options: CustomRunnerOptions<S3Options>,
  envReadOnly: string
) => {
  if (typeof process.env[envReadOnly] !== "undefined") {
    if (process.env[envReadOnly]?.toLowerCase() === "true") return true;
    if (process.env[envReadOnly]?.toLowerCase() === "false") return false;
  }
  return options.readOnly ?? false;
};
