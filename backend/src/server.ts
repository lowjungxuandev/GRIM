import "dotenv/config";
import { createApp } from "./app";
import { loadServerEnv } from "./libs/configs/env.config";
import { createProductionDependencies } from "./production";

const env = loadServerEnv();
const app = createApp(createProductionDependencies(env));

app.listen(env.PORT, () => {
  const baseUrl = `http://localhost:${env.PORT}`;
  console.log(`backend listening on ${baseUrl}`);
  console.log(`Scalar API docs UI: ${baseUrl}/docs`);
  console.log(`OpenAPI spec (YAML): ${baseUrl}/openapi.yaml`);

  if (env.SCALAR_DOCS_URL) {
    console.log(`Scalar-hosted API reference (optional): ${env.SCALAR_DOCS_URL}`);
  }
});
