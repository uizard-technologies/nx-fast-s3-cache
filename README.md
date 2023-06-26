# @uizard/nx-fast-s3-cache

## Why?

Popular caching libraries prioritize portability over speed, but this prevents Nx users from caching humongous folders, like `node_modules`. This module prioritizes speed over anything else:

1. Uses GNU `tar` with `pigz` for native, multithreaded compression, instead of using the npm tar package.
2. Uses multipart uploads and downloads for larger files when communicating with S3

## Requirements

The default Linux Github Actions runners already comply with the following requirements:

1. GNU `tar` (or compatible) executable at `/usr/bin/tar`
2. The `pigz` executable should be in `PATH` so `tar` can find it

## Installation

```bash
npm install @uizard/nx-fast-s3-cache --save-dev
```


## Configuration

| Parameter        | Description                                                                                                                                           | Environment Variable / .env   | `nx.json`        |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------- |
| Endpoint         | Optional. The fully qualified endpoint of the webservice. This is only required when using a custom (non-AWS) endpoint.                               | `NXCACHE_S3_ENDPOINT`         | `endpoint`       |
| Bucket           | Optional. Specify which bucket should be used for storing the cache.                                                                                  | `NXCACHE_S3_BUCKET`           | `bucket`         |
| Prefix           | Optional. Specify prefix path of target object key.                                                                                                   | `NXCACHE_S3_PREFIX`           | `prefix`         |
| Region           | Optional. The AWS region to which this client will send requests.                                                                                     | `NXCACHE_S3_REGION`           | `region`         |
| Profile          | Optional. The AWS profile to use to authenticate.                                                                                                     | `NXCACHE_S3_PROFILE`          | `profile`        |
| Force Path Style | Optional. Whether to force path style URLs for S3 objects (e.g., `https://s3.amazonaws.com/<bucket>/` instead of `https://<bucket>.s3.amazonaws.com/` | `NXCACHE_S3_FORCE_PATH_STYLE` | `forcePathStyle` |
| Read Only        | Optional. Disable writing cache to the S3 bucket. This may be useful if you only want to write to the cache from a CI but not localhost.              | `NXCACHE_S3_READ_ONLY`        | `readOnly`       |

`nx.json`:
```json
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "@uizard/nx-fast-s3-cache",
      "options": {
        "cacheableOperations": ["build", "test", "lint", "e2e"],
        "endpoint": "https://some-endpoint.com",
        "bucket": "name-of-bucket",
        "prefix": "prefix/",
        "region": "us-west-000",
        "profile": "name-of-aws-profile",
        "forcePathStyle": true,
        "readOnly": false
      }
    }
  }
}
```

Authentication is handled by [@aws-sdk/credential-provider-node](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/modules/_aws_sdk_credential_provider_node.html), so credentials will be attempted to be found from the following sources (listed in order of precedence):

- Environment variables exposed via process.env (example: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
- SSO credentials from token cache
- Web identity token credentials
- Shared credentials and config ini files
- The EC2/ECS Instance Metadata Service


## Usage

Running tasks should now show the storage or retrieval from the remote cache, with additional information on the duration of each step:

```
------------------------------------------------------------------------------
Stored to remote cache: S3 (total:13163ms/compress:10104ms/upload:3059ms)
File: d5b82b049e031a312104d3f196f459a6c551c5e1a4a510c1f8a9bfe0f391d998.tar.gz
------------------------------------------------------------------------------

```



## Credits

This package couldn't depend on the packages it got inspiration from because of their hardcoded dependencies to npm `tar` or their simple (non-multipart) communication with s3. Still, we have to recognize that most of the code of this package (including this README) comes from these 2 npm packages:

1. [nx-remotecache-custom](https://www.npmjs.com/package/nx-remotecache-custom)
2. [@pellegrims/nx-remotecache-s3](https://www.npmjs.com/package/@pellegrims/nx-remotecache-s3)
