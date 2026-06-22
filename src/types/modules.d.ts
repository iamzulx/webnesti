// Ambient declaration for the one JS-only dep that ships no .d.ts and has no
// @types package. sql.js and jsonwebtoken have real @types installed as
// devDependencies — do NOT declare them here or it shadows their named exports.
declare module "midtrans-client";
