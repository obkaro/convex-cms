# Content Locking

Content locking prevents concurrent edit conflicts by allowing only one user to edit a content entry at a time. Locks automatically expire to prevent orphaned locks from blocking content indefinitely.

> **Note**: Content locking functions are available through the Admin API (`defineAdminAPI`) or by calling component functions directly. The examples below show the API patterns used by the Admin UI backend.

## How It Works

1. User opens content for editing → acquires lock
2. Lock auto-expires after configured duration (default 5 minutes)
3. User can renew lock to extend their editing session
4. User finishes editing → releases lock (or lock auto-expires)
5. Admins can force-release locks if needed

## Lock Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Unlocked   │────→│   Locked    │────→│  Expired    │
└─────────────┘     └─────────────┘     └─────────────┘
       ↑                   │                   │
       │                   │ renew             │
       │                   ↓                   │
       │            ┌─────────────┐            │
       └────────────│   Locked    │←───────────┘
         release    │  (renewed)  │    re-acquire
                    └─────────────┘
```

## Quick Start

### Acquiring a Lock

```typescript
// In your convex/admin.ts (via defineAdminAPI)
// or call component functions directly
const result = await ctx.runMutation(
  components.convexCms.contentLock.acquireLock,
  {
    id: entryId,
    userId: currentUserId,
    lockDuration: 5 * 60 * 1000, // 5 minutes (optional, this is the default)
  }
);

if (result.success) {
  // Lock acquired, user can edit
  console.log("Editing enabled");
} else {
  // Lock held by another user
  console.log(`Locked by ${result.currentLockHolder}`);
  console.log(`Expires at ${new Date(result.currentLockExpiresAt)}`);
}
```

### Checking Lock Status

```typescript
const status = await ctx.runQuery(
  components.convexCms.contentLock.checkLock,
  { id: entryId }
);

console.log(status.isLocked);      // true if currently locked
console.log(status.lockedBy);      // user ID of lock holder
console.log(status.lockExpiresAt); // expiration timestamp
```

### Releasing a Lock

```typescript
// Release when done editing
await ctx.runMutation(
  components.convexCms.contentLock.releaseLock,
  {
    id: entryId,
    userId: currentUserId,
  }
);
```

### Renewing a Lock

For long editing sessions, renew the lock periodically:

```typescript
// Renew every 2 minutes during editing
setInterval(async () => {
  try {
    await ctx.runMutation(
      components.convexCms.contentLock.renewLock,
      {
        id: entryId,
        userId: currentUserId,
        lockDuration: 5 * 60 * 1000, // Reset to 5 minutes
      }
    );
  } catch (error) {
    // Lock may have expired or been force-released
    console.log("Lock renewal failed:", error.message);
    // Prompt user to re-acquire or save their work
  }
}, 2 * 60 * 1000);
```

### Force-Releasing a Lock (Admin)

When a user abandons an editing session without releasing their lock:

```typescript
await ctx.runMutation(
  components.convexCms.contentLock.forceReleaseLock,
  {
    id: entryId,
    releasedBy: adminUserId, // For audit trail
  }
);
```

## Lock Behavior

### Acquisition Rules

| Scenario | Result |
|----------|--------|
| Entry not locked | Lock acquired |
| Locked by same user | Lock renewed |
| Locked by another user (expired) | Lock acquired |
| Locked by another user (active) | Acquisition fails |

### Update Protection

When content locking is enabled, updates to locked entries are restricted:

- **Lock owner**: Can update normally
- **Other users**: Receive error "Cannot update: entry is locked by user X"
- **Expired locks**: Any user can update (lock is automatically cleared)

## Configuration

Enable content locking in your CMS client:

```typescript
const cms = createCmsClient(components.convexCms, {
  features: {
    contentLocking: true,
  },
});
```

### Lock Duration Limits

- **Default duration**: 5 minutes
- **Maximum duration**: 4 hours

Requested durations are clamped to these limits.

## Admin UI Integration

The Admin UI automatically:

1. Acquires lock when user opens entry editor
2. Displays lock status and holder if locked by another user
3. Renews lock periodically during editing
4. Releases lock when user navigates away or closes editor
5. Shows "Force Release" option for admins on locked content

## Listing Locked Content

Administrators can view all currently locked content:

```typescript
const locked = await ctx.runQuery(
  components.convexCms.contentLock.listLockedEntries,
  {
    contentTypeName: optionalFilter,
    lockedBy: optionalUserFilter,
    paginationOpts: { numItems: 50 },
  }
);

for (const entry of locked.page) {
  console.log(`${entry._id} locked by ${entry.lockedBy}`);
}
```

## Admin API Functions

| Function | Description |
|----------|-------------|
| `checkContentLock` | Check if content is locked |
| `listLockedContent` | List all locked content |
| `acquireContentLock` | Lock content for editing |
| `releaseContentLock` | Release a lock |
| `renewContentLock` | Extend lock duration |
| `forceReleaseContentLock` | Force-release another user's lock |

## Best Practices

1. **Always release locks**: Release when navigation or editing completes
2. **Set up periodic renewal**: Renew every 2 minutes for long sessions
3. **Handle renewal failures**: Prompt user to save work if renewal fails
4. **Use force-release sparingly**: Only for genuinely abandoned locks
5. **Show lock status in UI**: Prevent users from trying to edit locked content

## Error Handling

```typescript
try {
  await ctx.runMutation(
    components.convexCms.contentLock.releaseLock,
    { id: entryId, userId }
  );
} catch (error) {
  if (error.message.includes("not locked")) {
    // Entry was already unlocked (expired or force-released)
  } else if (error.message.includes("locked by another user")) {
    // Lock was taken by someone else (race condition)
  } else {
    throw error;
  }
}
```

---

See also:
- [Admin API Reference](../api/admin-api.md): Content locking functions
- [Configuration Reference](../api/configuration.md): Enabling features
