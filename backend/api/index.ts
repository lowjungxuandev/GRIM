import "dotenv/config";
import { createApp } from "../src/app";
import { loadServerEnv } from "../src/libs/configs/env.config";
import { createProductionDependencies } from "../src/production";

const env = loadServerEnv();
const app = createApp(createProductionDependencies(env));

export default app;
