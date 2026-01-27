/**
 * Schema Drift Warning Component
 *
 * Displays a warning banner when code-defined content types
 * are out of sync with the database schema.
 */

import { useQuery, useMutation } from "convex/react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { AlertTriangle, RefreshCw, XCircle, AlertCircle } from "lucide-react";
import type { CmsAdminApi } from "~/embed/contexts/ApiContext";
import { useState } from "react";

interface DriftIssue {
	type: string;
	severity: "error" | "warning" | "info";
	contentTypeName: string;
	fieldName?: string;
	message: string;
}

interface SchemaDriftWarningProps {
	api: CmsAdminApi;
}

export function SchemaDriftWarning({ api }: SchemaDriftWarningProps) {
	const driftResults = useQuery(api.checkSchemaDrift, {});
	const syncMutation = useMutation(api.syncCodeDefinedTypes);
	const [isSyncing, setIsSyncing] = useState(false);
	const [syncResult, setSyncResult] = useState<{
		created: number;
		updated: number;
	} | null>(null);

	if (driftResults === undefined) {
		return null;
	}

	if (!driftResults || driftResults.length === 0) {
		if (syncResult && (syncResult.created > 0 || syncResult.updated > 0)) {
			return (
				<Alert className="border-success/50 bg-success/10">
					<AlertCircle className="size-4 text-success" />
					<AlertTitle className="text-diff-added-foreground">
						Sync Complete
					</AlertTitle>
					<AlertDescription className="text-diff-added-foreground/80">
						{syncResult.created > 0 && (
							<span>{syncResult.created} content type(s) created. </span>
						)}
						{syncResult.updated > 0 && (
							<span>{syncResult.updated} content type(s) updated.</span>
						)}
					</AlertDescription>
				</Alert>
			);
		}
		return null;
	}

	const errors = driftResults.filter((d: DriftIssue) => d.severity === "error");
	const warnings = driftResults.filter((d: DriftIssue) => d.severity === "warning");

	const handleSync = async () => {
		setIsSyncing(true);
		setSyncResult(null);
		try {
			const result = await syncMutation({});
			setSyncResult(result);
		} catch (error) {
			console.error("Sync failed:", error);
		} finally {
			setIsSyncing(false);
		}
	};

	const variant = errors.length > 0 ? "destructive" : "default";
	const Icon = errors.length > 0 ? XCircle : AlertTriangle;
	const iconColor =
		errors.length > 0 ? "text-destructive" : "text-warning";

	return (
		<Alert variant={variant} className={errors.length === 0 ? "border-warning/50 bg-warning/10" : ""}>
			<Icon className={`size-4 ${iconColor}`} />
			<AlertTitle className={errors.length === 0 ? "text-diff-modified-foreground" : ""}>
				Schema Drift Detected
			</AlertTitle>
			<AlertDescription className={errors.length === 0 ? "text-diff-modified-foreground/80" : ""}>
				<div className="space-y-2">
					{errors.length > 0 && (
						<p>
							<strong>{errors.length} error(s)</strong>:{" "}
							{errors
								.slice(0, 3)
								.map((e: DriftIssue) => e.message)
								.join(" ")}
							{errors.length > 3 && ` ...and ${errors.length - 3} more`}
						</p>
					)}
					{warnings.length > 0 && (
						<p>
							<strong>{warnings.length} warning(s)</strong>: Code-defined types
							may need syncing.
						</p>
					)}
					<div className="mt-3 flex items-center gap-2">
						<Button
							size="sm"
							variant={errors.length > 0 ? "destructive" : "outline"}
							onClick={handleSync}
							disabled={isSyncing}
							className={errors.length === 0 ? "border-warning/50 text-diff-modified-foreground hover:bg-warning/20" : ""}
						>
							<RefreshCw className={`mr-1.5 size-3.5 ${isSyncing ? "animate-spin" : ""}`} />
							{isSyncing ? "Syncing..." : "Sync Now"}
						</Button>
						<span className="text-xs opacity-75">
							Syncs code-defined types to the database
						</span>
					</div>
				</div>
			</AlertDescription>
		</Alert>
	);
}
