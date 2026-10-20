# Technician demo and manual QA

Restart the existing backend after this update so `/api/recommend/demo` is available, then refresh the page. Use the README's normal dev or built-server commands. Do not run two servers on port 3001. No public hosting is required.

## No-charge recommendation walkthrough

1. Property: select Margaret Thompson (or add a customer/site). Selection advances to Inspection.
2. Choose **Use recorded system**, select diagnostic job, then tap **Not cooling**. These are reported facts, not a confirmed diagnosis. Optional age/specifications/notes are under Additional inspection details.
3. Choose **Try demo recommendations · no model call**. The server explicitly forces deterministic demo mode even if its normal AI configuration is live. No provider key or model request is used.
4. Read **DEMO MODE / NO MODEL CALLED** and **Suggested / Not yet approved**. Total is unchanged before approval. The demo suggests diagnostic:standard at 0.5 hours ($47.50 catalog labor charge).
5. Approve the suggestion. Open **Review selected items**, or on a phone tap the sticky **View N** button. Change hours to 1; catalog cost becomes $95.00. Close returns to the same workflow step.
6. Choose **Review estimate** inside the item editor. The receipt shows estimated subtotal $95.00 and **Final customer price: not set**. This is a draft cost estimate, not an approved selling price.
7. Blank scope is populated from selected items. Open Customize estimate & scope to edit it, or explicitly regenerate after changing items. Regeneration asks before replacing existing text. Add actual business branding, assumptions and exclusions as needed.
8. Print/save the draft; confirm scope, cost labels and unset final price are legible. Refresh to check saved data.

Normal **Generate AI Recommendations** uses the backend's configured mode and may incur API charges in live mode. This update made no paid requests. Demo behavior is deliberately conservative and does not simulate an AI diagnosis or equipment sizing.

## Mobile, tablet and accessibility checks — human verification required

At 375, 390, 768, 1024 and 1440px check no horizontal overflow and usable touch targets. At <=700px the desktop item editor is hidden; the sticky Items button opens a native modal drawer instead of requiring a scroll to a second editor. Desktop/tablet retain the existing side editor.

- Start midway through the inspection. Open drawer, change/remove items, close; the inspection and scroll position should remain usable.
- Opening focuses Close; Tab and Shift+Tab stay within the modal. Escape and Close dismiss it and restore focus to the opening control. Outside-page controls should be inert while open. Confirm background scroll is locked and drawer can scroll, including with the on-screen keyboard.
- Enter invalid quantities, close and reopen: typed invalid value and error should persist, last valid total remains, Review is disabled. Correct quantity and continue.
- On Review, Items opens the editor; return to receipt without changing customer or scope. Empty drawer remains closable. Test clearing a draft from drawer.
- Toggle several symptoms and add custom text. Removing a symptom should preserve custom text. At the 1,000-character limit no text is silently truncated to add a symptom.
- With backend stopped, generation failure should offer manual catalog/no-charge demo guidance. Demo still requires a running backend; it does not work offline. Restart and retry.
- Confirm malformed/empty recommendations do not add items. Actual malformed-provider and timeout cases are covered by injected test doubles, not manual production calls.
- Edit scope and change items: existing scope is preserved, so manually regenerate/reconcile it. Confirm overwrite prompt, long text wrapping and multi-page printing.

Browser discovery was empty during this development session. These interaction, screen-reader, soft-keyboard, viewport and print checks are NOT VERIFIED by automation. Automated markup/contract tests do not substitute for them.

Catalog shortcut: after adding a service, tap **Added ✓** to jump directly to that item in the drawer. Confirm its focus and scroll position, then close and verify focus returns to the catalog button. Labor results show one shared hint: Labor hours can be adjusted after adding an item. Data normalization notices should show three handled source aliases with No action needed.
