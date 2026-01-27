import { defineApp } from "convex/server";
import cms from "convex-cms/convex.config";

const app = defineApp();
app.use(cms);

export default app;
