// ─── Shipping Cost Calculator ─────────────────────────────────────────────────
// Used in: orderController.js (backend truth) + can be mirrored in frontend

/**
 * Calculate shipping cost
 * @param {number} cartTotal  - total price of all items in cart (₹)
 * @param {number} weightKg   - total weight of all items in cart (kg)
 * @returns {number} shipping cost in ₹
 */
function calculateShipping(cartTotal, weightKg) {
  // Rule 3 + 4: Free shipping overrides everything
  if (cartTotal >= 499) return 0;

  // Rule 1 + 2: ₹79 per kg, rounded up
  const roundedKg = Math.ceil(weightKg); // 1.2kg → 2, 0.3kg → 1
  return 79 * Math.max(roundedKg, 1);    // minimum 1kg = ₹79
}

module.exports = { calculateShipping };
