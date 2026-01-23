import { defineApp } from "convex/server";
import convexCms from "convex-cms/convex.config";

const app = defineApp();
app.use(convexCms);

export default app;
