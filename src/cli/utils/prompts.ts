/**
 * Interactive prompts for CLI
 *
 * Uses @clack/prompts for a beautiful CLI experience.
 */

import * as clack from "@clack/prompts";
import type { SchemaTemplate } from "../templates/schemas/index.js";

export type { SchemaTemplate };

export interface InitPromptResult {
  template: SchemaTemplate;
  cancelled: boolean;
}

const TEMPLATE_OPTIONS = [
  {
    value: "blog" as const,
    label: "Blog",
    hint: "post, author, category",
  },
  {
    value: "docs" as const,
    label: "Documentation",
    hint: "page, section, navigation",
  },
  {
    value: "landing" as const,
    label: "Landing Page",
    hint: "hero, features, testimonials, FAQ",
  },
  {
    value: "ecommerce" as const,
    label: "E-commerce",
    hint: "product, category, FAQ",
  },
  {
    value: "blank" as const,
    label: "Blank",
    hint: "starter blog post",
  },
] as const;

export async function promptForTemplate(): Promise<InitPromptResult> {
  clack.intro("Convex CMS Setup");

  const template = await clack.select({
    message: "Select a content schema template:",
    options: TEMPLATE_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.label,
      hint: opt.hint,
    })),
  });

  if (clack.isCancel(template)) {
    clack.cancel("Setup cancelled.");
    return { template: "blank", cancelled: true };
  }

  return { template: template as SchemaTemplate, cancelled: false };
}

export function showIntro(): void {
  clack.intro("Convex CMS Setup");
}

export function showOutro(message: string): void {
  clack.outro(message);
}

export function showSpinner(message: string): ReturnType<typeof clack.spinner> {
  const s = clack.spinner();
  s.start(message);
  return s;
}

export function logStep(message: string): void {
  clack.log.step(message);
}

export function logSuccess(message: string): void {
  clack.log.success(message);
}

export function logWarning(message: string): void {
  clack.log.warn(message);
}

export function logError(message: string): void {
  clack.log.error(message);
}

export function logInfo(message: string): void {
  clack.log.info(message);
}

export function logMessage(message: string): void {
  clack.log.message(message);
}

export async function confirmAction(message: string): Promise<boolean> {
  const result = await clack.confirm({
    message,
  });

  if (clack.isCancel(result)) {
    return false;
  }

  return result;
}

export function note(message: string, title?: string): void {
  clack.note(message, title);
}

export { clack };
