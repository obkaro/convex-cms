/**
 * types.ts - Type Definitions Following TS2589 Best Practices
 *
 * This file demonstrates proper type organization to prevent TS2589 errors.
 *
 * Guidelines:
 * 1. Limit nesting to 3 levels
 * 2. Keep unions under 5 members
 * 3. Extract and reuse types
 * 4. Use explicit types over inference
 * 5. Avoid conditional types
 * 6. Keep definitions simple and flat
 */
import { Doc, Id } from './_generated/dataModel'

// ============================================================================
// BASE TYPES - Simple, flat definitions
// ============================================================================

export type UserId = Id<'users'>
export type PostId = Id<'posts'>
export type CommentId = Id<'comments'>

// ============================================================================
// ENTITY TYPES - Core data structures (≤20 fields, ≤3 levels deep)
// ============================================================================

/**
 * User entity
 * ✓ Flat structure with reference IDs instead of nesting
 */
export type User = {
  _id: UserId
  _creationTime: number
  name: string
  email: string
  profileId: Id<'profiles'> // Reference instead of nesting
  settingsId: Id<'settings'> // Reference instead of nesting
}

/**
 * User profile (separate from User to reduce field count)
 * ✓ Only 4 fields - well under the 20 field limit
 */
export type Profile = {
  _id: Id<'profiles'>
  bio: string
  avatar: string
  socialLinks: Record<string, string> // Limit Record usage
}

/**
 * User settings (separate from User)
 * ✓ Flat boolean flags instead of nested objects
 */
export type Settings = {
  _id: Id<'settings'>
  theme: 'light' | 'dark' // Small union (2 members)
  emailNotifications: boolean
  pushNotifications: boolean
  smsNotifications: boolean
}

// ============================================================================
// STATUS TYPES - Simple unions (≤5 members)
// ============================================================================

/**
 * Task status
 * ✓ Only 4 variants - under the 5 variant limit
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

/**
 * Event type
 * ✓ Simplified union with flat structure
 */
export type Event =
  | { type: 'created'; entityId: string; timestamp: number }
  | { type: 'updated'; entityId: string; changes: Record<string, unknown> }
  | { type: 'deleted'; entityId: string; reason: string }

// ============================================================================
// QUERY RESULT TYPES - For function return types
// ============================================================================

/**
 * User with profile data
 * ✓ Composed from simple types, not deeply nested
 */
export type UserWithProfile = {
  user: User
  profile: Profile
}

/**
 * Paginated result
 * ✓ Generic but simple - no complex constraints
 */
export type PaginatedResult<T> = {
  items: T[]
  cursor: string | null
  hasMore: boolean
}

/**
 * Post with author info
 * ✓ Only 2 levels deep
 */
export type PostWithAuthor = {
  _id: PostId
  title: string
  content: string
  authorId: UserId
  author: {
    name: string
    avatar: string
  }
  createdAt: number
}

// ============================================================================
// MUTATION INPUT TYPES - For function arguments
// ============================================================================

/**
 * User creation input
 * ✓ Flat structure, explicit fields
 */
export type CreateUserInput = {
  name: string
  email: string
  bio?: string // Optional fields marked explicitly
}

/**
 * User update input
 * ✓ Explicit optional fields instead of Partial<User>
 */
export type UpdateUserInput = {
  name?: string
  email?: string
  bio?: string
}

/**
 * Post creation input
 * ✓ Simple, flat structure
 */
export type CreatePostInput = {
  title: string
  content: string
  tags: string[]
}

// ============================================================================
// DOMAIN-SPECIFIC TYPES
// ============================================================================

/**
 * Permission grant
 * ✓ Using literals instead of enums
 */
export type Permission = 'read' | 'write' | 'delete' | 'admin'
export type Resource = 'user' | 'post' | 'comment'

export type Grant = {
  permission: Permission
  resource: Resource
  resourceId?: string
}

/**
 * Notification preferences
 * ✓ Flat boolean structure
 */
export type NotificationPreferences = {
  email: boolean
  push: boolean
  sms: boolean
  digest: boolean
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Type guards for runtime validation
 * ✓ Simple boolean returns, no complex conditionals
 */
export function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_id' in value &&
    'name' in value &&
    'email' in value
  )
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// ============================================================================
// ANTI-PATTERNS TO AVOID
// ============================================================================

// ❌ DON'T: Deep nesting
/*
type BadUser = {
  profile: {
    settings: {
      privacy: {
        notifications: {  // 4+ levels deep!
          email: boolean;
        };
      };
    };
  };
};
*/

// ❌ DON'T: Large unions
/*
type BadStatus = 
  | "pending"
  | "processing"
  | "validating"
  | "approved"
  | "rejected"
  | "cancelled"
  | "archived"
  | "deleted";  // Too many variants!
*/

// ❌ DON'T: Conditional types
/*
type BadConditional<T> = T extends string ? string[] : T extends number ? number[] : never;
*/

// ❌ DON'T: Recursive types
/*
type BadTree = {
  value: string;
  children: BadTree[];  // Self-referencing!
};
*/

// ❌ DON'T: Deeply nested Records
/*
type BadConfig = Record<string, Record<string, Record<string, unknown>>>;
*/

// ============================================================================
// EXPORT SUMMARY
// ============================================================================

// Export all types for use in Convex functions
export type {
  // Entities
  User,
  Profile,
  Settings,

  // Results
  UserWithProfile,
  PaginatedResult,
  PostWithAuthor,

  // Inputs
  CreateUserInput,
  UpdateUserInput,
  CreatePostInput,

  // Misc
  TaskStatus,
  Event,
  Grant,
  NotificationPreferences,
}
