---
name: Password Reset Flow — Code Only
description: Password reset emails must use a 6-digit code entered on /reset-password?mode=code. Never put token/token_hash in the reset URL.
type: constraint
---

**Rule:** Password reset emails MUST send a manually-entered 6-digit code, not a clickable token link.

**Why:** Email security scanners (Gmail, Outlook, corporate spam filters) prefetch links in emails and consume Supabase's single-use recovery token before the real user clicks. This caused persistent "reset link is invalid or already used" errors.

**How to apply:**
- `supabase/functions/auth-email-hook/index.ts` must generate a clean URL like `${SITE_URL}/reset-password?mode=code` with NO `token`, `token_hash`, `code`, or `otp` query params. The 6-digit code goes in the email BODY only.
- `src/pages/ResetPassword.tsx` must NOT call `supabase.auth.verifyOtp` on page load. Verification happens only when the user submits email + code + new password.
- Never revert to Supabase's default `/verify?token=...` recovery link format.
- Never add `verifyOtp` calls inside `useEffect` on the reset page.

**Do not "simplify" this flow back to a click-through link. It will break for every user whose email provider prefetches links.**
