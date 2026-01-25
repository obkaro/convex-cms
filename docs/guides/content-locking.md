# Content Locking

Content locking prevents concurrent edit conflicts by allowing only one user to edit a content entry at a time. Locks automatically expire to prevent orphaned locks from blocking content indefinitely.

## How It Works

1. User opens content for editing → acquires lock
2. Lock auto-expires after configured duration (default 30 minutes)
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
import { cms } from "./cms";

const result = await cms.contentLock.acquire(ctx, {
  id: entryId,
  userId: currentUserId,
  lockDuration: 30 * 60 * 1000, // 30 minutes (optional)
});

if (result.success) {
  // Lock acquired, user can edit
  console.log("Editing enabled until", new Date(result.entry.lockExpiresAt));
} else {
  // Lock held by another user
  console.log(`Locked by ${result.currentLockHolder}`);
  console.log(`Expires at ${new Date(result.currentLockExpiresAt)}`);
}
```

### Checking Lock Status

```typescript
const status = await cms.contentLock.check(ctx, {
  id: entryId,
});

console.log(status.isLocked);      // true if currently locked
console.log(status.lockedBy);      // user ID of lock holder
console.log(status.lockExpiresAt); // expiration timestamp
console.log(status.timeRemaining); // ms until expiration
console.log(status.isExpired);     // true if lock was held but expired
```

### Releasing a Lock

```typescript
// Release when done editing
await cms.contentLock.release(ctx, {
  id: entryId,
  userId: currentUserId,
});
```

### Renewing a Lock

For long editing sessions, renew the lock periodically:

```typescript
// Renew every 15 minutes during editing
setInterval(async () => {
  try {
    await cms.contentLock.renew(ctx, {
      id: entryId,
      userId: currentUserId,
      lockDuration: 30 * 60 * 1000, // Reset to 30 minutes
    });
  } catch (error) {
    // Lock may have expired or been force-released
    console.log("Lock renewal failed:", error.message);
    // Prompt user to re-acquire or save their work
  }
}, 15 * 60 * 1000);
```

### Force-Releasing a Lock (Admin)

When a user abandons an editing session without releasing their lock:

```typescript
await cms.contentLock.forceRelease(ctx, {
  id: entryId,
  releasedBy: adminUserId, // For audit trail
});
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

- **Default duration**: 30 minutes
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
const locked = await cms.contentLock.listLocked(ctx, {
  contentTypeId: optionalFilter,
  lockedBy: optionalUserFilter,
  paginationOpts: { numItems: 50 },
});

for (const entry of locked.page) {
  console.log(`${entry._id} locked by ${entry.lockedBy}`);
  console.log(`  Time remaining: ${entry.timeRemaining / 1000}s`);
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

1. **Always release locks** — Release when navigation or editing completes
2. **Set up periodic renewal** — Renew every 15 minutes for long sessions
3. **Handle renewal failures** — Prompt user to save work if renewal fails
4. **Use force-release sparingly** — Only for genuinely abandoned locks
5. **Show lock status in UI** — Prevent users from trying to edit locked content

## Error Handling

```typescript
try {
  await cms.contentLock.release(ctx, { id: entryId, userId: userId });
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
- [Admin API Reference](../api/admin-api.md) — Content locking functions
- [Configuration Reference](../api/configuration.md) — Enabling features
