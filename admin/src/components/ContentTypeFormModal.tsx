import { useState, useCallback, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { FieldType } from "@convex-cms/core/types";

/**
 * Select option for select/multiSelect fields.
 */
interface SelectOption {
	value: string;
	label: string;
}

/**
 * Field definition for content type schema.
 */
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

/**
 * Field type metadata for UI display.
 */
const FIELD_TYPE_INFO: Record<
	FieldType,
	{ label: string; icon: string; description: string }
> = {
	text: { label: "Text", icon: "Aa", description: "Single line text input" },
	richText: {
		label: "Rich Text",
		icon: "¶",
		description: "Multi-line formatted text",
	},
	number: { label: "Number", icon: "#", description: "Numeric value" },
	boolean: { label: "Boolean", icon: "☑", description: "True/false toggle" },
	date: { label: "Date", icon: "📅", description: "Date picker" },
	datetime: {
		label: "Date & Time",
		icon: "📆",
		description: "Date and time picker",
	},
	reference: {
		label: "Reference",
		icon: "🔗",
		description: "Link to another content entry",
	},
	media: { label: "Media", icon: "🖼", description: "Image, video, or file" },
	json: { label: "JSON", icon: "{}", description: "Custom JSON data" },
	select: { label: "Select", icon: "▼", description: "Dropdown selection" },
	multiSelect: {
		label: "Multi-Select",
		icon: "☰",
		description: "Multiple selections",
	},
	tags: { label: "Tags", icon: "🏷", description: "Free-form tag list" },
	category: {
		label: "Category",
		icon: "📁",
		description: "Taxonomy category selection",
	},
};

/**
 * Props for the ContentTypeFormModal component.
 */
interface ContentTypeFormModalProps {
	/** Whether the modal is open */
	isOpen: boolean;
	/** Callback when modal is closed */
	onClose: () => void;
	/** Callback when content type is created successfully */
	onCreated?: (contentType: any) => void;
}

/**
 * Generates a machine-readable name from a display name.
 * Converts to lowercase, replaces spaces with underscores, removes special chars.
 */
function generateMachineName(displayName: string): string {
	return displayName
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s]/g, "")
		.replace(/\s+/g, "_")
		.replace(/^[0-9]/, "_$&") // Prefix with underscore if starts with number
		.slice(0, 64);
}

/**
 * Validates machine name format.
 * Must start with a letter, contain only lowercase letters, numbers, underscores.
 */
function isValidMachineName(name: string): boolean {
	return /^[a-z][a-z0-9_]{0,63}$/.test(name);
}

/**
 * Modal form for creating a new content type with field definitions.
 *
 * Features:
 * - Basic info (name, display name, description)
 * - Dynamic field builder with drag-and-drop reordering
 * - Field type selection with type-specific options
 * - Validation of field definitions
 */
export function ContentTypeFormModal({
	isOpen,
	onClose,
	onCreated,
}: ContentTypeFormModalProps) {
	// Form state
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

	// UI state
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [activeFieldIndex, setActiveFieldIndex] = useState<number | null>(null);
	const [showFieldEditor, setShowFieldEditor] = useState(false);

	// Mutation
	const createContentType = useMutation(api.contentTypes.create);

	// Reset form when modal opens/closes
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
	}, []);

	// Auto-generate machine name from display name
	const handleDisplayNameChange = useCallback(
		(value: string) => {
			setDisplayName(value);
			if (!machineNameManuallyEdited) {
				setMachineName(generateMachineName(value));
			}
		},
		[machineNameManuallyEdited],
	);

	// Handle machine name manual edit
	const handleMachineNameChange = useCallback((value: string) => {
		setMachineNameManuallyEdited(true);
		setMachineName(value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
	}, []);

	// Field management
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

			// Update title/slug field if the removed field was selected
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

	// Validation
	const validationErrors = useMemo(() => {
		const errors: string[] = [];

		if (!displayName.trim()) {
			errors.push("Display name is required");
		}

		if (!machineName.trim()) {
			errors.push("Machine name is required");
		} else if (!isValidMachineName(machineName)) {
			errors.push(
				"Machine name must start with a letter and contain only lowercase letters, numbers, and underscores",
			);
		}

		if (fields.length === 0) {
			errors.push("At least one field is required");
		}

		// Check for duplicate field names
		const fieldNames = fields.map((f) => f.name);
		const duplicates = fieldNames.filter(
			(name, index) => fieldNames.indexOf(name) !== index,
		);
		if (duplicates.length > 0) {
			errors.push(
				`Duplicate field names: ${[...new Set(duplicates)].join(", ")}`,
			);
		}

		// Check field name validity
		for (const field of fields) {
			if (!field.name.trim()) {
				errors.push(`Field "${field.label}" has an empty name`);
			} else if (!/^[a-z][a-z0-9_]{0,63}$/.test(field.name)) {
				errors.push(`Field "${field.name}" has an invalid name format`);
			}
			if (!field.label.trim()) {
				errors.push(`Field with name "${field.name}" has an empty label`);
			}

			// Check select fields have options
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

	// Text fields for title/slug selection
	const textFields = useMemo(() => fields.filter((f) => f.type === "text"), [
		fields,
	]);

	// Handle form submission
	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();

			if (validationErrors.length > 0) {
				setSubmitError(validationErrors.join(". "));
				return;
			}

			setIsSubmitting(true);
			setSubmitError(null);

			try {
				const contentType = await createContentType({
					name: machineName,
					displayName: displayName.trim(),
					description: description.trim() || undefined,
					fields,
					singleton,
					titleField: titleField || undefined,
					slugField: slugField || undefined,
				});

				onCreated?.(contentType);
				resetForm();
				onClose();
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Failed to create content type";
				setSubmitError(message);
			} finally {
				setIsSubmitting(false);
			}
		},
		[
			validationErrors,
			createContentType,
			machineName,
			displayName,
			description,
			fields,
			singleton,
			titleField,
			slugField,
			onCreated,
			resetForm,
			onClose,
		],
	);

	// Handle modal close
	const handleClose = useCallback(() => {
		if (isSubmitting) return;
		resetForm();
		onClose();
	}, [isSubmitting, resetForm, onClose]);

	if (!isOpen) return null;

	const activeField =
		activeFieldIndex !== null ? fields[activeFieldIndex] : null;

	return (
		<div className="modal-overlay" onClick={handleClose}>
			<div
				className="modal modal-content-type"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-labelledby="modal-title"
			>
				<div className="modal-header">
					<h3 id="modal-title">Create Content Type</h3>
					<button
						type="button"
						className="modal-close"
						onClick={handleClose}
						disabled={isSubmitting}
						aria-label="Close modal"
					>
						&times;
					</button>
				</div>

				<form onSubmit={handleSubmit}>
					<div className="modal-body modal-body-scrollable">
						{/* Basic Info Section */}
						<div className="form-section">
							<h4 className="form-section-title">Basic Information</h4>

							<div className="form-group">
								<label htmlFor="displayName">Display Name *</label>
								<input
									id="displayName"
									type="text"
									value={displayName}
									onChange={(e) => handleDisplayNameChange(e.target.value)}
									placeholder="e.g., Blog Post"
									disabled={isSubmitting}
									autoFocus
									data-testid="display-name-input"
								/>
							</div>

							<div className="form-group">
								<label htmlFor="machineName">Machine Name *</label>
								<input
									id="machineName"
									type="text"
									value={machineName}
									onChange={(e) => handleMachineNameChange(e.target.value)}
									placeholder="e.g., blog_post"
									disabled={isSubmitting}
									className={
										!isValidMachineName(machineName) && machineName
											? "input-error"
											: ""
									}
									data-testid="machine-name-input"
								/>
								<span className="form-help">
									Lowercase letters, numbers, and underscores only. Used in API
									queries.
								</span>
							</div>

							<div className="form-group">
								<label htmlFor="description">Description</label>
								<textarea
									id="description"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									placeholder="Optional description of this content type"
									disabled={isSubmitting}
									rows={2}
								/>
							</div>

							<div className="form-group form-group-checkbox">
								<label>
									<input
										type="checkbox"
										checked={singleton}
										onChange={(e) => setSingleton(e.target.checked)}
										disabled={isSubmitting}
									/>
									<span>Singleton (only one entry allowed)</span>
								</label>
							</div>
						</div>

						{/* Fields Section */}
						<div className="form-section">
							<div className="form-section-header">
								<h4 className="form-section-title">Fields</h4>
								<button
									type="button"
									className="btn btn-small btn-secondary"
									onClick={addField}
									disabled={isSubmitting}
									data-testid="add-field-button"
								>
									+ Add Field
								</button>
							</div>

							<div className="field-list">
								{fields.map((field, index) => (
									<div
										key={index}
										className={`field-list-item ${
											activeFieldIndex === index
												? "field-list-item--active"
												: ""
										}`}
										onClick={() => {
											setActiveFieldIndex(index);
											setShowFieldEditor(true);
										}}
										data-testid={`field-item-${index}`}
									>
										<div className="field-list-item-drag">
											{index > 0 && (
												<button
													type="button"
													className="field-move-btn"
													onClick={(e) => {
														e.stopPropagation();
														moveField(index, index - 1);
													}}
													title="Move up"
												>
													▲
												</button>
											)}
											{index < fields.length - 1 && (
												<button
													type="button"
													className="field-move-btn"
													onClick={(e) => {
														e.stopPropagation();
														moveField(index, index + 1);
													}}
													title="Move down"
												>
													▼
												</button>
											)}
										</div>
										<div className="field-list-item-icon">
											{FIELD_TYPE_INFO[field.type].icon}
										</div>
										<div className="field-list-item-info">
											<span className="field-list-item-label">
												{field.label}
											</span>
											<span className="field-list-item-type">
												{FIELD_TYPE_INFO[field.type].label}
												{field.required && " *"}
											</span>
										</div>
										<button
											type="button"
											className="field-list-item-remove"
											onClick={(e) => {
												e.stopPropagation();
												removeField(index);
											}}
											disabled={isSubmitting || fields.length === 1}
											title="Remove field"
										>
											×
										</button>
									</div>
								))}
							</div>

							{/* Field Editor Panel */}
							{showFieldEditor && activeField && activeFieldIndex !== null && (
								<div className="field-editor" data-testid="field-editor">
									<div className="field-editor-header">
										<h5>Edit Field: {activeField.label}</h5>
										<button
											type="button"
											className="btn-icon"
											onClick={() => {
												setShowFieldEditor(false);
												setActiveFieldIndex(null);
											}}
										>
											×
										</button>
									</div>

									<div className="form-group">
										<label htmlFor="fieldLabel">Label *</label>
										<input
											id="fieldLabel"
											type="text"
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

									<div className="form-group">
										<label htmlFor="fieldName">Name *</label>
										<input
											id="fieldName"
											type="text"
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

									<div className="form-group">
										<label htmlFor="fieldType">Type *</label>
										<select
											id="fieldType"
											value={activeField.type}
											onChange={(e) =>
												updateField(activeFieldIndex, {
													type: e.target.value as FieldType,
													options: undefined, // Reset options when type changes
												})
											}
											disabled={isSubmitting}
											data-testid="field-type-select"
										>
											{Object.entries(FIELD_TYPE_INFO).map(([type, info]) => (
												<option key={type} value={type}>
													{info.label} - {info.description}
												</option>
											))}
										</select>
									</div>

									<div className="form-group form-group-checkbox">
										<label>
											<input
												type="checkbox"
												checked={activeField.required}
												onChange={(e) =>
													updateField(activeFieldIndex, {
														required: e.target.checked,
													})
												}
												disabled={isSubmitting}
											/>
											<span>Required</span>
										</label>
									</div>

									<div className="form-group">
										<label htmlFor="fieldDescription">Help Text</label>
										<input
											id="fieldDescription"
											type="text"
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

									{/* Select options editor */}
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
							)}
						</div>

						{/* Advanced Settings */}
						{textFields.length > 0 && (
							<div className="form-section">
								<h4 className="form-section-title">Display Settings</h4>

								<div className="form-group">
									<label htmlFor="titleField">Title Field</label>
									<select
										id="titleField"
										value={titleField}
										onChange={(e) => setTitleField(e.target.value)}
										disabled={isSubmitting}
									>
										<option value="">None</option>
										{textFields.map((field) => (
											<option key={field.name} value={field.name}>
												{field.label}
											</option>
										))}
									</select>
									<span className="form-help">
										Field to display as the entry title in lists
									</span>
								</div>

								<div className="form-group">
									<label htmlFor="slugField">Slug Field</label>
									<select
										id="slugField"
										value={slugField}
										onChange={(e) => setSlugField(e.target.value)}
										disabled={isSubmitting}
									>
										<option value="">None (auto-generate)</option>
										{textFields.map((field) => (
											<option key={field.name} value={field.name}>
												{field.label}
											</option>
										))}
									</select>
									<span className="form-help">
										Field to use for generating URL-friendly slugs
									</span>
								</div>
							</div>
						)}

						{/* Error display */}
						{submitError && (
							<div
								className="form-error"
								role="alert"
								data-testid="submit-error"
							>
								{submitError}
							</div>
						)}
					</div>

					<div className="modal-footer">
						<button
							type="button"
							className="btn btn-secondary"
							onClick={handleClose}
							disabled={isSubmitting}
						>
							Cancel
						</button>
						<button
							type="submit"
							className="btn btn-primary"
							disabled={isSubmitting || validationErrors.length > 0}
							data-testid="create-content-type-submit"
						>
							{isSubmitting ? "Creating..." : "Create Content Type"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

/**
 * Editor for select/multiSelect field options.
 */
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
		<div className="form-group">
			<label>Options *</label>
			<div className="select-options-list">
				{options.map((option, index) => (
					<div key={index} className="select-option-item">
						<input
							type="text"
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
						/>
						<input
							type="text"
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
							className="select-option-value"
						/>
						<button
							type="button"
							className="btn-icon"
							onClick={() => removeOption(index)}
							disabled={disabled}
						>
							×
						</button>
					</div>
				))}
			</div>
			<button
				type="button"
				className="btn btn-small btn-secondary"
				onClick={addOption}
				disabled={disabled}
			>
				+ Add Option
			</button>
		</div>
	);
}
