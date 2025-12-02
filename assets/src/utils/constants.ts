// Dimensions in centimeters
export const SHEET_WIDTH = 475; // Max width (approx 15ft 7in)
export const SHEET_LENGTH = 4450; // Total length (approx 146ft)

// House dimensions
export const HOUSE_RADIUS_12 = 183; // 6ft radius (12ft diameter)
export const HOUSE_RADIUS_8 = 122;  // 4ft radius (8ft diameter)
export const HOUSE_RADIUS_4 = 61;   // 2ft radius (4ft diameter)
export const BUTTON_RADIUS = 15;    // Approx 6 inches radius

// Line positions (relative to Tee Line)
export const HOG_LINE_OFFSET = 640; // 21ft from Tee Line
export const BACK_LINE_OFFSET = 183; // 6ft from Tee Line
export const HACK_OFFSET = 366; // 12ft from Tee Line (approx)
export const NEAR_HOUSE_THRESHOLD = 150; // 1.5 meters (~5ft) from outer ring

// Stone dimensions
export const STONE_RADIUS = 14.5; // Approx 11.4 inches diameter / 2 = 14.5cm radius

// Viewport settings
// We want to show from slightly above Hog Line to slightly below Back Line
export const VIEW_TOP_OFFSET = HOG_LINE_OFFSET; // Hog Line
export const VIEW_BOTTOM_OFFSET = BACK_LINE_OFFSET + (STONE_RADIUS * 2); // Back Line + 1 stone diameter

// Colors
export const COLOR_ICE = "#F0F8FF"; // Icy White
export const COLOR_RED = "#D22730"; // Standard Red
export const COLOR_BLUE = "#185494"; // Standard Blue
export const COLOR_WHITE = "#ffffff";
export const COLOR_BLACK = "#252333"; // Deep Lavender (using as black)
