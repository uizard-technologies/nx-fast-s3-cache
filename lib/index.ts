
import defaultTasksRunner from "@nrwl/workspace/tasks-runners/default";
import { S3Options } from "./runner-implementation";
import runnerSetup from "./runner-implementation";
import { createCustomRunner } from "./create-custom-runner";
export * from "./create-custom-runner";
export * from "./types/custom-runner-options";
export * from "./types/remote-cache-implementation";
export * from "./init-env";
export * from "./hash-suffix";
export * from "./get-file-name-from-hash";

const runner: typeof defaultTasksRunner =
  createCustomRunner<S3Options>(runnerSetup);

export default runner;
