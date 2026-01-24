/**
 * Field Renderer Registry
 *
 * Manages the mapping between field types and their renderer components.
 * Supports both built-in field types and custom field types registered
 * through the CMS configuration.
 */

import type { ComponentType } from "react";
import type { BaseFieldProps, FieldRendererProps as _FieldRendererProps } from "./types";

export type FieldRendererComponent = ComponentType<BaseFieldProps<unknown>>;

const rendererRegistry = new Map<string, FieldRendererComponent>();

const BUILT_IN_RENDERERS = new Set([
  "text",
  "richText",
  "number",
  "boolean",
  "date",
  "datetime",
  "select",
  "multiSelect",
  "json",
  "media",
  "reference",
  "tags",
  "category",
]);

export function registerFieldRenderer(fieldType: string, renderer: FieldRendererComponent): void {
  rendererRegistry.set(fieldType, renderer);
}

export function registerFieldRenderers(
  renderers: Record<string, FieldRendererComponent>
): void {
  for (const [fieldType, renderer] of Object.entries(renderers)) {
    registerFieldRenderer(fieldType, renderer);
  }
}

export function getFieldRenderer(fieldType: string): FieldRendererComponent | undefined {
  return rendererRegistry.get(fieldType);
}

export function hasFieldRenderer(fieldType: string): boolean {
  return rendererRegistry.has(fieldType);
}

export function isBuiltInRenderer(fieldType: string): boolean {
  return BUILT_IN_RENDERERS.has(fieldType);
}

export function getAllRegisteredFieldTypes(): string[] {
  return Array.from(rendererRegistry.keys());
}

export function getCustomRendererTypes(): string[] {
  return Array.from(rendererRegistry.keys()).filter(
    (fieldType) => !BUILT_IN_RENDERERS.has(fieldType)
  );
}
