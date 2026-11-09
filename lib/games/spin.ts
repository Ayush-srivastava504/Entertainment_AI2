// Shared between the spin API route and the spin wheel client page.
export const SPIN_COST = 40;
export const BONUS_CHANCE = 0.15;
export const BONUS_COINS = 25;
/** Coins paid back when the spin lands on an avatar you already own. */
export const DUPLICATE_COINS = 15;

// Six avatar slices and one bonus-coin slice. The labels only drive the legend.
export const AVATAR_SEGMENTS = 6;
export const WHEEL_SEGMENTS = [...Array.from({ length: AVATAR_SEGMENTS }, () => "Collectible avatar"), "Bonus coins"];
