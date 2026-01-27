import { defineApp } from "convex/server";
import cms from "../../src/component/convex.config.js";

const app = defineApp();
app.use(cms);

export default app;
