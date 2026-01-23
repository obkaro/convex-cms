/**
 * Soft-delete utilities for CMS documents.
 *
 * Provides type-safe helpers for working with documents that use
 * the soft-delete pattern (deletedAt timestamp).
 */

export interface SoftDeletable {
  deletedAt?: number;
}

export function isDeleted<T extends SoftDeletable>(doc: T): boolean {
  return doc.deletedAt !== undefined;
}

export function isActive<T extends SoftDeletable>(doc: T): boolean {
  return doc.deletedAt === undefined;
}

export function filterActive<T extends SoftDeletable>(docs: T[]): T[] {
  return docs.filter(isActive);
}

export function filterDeleted<T extends SoftDeletable>(docs: T[]): T[] {
  return docs.filter(isDeleted);
}

export function requireNotDeleted<T extends SoftDeletable>(
  doc: T,
  errorFactory: () => Error
): asserts doc is T & { deletedAt: undefined } {
  if (isDeleted(doc)) {
    throw errorFactory();
  }
}

export function requireDeleted<T extends SoftDeletable>(
  doc: T,
  errorFactory: () => Error
): void {
  if (!isDeleted(doc)) {
    throw errorFactory();
  }
}
