# Verification record

21 October 2026

- 20 Node tests passed: behavior checks, rule overlap, disabled rules, Markdown generation, isolated evaluation, and timeline lifecycle.
- Go reference tests passed from `fixtures/go`: correct implementation plus deliberately faulty interface implementations.
- Browser UI checks completed in the in-app browser at desktop (1280 px) and phone (375 px) widths. Phone document width and content width both measured 375 px.
- Unprotected flow accepted the faulty implementation and showed stock 5 → -3.
- Protected flow rejected that proposal, preserved accepted source, repaired it, and completed a valid reservation with stock 5 → 3.
- Custom requests correctly reduced stock 5 → 3, then rejected an oversized request without mutation.
- Disabling INV-04 allowed the off-by-one candidate while the other three checks passed, exposing stock 4 instead of 3.
- Reduced motion used a stationary rejection scene and explanatory text in place of slapstick. Alternate mint skin rendered.
- Downloaded AGENTS.md was compared byte-for-byte with the generated contract and matched.
- Browser console showed no errors or warnings during the primary flow.

Only the available in-app browser was tested. This record does not claim separate Safari, Firefox, or Chrome coverage.

The original Sites project was registered, but source synchronization was blocked by the session's approval policy. No saved Site version or production deployment was completed. Local source and the standalone HTML remain usable.
