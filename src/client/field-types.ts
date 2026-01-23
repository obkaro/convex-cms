/**
 * Custom Field Type Registry
 *
 * Allows defining custom field types beyond the 13 built-in types.
 * Custom field types store as 'json' in the database but have their own
 * validation, default values, and UI rendering through the registry.
 */

import { v, type Validator } from "convex/values";

export interface FieldTypeDefinition<T = unknown> {
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  validator: Validator<T, "required", string>;
  defaultValue?: T;
  extractSearchText?: (value: T) => string;
  validate?: (value: T, options?: Record<string, unknown>) => FieldValidationResult;
  optionsSchema?: Record<string, unknown>;
}

export interface FieldValidationResult {
  valid: boolean;
  error?: string;
}

const fieldTypeRegistry = new Map<string, FieldTypeDefinition>();

const BUILT_IN_TYPES: FieldTypeDefinition[] = [
  { name: "text", displayName: "Text", icon: "Type", validator: v.string(), defaultValue: "" },
  {
    name: "richText",
    displayName: "Rich Text",
    icon: "FileText",
    validator: v.string(),
    defaultValue: "",
  },
  { name: "number", displayName: "Number", icon: "Hash", validator: v.number(), defaultValue: 0 },
  {
    name: "boolean",
    displayName: "Boolean",
    icon: "ToggleLeft",
    validator: v.boolean(),
    defaultValue: false,
  },
  {
    name: "date",
    displayName: "Date",
    icon: "Calendar",
    validator: v.union(v.string(), v.null()),
    defaultValue: null,
  },
  {
    name: "datetime",
    displayName: "Date & Time",
    icon: "Clock",
    validator: v.union(v.string(), v.null()),
    defaultValue: null,
  },
  {
    name: "reference",
    displayName: "Reference",
    icon: "Link",
    validator: v.union(v.string(), v.array(v.string()), v.null()),
    defaultValue: null,
  },
  {
    name: "media",
    displayName: "Media",
    icon: "Image",
    validator: v.union(v.string(), v.null()),
    defaultValue: null,
  },
  { name: "json", displayName: "JSON", icon: "Braces", validator: v.any(), defaultValue: null },
  {
    name: "select",
    displayName: "Select",
    icon: "ChevronDown",
    validator: v.string(),
    defaultValue: "",
  },
  {
    name: "multiSelect",
    displayName: "Multi Select",
    icon: "CheckSquare",
    validator: v.array(v.string()),
    defaultValue: [],
  },
  {
    name: "tags",
    displayName: "Tags",
    icon: "Tags",
    validator: v.array(v.string()),
    defaultValue: [],
  },
  {
    name: "category",
    displayName: "Category",
    icon: "Folder",
    validator: v.union(v.string(), v.array(v.string()), v.null()),
    defaultValue: null,
  },
];

BUILT_IN_TYPES.forEach((type) => fieldTypeRegistry.set(type.name, type));

const BUILT_IN_NAMES = new Set(BUILT_IN_TYPES.map((t) => t.name));

/**
 * Define a custom field type.
 *
 * @example
 * const addressField = defineFieldType({
 *   name: "address",
 *   displayName: "Address",
 *   icon: "MapPin",
 *   validator: v.object({
 *     street: v.string(),
 *     city: v.string(),
 *     postalCode: v.string(),
 *     country: v.string(),
 *   }),
 *   defaultValue: { street: "", city: "", postalCode: "", country: "" },
 *   extractSearchText: (value) => `${value.street} ${value.city}`,
 * });
 */
export function defineFieldType<T>(definition: FieldTypeDefinition<T>): FieldTypeDefinition<T> {
  if (!/^[a-z][a-zA-Z0-9]*$/.test(definition.name)) {
    throw new Error(
      `Field type name "${definition.name}" must be camelCase starting with lowercase letter`
    );
  }
  if (BUILT_IN_NAMES.has(definition.name)) {
    throw new Error(`Cannot redefine built-in field type "${definition.name}"`);
  }
  return Object.freeze(definition);
}

export function registerFieldType(definition: FieldTypeDefinition): void {
  if (BUILT_IN_NAMES.has(definition.name)) {
    throw new Error(`Cannot redefine built-in field type "${definition.name}"`);
  }
  fieldTypeRegistry.set(definition.name, definition);
}

export function registerFieldTypes(definitions: FieldTypeDefinition[]): void {
  for (const definition of definitions) {
    registerFieldType(definition);
  }
}

export function getFieldTypeDefinition(name: string): FieldTypeDefinition | undefined {
  return fieldTypeRegistry.get(name);
}

export function getAllFieldTypes(): FieldTypeDefinition[] {
  return Array.from(fieldTypeRegistry.values());
}

export function getCustomFieldTypes(): FieldTypeDefinition[] {
  return Array.from(fieldTypeRegistry.values()).filter((t) => !BUILT_IN_NAMES.has(t.name));
}

export function isBuiltInFieldType(name: string): boolean {
  return BUILT_IN_NAMES.has(name);
}

export function isCustomFieldType(name: string): boolean {
  return fieldTypeRegistry.has(name) && !BUILT_IN_NAMES.has(name);
}

export function hasFieldType(name: string): boolean {
  return fieldTypeRegistry.has(name);
}

export function getFieldTypeDefaultValue(name: string): unknown {
  const type = fieldTypeRegistry.get(name);
  return type?.defaultValue;
}

export function getFieldTypeIcon(name: string): string | undefined {
  const type = fieldTypeRegistry.get(name);
  return type?.icon;
}

export { BUILT_IN_TYPES };
