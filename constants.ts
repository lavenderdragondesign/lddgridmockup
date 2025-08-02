export const GOOGLE_FONTS: string[] = [
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Source Sans Pro',
  'Raleway', 'PT Sans', 'Merriweather', 'Noto Sans', 'Poppins', 'Playfair Display',
  'Ubuntu', 'Lobster', 'Bebas Neue', 'Pacifico', 'Anton', 'Dancing Script', 'Inter'
];

export const FONT_FAMILIES: string[] = [
  // System fonts
  'Arial',
  'Helvetica',
  'Verdana',
  'Georgia',
  'Times New Roman',
  'Courier New',
  // Google Fonts
  ...GOOGLE_FONTS,
].filter((v, i, a) => a.indexOf(v) === i).sort(); // Unique and sorted

export const CANVAS_WIDTH = 2000;
export const CANVAS_HEIGHT = 1500;

export const LAVENDER_DRAGON_LOGO_B64 = '
// //
// 