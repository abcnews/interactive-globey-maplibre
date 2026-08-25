---
trigger: always_on
---

We have these variables available to us:
--text: #ccc;
--text-light: #888;
--background: #1a1a1a;
--background-alt: #2c2c2f;
--border: rgba(122, 123, 135, 0.5);

## Form Inputs
- **CMID Inputs**: CMID fields should never use `type="number"` (to avoid spin buttons / number increment arrows). Instead, use `type="text"` with keyboard hints: `inputmode="numeric"` and `pattern="[0-9]*"`.
