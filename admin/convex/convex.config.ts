import { defineApp } from "convex/server";
import convexCms from "../../src/component/convex.config.js";

const app = defineApp();
app.use(convexCms);

export default app;
