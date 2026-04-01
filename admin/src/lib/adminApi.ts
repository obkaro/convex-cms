import type { CmsAdminApi } from "../embed/contexts/ApiContext";

const fnSymbol = Symbol.for("functionName");

function createApiProxy(prefix: string): CmsAdminApi {
	return new Proxy({} as CmsAdminApi, {
		get(_, prop: string) {
			return { [fnSymbol]: `${prefix}:${prop}` };
		},
	});
}

export const adminApi = createApiProxy("admin");
