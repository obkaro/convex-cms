import { Infer } from "convex/values";

import { fieldTypeValidator } from "./schema";

export type FieldType = Infer<typeof fieldTypeValidator>;
