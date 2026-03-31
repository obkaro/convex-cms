import { useState, useCallback, useMemo, useEffect } from "react";
import { useMutation } from "convex/react";
import { useApi } from "../embed/contexts/ApiContext";
import type { FieldType, ContentType } from "../lib/cmsExports";
import { CmsDialog } from "./cmsds/CmsDialog";
import { CmsButton } from "./cmsds/CmsButton";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import {
	Plus,
	X,
	ChevronUp,
	ChevronDown,
	AlignLeft,
	FileType,
	Hash,
	ToggleLeft,
	Calendar,
	Link2,
	Image,
	Braces,
	ChevronDownIcon,
	List,
	Tag,
	FolderOpen,
	Code2,
	DollarSign,
} from "lucide-react";
import { cn } from "../lib/cn";
import { BreakingChangesWarningDialog } from "./BreakingChangesWarningDialog";

interface SelectOption {
	value: string;
	label: string;
}

interface FieldDefinition {
	name: string;
	label: string;
	type: FieldType;
	required: boolean;
	searchable?: boolean;
	localized?: boolean;
	description?: string;
	options?: {
		minLength?: number;
		maxLength?: number;
		pattern?: string;
		min?: number;
		max?: number;
		step?: number;
		precision?: number;
		options?: SelectOption[];
		allowedContentTypes?: string[];
		multiple?: boolean;
	};
}

const FIELD_TYPE_INFO: Record<
	FieldType,
	{ label: string; icon: React.ReactNode; description: string }
> = {
	text: {
		label: "Text",
		icon: <AlignLeft className="size-4" />,
		description: "Single line text input",
	},
	richText: {
		label: "Rich Text",
		icon: <FileType className="size-4" />,
		description: "Multi-line formatted text",
	},
	number: {
		label: "Number",
		icon: <Hash className="size-4" />,
		description: "Numeric value",
	},
	boolean: {
		label: "Boolean",
		icon: <ToggleLeft className="size-4" />,
		description: "True/false toggle",
	},
	date: {
		label: "Date",
		icon: <Calendar className="size-4" />,
		description: "Date picker",
	},
	datetime: {
		label: "Date & Time",
		icon: <Calendar className="size-4" />,
		description: "Date and time picker",
	},
	reference: {
		label: "Reference",
		icon: <Link2 className="size-4" />,
		description: "Link to another content entry",
	},
	media: {
		label: "Media",
		icon: <Image className="size-4" />,
		description: "Image, video, or file",
	},
	json: {
		label: "JSON",
		icon: <Braces className="size-4" />,
		description: "Custom JSON data",
	},
	select: {
		label: "Select",
		icon: <ChevronDownIcon className="size-4" />,
		description: "Dropdown selection",
	},
	multiSelect: {
		label: "Multi-Select",
		icon: <List className="size-4" />,
		description: "Multiple selections",
	},
	tags: {
		label: "Tags",
		icon: <Tag className="size-4" />,
		description: "Free-form tag list",
	},
	category: {
		label: "Category",
		icon: <FolderOpen className="size-4" />,
		description: "Taxonomy category selection",
	},
	money: {
		label: "Money",
		icon: <DollarSign className="size-4" />,
		description: "Currency amount in minor units",
	},
};

interface ContentTypeFormModalProps {
	isOpen: boolean;
	onClose: () => void;
	onCreated?: (contentType: unknown) => void;
	onUpdated?: (contentType: unknown) => void;
	contentType?: (ContentType & { source?: "code" | "database" }) | null;
}

function generateMachineName(displayName: string): string {
	return displayName
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s]/g, "")
		.replace(/\s+/g, "_")
		.replace(/^[0-9]/, "_$&")
		.slice(0, 64);
}

function isValidMachineName(name: string): boolean {
	return /^[a-z][a-z0-9_]{0,63}$/.test(name);
}

export function ContentTypeFormModal({
	isOpen,
	onClose,
	onCreated,
	onUpdated,
	contentType,
}: ContentTypeFormModalProps) {
	const isEditing = !!contentType;
	const isCodeDefined = contentType?.source === "code";
	const isReadOnly = isCodeDefined;

	const [displayName, setDisplayName] = useState("");
	const [machineName, setMachineName] = useState("");
	const [machineNameManuallyEdited, setMachineNameManuallyEdited] = useState(
		false,
	);
	const [description, setDescription] = useState("");
	const [singleton, setSingleton] = useState(false);
	const [fields, setFields] = useState<FieldDefinition[]>([
		{ name: "title", label: "Title", type: "text", required: true },
	]);
	const [titleField, setTitleField] = useState("title");
	const [slugField, setSlugField] = useState("title");

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [activeFieldIndex, setActiveFieldIndex] = useState<number | null>(null);
	const [showFieldEditor, setShowFieldEditor] = useState(false);

	// Breaking changes state
	const [breakingChanges, setBreakingChanges] = useState<string[]>([]);
	const [showBreakingWarning, setShowBreakingWarning] = useState(false);
	const [isForceUpdating, setIsForceUpdating] = useState(false);

	const api = useApi();
	const createContentType = useMutation(api.createContentType);
	const updateContentType = useMutation(api.updateContentType);

	// Populate form when editing
	useEffect(() => {
		if (contentType && isOpen) {
			setDisplayName(contentType.displayName);
			setMachineName(contentType.name);
			setMachineNameManuallyEdited(true);
			setDescription(contentType.description || "");
			setSingleton(contentType.singleton || false);
			setFields(contentType.fields as FieldDefinition[]);
			setTitleField(contentType.titleField || "");
			setSlugField(contentType.slugField || "");
		}
	}, [contentType, isOpen]);

	const resetForm = useCallback(() => {
		setDisplayName("");
		setMachineName("");
		setMachineNameManuallyEdited(false);
		setDescription("");
		setSingleton(false);
		setFields([
			{ name: "title", label: "Title", type: "text", required: true },
		]);
		setTitleField("title");
		setSlugField("title");
		setIsSubmitting(false);
		setSubmitError(null);
		setActiveFieldIndex(null);
		setShowFieldEditor(false);
		setBreakingChanges([]);
		setShowBreakingWarning(false);
		setIsForceUpdating(false);
	}, []);

	const handleDisplayNameChange = useCallback(
		(value: string) => {
			setDisplayName(value);
			if (!machineNameManuallyEdited) {
				setMachineName(generateMachineName(value));
			}
		},
		[machineNameManuallyEdited],
	);

	const handleMachineNameChange = useCallback((value: string) => {
		setMachineNameManuallyEdited(true);
		setMachineName(value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
	}, []);

	const addField = useCallback(() => {
		const newFieldName = `field_${fields.length + 1}`;
		setFields((prev) => [
			...prev,
			{
				name: newFieldName,
				label: `Field ${prev.length + 1}`,
				type: "text",
				required: false,
			},
		]);
		setActiveFieldIndex(fields.length);
		setShowFieldEditor(true);
	}, [fields.length]);

	const removeField = useCallback(
		(index: number) => {
			const fieldToRemove = fields[index];
			setFields((prev) => prev.filter((_, i) => i !== index));

			if (titleField === fieldToRemove.name) {
				const firstTextField = fields.find(
					(f, i) => i !== index && f.type === "text",
				);
				setTitleField(firstTextField?.name || "");
			}
			if (slugField === fieldToRemove.name) {
				const firstTextField = fields.find(
					(f, i) => i !== index && f.type === "text",
				);
				setSlugField(firstTextField?.name || "");
			}

			if (activeFieldIndex === index) {
				setActiveFieldIndex(null);
				setShowFieldEditor(false);
			} else if (activeFieldIndex !== null && activeFieldIndex > index) {
				setActiveFieldIndex(activeFieldIndex - 1);
			}
		},
		[fields, activeFieldIndex, titleField, slugField],
	);

	const updateField = useCallback(
		(index: number, updates: Partial<FieldDefinition>) => {
			setFields((prev) =>
				prev.map((field, i) =>
					i === index ? { ...field, ...updates } : field,
				),
			);
		},
		[],
	);

	const moveField = useCallback((fromIndex: number, toIndex: number) => {
		setFields((prev) => {
			const newFields = [...prev];
			const [movedField] = newFields.splice(fromIndex, 1);
			newFields.splice(toIndex, 0, movedField);
			return newFields;
		});
		setActiveFieldIndex(toIndex);
	}, []);

	const validationErrors = useMemo(() => {
		const errors: string[] = [];

		if (!displayName.trim()) {
			errors.push("Display name is required");
		}

		if (!machineName.trim()) {
			errors.push("System Name is required");
		} else if (!isValidMachineName(machineName)) {
			errors.push(
				"System Name must start with a letter and contain only lowercase letters, numbers, and underscores",
			);
		}

		if (fields.length === 0) {
			errors.push("At least one field is required");
		}

		const fieldNames = fields.map((f) => f.name);
		const duplicates = fieldNames.filter(
			(name, index) => fieldNames.indexOf(name) !== index,
		);
		if (duplicates.length > 0) {
			errors.push(
				`Duplicate field names: ${[...new Set(duplicates)].join(", ")}`,
			);
		}

		for (const field of fields) {
			if (!field.name.trim()) {
				errors.push(`Field "${field.label}" has an empty name`);
			} else if (!/^[a-z][a-z0-9_]{0,63}$/.test(field.name)) {
				errors.push(`Field "${field.name}" has an invalid name format`);
			}
			if (!field.label.trim()) {
				errors.push(`Field with name "${field.name}" has an empty label`);
			}

			if (
				(field.type === "select" || field.type === "multiSelect") &&
				(!field.options?.options || field.options.options.length === 0)
			) {
				errors.push(
					`${field.type} field "${field.label}" requires at least one option`,
				);
			}
		}

		return errors;
	}, [displayName, machineName, fields]);

	const textFields = useMemo(() => fields.filter((f) => f.type === "text"), [
		fields,
	]);

	const parseBreakingChanges = (errorMessage: string): string[] => {
		const lines = errorMessage.split("\n");
		return lines
			.filter((line) => line.trim().startsWith("-"))
			.map((line) => line.trim().substring(2));
	};

	const handleSubmit = useCallback(
		async (e: React.FormEvent, force = false) => {
			e.preventDefault();

			if (validationErrors.length > 0) {
				setSubmitError(validationErrors.join(". "));
				return;
			}

			setIsSubmitting(true);
			setSubmitError(null);

			try {
				if (isEditing && contentType) {
					// Update existing content type
					const result = await updateContentType({
						id: contentType._id,
						displayName: displayName.trim(),
						description: description.trim() || undefined,
						fields: fields as typeof fields,
						singleton,
						titleField: titleField || undefined,
						slugField: slugField || undefined,
						force,
					} as Parameters<typeof updateContentType>[0]);

					onUpdated?.(result);
					resetForm();
					onClose();
				} else {
					// Create new content type
					const result = await createContentType({
						name: machineName,
						displayName: displayName.trim(),
						description: description.trim() || undefined,
						fields: fields as typeof fields,
						singleton,
						titleField: titleField || undefined,
						slugField: slugField || undefined,
					} as Parameters<typeof createContentType>[0]);

					onCreated?.(result);
					resetForm();
					onClose();
				}
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: isEditing
						? "Failed to update content type"
						: "Failed to create content type";

				// Check for breaking changes error
				if (isEditing && !force && message.includes("breaking change")) {
					const changes = parseBreakingChanges(message);
					setBreakingChanges(changes);
					setShowBreakingWarning(true);
				} else {
					setSubmitError(message);
				}
			} finally {
				setIsSubmitting(false);
			}
		},
		[
			validationErrors,
			isEditing,
			contentType,
			createContentType,
			updateContentType,
			machineName,
			displayName,
			description,
			fields,
			singleton,
			titleField,
			slugField,
			onCreated,
			onUpdated,
			resetForm,
			onClose,
		],
	);

	const handleForceUpdate = useCallback(async () => {
		setIsForceUpdating(true);
		try {
			if (contentType) {
				const result = await updateContentType({
					id: contentType._id,
					displayName: displayName.trim(),
					description: description.trim() || undefined,
					fields: fields as typeof fields,
					singleton,
					titleField: titleField || undefined,
					slugField: slugField || undefined,
					force: true,
				} as Parameters<typeof updateContentType>[0]);

				onUpdated?.(result);
				resetForm();
				setShowBreakingWarning(false);
				onClose();
			}
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to update content type";
			setSubmitError(message);
			setShowBreakingWarning(false);
		} finally {
			setIsForceUpdating(false);
		}
	}, [
		contentType,
		updateContentType,
		displayName,
		description,
		fields,
		singleton,
		titleField,
		slugField,
		onUpdated,
		resetForm,
		onClose,
	]);

	const handleClose = useCallback(() => {
		if (isSubmitting) return;
		resetForm();
		onClose();
	}, [isSubmitting, resetForm, onClose]);

	if (!isOpen) return null;

	const activeField =
		activeFieldIndex !== null ? fields[activeFieldIndex] : null;

	return (
		<>
			<CmsDialog
				open={isOpen}
				onOpenChange={(open) => !open && handleClose()}
				title={
					isCodeDefined
						? "View Content Type"
						: isEditing
							? "Edit Content Type"
							: "Create Content Type"
				}
				size="2xl"
				footer={
					isReadOnly ? (
						<CmsButton variant="outline" onClick={handleClose}>
							Close
						</CmsButton>
					) : (
						<>
							<CmsButton
								variant="outline"
								onClick={handleClose}
								disabled={isSubmitting}
							>
								Cancel
							</CmsButton>
							<CmsButton
								variant="primary"
								onClick={handleSubmit}
								disabled={validationErrors.length > 0}
								loading={isSubmitting}
								data-testid={
									isEditing
										? "update-content-type-submit"
										: "create-content-type-submit"
								}
							>
								{isEditing ? "Save Changes" : "Create Content Type"}
							</CmsButton>
						</>
					)
				}
			>
				<form onSubmit={handleSubmit} className="space-y-6">
					{isCodeDefined && (
						<div className="flex items-start gap-3 rounded-lg border border-violet-200 bg-violet-50 p-3">
							<Code2 className="mt-0.5 size-5 shrink-0 text-violet-600" />
							<div className="space-y-1">
								<p className="text-sm font-medium text-violet-900">
									Managed by Code
								</p>
								<p className="text-sm text-violet-700">
									This content type is defined in your codebase and cannot be
									edited through the admin interface. To make changes, update
									the definition in your code.
								</p>
							</div>
						</div>
					)}

					{/* Basic Info Section */}
					<div className="space-y-4">
						<h4 className="text-sm font-semibold text-foreground">
							Basic Information
						</h4>

						<div className="space-y-2">
							<Label htmlFor="displayName">
								Display Name <span className="text-destructive">*</span>
							</Label>
							<Input
								id="displayName"
								value={displayName}
								onChange={(e) => handleDisplayNameChange(e.target.value)}
								placeholder="e.g., Blog Post"
								disabled={isSubmitting || isReadOnly}
								autoFocus={!isReadOnly}
								data-testid="display-name-input"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="machineName">
								System Name <span className="text-destructive">*</span>
							</Label>
							<Input
								id="machineName"
								value={machineName}
								onChange={(e) => handleMachineNameChange(e.target.value)}
								placeholder="e.g., blog_post"
								disabled={isSubmitting || isEditing || isReadOnly}
								className={cn(
									!isValidMachineName(machineName) &&
										machineName &&
										"border-destructive",
								)}
								data-testid="machine-name-input"
							/>
							<p className="text-xs text-muted-foreground">
								{isEditing
									? "System name cannot be changed after creation"
									: "Lowercase letters, numbers, and underscores only. Used in API queries."}
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Optional description of this content type"
								disabled={isSubmitting || isReadOnly}
								rows={2}
							/>
						</div>

						<div className="flex items-center gap-2">
							<Checkbox
								id="singleton"
								checked={singleton}
								onCheckedChange={(checked) => setSingleton(checked as boolean)}
								disabled={isSubmitting || isReadOnly}
							/>
							<Label htmlFor="singleton" className="cursor-pointer">
								Singleton (only one entry allowed)
							</Label>
						</div>
					</div>

					{/* Fields Section */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<h4 className="text-sm font-semibold text-foreground">Fields</h4>
							{!isReadOnly && (
								<CmsButton
									type="button"
									variant="secondary"
									size="sm"
									onClick={addField}
									disabled={isSubmitting}
									data-testid="add-field-button"
								>
									<Plus className="size-3.5" />
									Add Field
								</CmsButton>
							)}
						</div>

						<div className="space-y-2">
							{fields.map((field, index) => (
								<div
									key={index}
									className={cn(
										"flex items-center gap-2 rounded-lg border p-2 transition-colors",
										!isReadOnly && "cursor-pointer hover:bg-muted/50",
										activeFieldIndex === index && "border-primary bg-primary/5",
									)}
									onClick={() => {
										if (!isReadOnly) {
											setActiveFieldIndex(index);
											setShowFieldEditor(true);
										}
									}}
									data-testid={`field-item-${index}`}
								>
									{!isReadOnly && (
										<div className="flex flex-col gap-0.5">
											{index > 0 && (
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														moveField(index, index - 1);
													}}
													className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
												>
													<ChevronUp className="size-3" />
												</button>
											)}
											{index < fields.length - 1 && (
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														moveField(index, index + 1);
													}}
													className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
												>
													<ChevronDown className="size-3" />
												</button>
											)}
										</div>
									)}

									<div className="flex size-8 items-center justify-center rounded bg-muted text-muted-foreground">
										{FIELD_TYPE_INFO[field.type].icon}
									</div>

									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium">
											{field.label}
										</p>
										<p className="text-xs text-muted-foreground">
											{FIELD_TYPE_INFO[field.type].label}
											{field.required && " *"}
										</p>
									</div>

									{!isReadOnly && (
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												removeField(index);
											}}
											disabled={isSubmitting || fields.length === 1}
											className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
										>
											<X className="size-4" />
										</button>
									)}
								</div>
							))}
						</div>

						{/* Field Editor Panel - hidden in read-only mode */}
						{!isReadOnly && showFieldEditor && activeField && activeFieldIndex !== null && (
							<div
								className="rounded-lg border bg-muted/30 p-4"
								data-testid="field-editor"
							>
								<div className="mb-4 flex items-center justify-between">
									<h5 className="font-medium">
										Edit Field: {activeField.label}
									</h5>
									<button
										type="button"
										onClick={() => {
											setShowFieldEditor(false);
											setActiveFieldIndex(null);
										}}
										className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
									>
										<X className="size-4" />
									</button>
								</div>

								<div className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="fieldLabel">
											Label <span className="text-destructive">*</span>
										</Label>
										<Input
											id="fieldLabel"
											value={activeField.label}
											onChange={(e) =>
												updateField(activeFieldIndex, {
													label: e.target.value,
													name: machineNameManuallyEdited
														? activeField.name
														: generateMachineName(e.target.value) ||
														  activeField.name,
												})
											}
											disabled={isSubmitting}
											data-testid="field-label-input"
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="fieldName">
											Name <span className="text-destructive">*</span>
										</Label>
										<Input
											id="fieldName"
											value={activeField.name}
											onChange={(e) =>
												updateField(activeFieldIndex, {
													name: e.target.value
														.toLowerCase()
														.replace(/[^a-z0-9_]/g, ""),
												})
											}
											disabled={isSubmitting}
											data-testid="field-name-input"
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="fieldType">
											Type <span className="text-destructive">*</span>
										</Label>
										<Select
											value={activeField.type}
											onValueChange={(value) =>
												updateField(activeFieldIndex, {
													type: value as FieldType,
													options: undefined,
												})
											}
											disabled={isSubmitting}
										>
											<SelectTrigger data-testid="field-type-select">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{Object.entries(FIELD_TYPE_INFO).map(([type, info]) => (
													<SelectItem key={type} value={type}>
														<div className="flex items-center gap-2">
															{info.icon}
															<span>{info.label}</span>
															<span className="text-muted-foreground">
																- {info.description}
															</span>
														</div>
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="flex items-center gap-2">
										<Checkbox
											id="fieldRequired"
											checked={activeField.required}
											onCheckedChange={(checked) =>
												updateField(activeFieldIndex, {
													required: checked as boolean,
												})
											}
											disabled={isSubmitting}
										/>
										<Label htmlFor="fieldRequired" className="cursor-pointer">
											Required
										</Label>
									</div>

									<div className="space-y-2">
										<Label htmlFor="fieldDescription">Help Text</Label>
										<Input
											id="fieldDescription"
											value={activeField.description || ""}
											onChange={(e) =>
												updateField(activeFieldIndex, {
													description: e.target.value || undefined,
												})
											}
											placeholder="Help text shown below the field"
											disabled={isSubmitting}
										/>
									</div>

									{(activeField.type === "select" ||
										activeField.type === "multiSelect") && (
										<SelectOptionsEditor
											options={activeField.options?.options || []}
											onChange={(options) =>
												updateField(activeFieldIndex, {
													options: { ...activeField.options, options },
												})
											}
											disabled={isSubmitting}
										/>
									)}
								</div>
							</div>
						)}
					</div>

					{/* Display Settings */}
					{textFields.length > 0 && (
						<div className="space-y-4">
							<h4 className="text-sm font-semibold text-foreground">
								Display Settings
							</h4>

							<div className="space-y-2">
								<Label htmlFor="titleField">Title Field</Label>
								<Select
									value={titleField || "none"}
									onValueChange={(v) => setTitleField(v === "none" ? "" : v)}
									disabled={isSubmitting}
								>
									<SelectTrigger>
										<SelectValue placeholder="None" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">None</SelectItem>
										{textFields.map((field) => (
											<SelectItem key={field.name} value={field.name}>
												{field.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-xs text-muted-foreground">
									Field to display as the entry title in lists
								</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="slugField">Slug Field</Label>
								<Select
									value={slugField || "none"}
									onValueChange={(v) => setSlugField(v === "none" ? "" : v)}
									disabled={isSubmitting}
								>
									<SelectTrigger>
										<SelectValue placeholder="None (auto-generate)" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">None (auto-generate)</SelectItem>
										{textFields.map((field) => (
											<SelectItem key={field.name} value={field.name}>
												{field.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-xs text-muted-foreground">
									Field to use for generating URL-friendly slugs
								</p>
							</div>
						</div>
					)}

					{submitError && (
						<div
							className="diff-removed rounded-lg border px-3 py-2 text-sm"
							role="alert"
							data-testid="submit-error"
						>
							{submitError}
						</div>
					)}
				</form>
			</CmsDialog>

			<BreakingChangesWarningDialog
				isOpen={showBreakingWarning}
				onClose={() => setShowBreakingWarning(false)}
				breakingChanges={breakingChanges}
				onForceUpdate={handleForceUpdate}
				onCancel={() => {
					setShowBreakingWarning(false);
					setBreakingChanges([]);
				}}
				isLoading={isForceUpdating}
			/>
		</>
	);
}

function SelectOptionsEditor({
	options,
	onChange,
	disabled,
}: {
	options: SelectOption[];
	onChange: (options: SelectOption[]) => void;
	disabled?: boolean;
}) {
	const addOption = () => {
		onChange([
			...options,
			{ value: `option_${options.length + 1}`, label: "" },
		]);
	};

	const removeOption = (index: number) => {
		onChange(options.filter((_, i) => i !== index));
	};

	const updateOption = (index: number, updates: Partial<SelectOption>) => {
		onChange(
			options.map((opt, i) => (i === index ? { ...opt, ...updates } : opt)),
		);
	};

	return (
		<div className="space-y-2">
			<Label>
				Options <span className="text-destructive">*</span>
			</Label>
			<div className="space-y-2">
				{options.map((option, index) => (
					<div key={index} className="flex items-center gap-2">
						<Input
							value={option.label}
							onChange={(e) => {
								const label = e.target.value;
								const value = label
									.toLowerCase()
									.replace(/[^a-z0-9]/g, "_")
									.replace(/^_+|_+$/g, "");
								updateOption(index, { label, value });
							}}
							placeholder="Option label"
							disabled={disabled}
							className="flex-1"
						/>
						<Input
							value={option.value}
							onChange={(e) =>
								updateOption(index, {
									value: e.target.value
										.toLowerCase()
										.replace(/[^a-z0-9_]/g, ""),
								})
							}
							placeholder="value"
							disabled={disabled}
							className="w-32"
						/>
						<button
							type="button"
							onClick={() => removeOption(index)}
							disabled={disabled}
							className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
						>
							<X className="size-4" />
						</button>
					</div>
				))}
			</div>
			<CmsButton
				type="button"
				variant="secondary"
				size="sm"
				onClick={addOption}
				disabled={disabled}
			>
				<Plus className="size-3.5" />
				Add Option
			</CmsButton>
		</div>
	);
}
