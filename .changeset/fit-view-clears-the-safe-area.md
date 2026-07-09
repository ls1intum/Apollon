---
"@tumaet/apollon": patch
---

Fixes diagram content being framed behind the notch, Dynamic Island, or home indicator on a phone. Fitting the view now keeps every node clear of the device's safe area on all four edges, whether or not any editor chrome sits there.

The zoom cluster now also honours the reduced-transparency and increased-contrast system settings, and floating chrome uses a lighter backdrop blur on touch devices, where the blur cost the most and showed the least.
