export const CARD_VALUES = [
  { label: 'A', value: 11 },
  { label: 'K', value: 10 },
  { label: 'Q', value: 10 },
  { label: 'J', value: 10 },
  { label: '10', value: 10 },
  { label: '9', value: 9 },
  { label: '8', value: 8 },
  { label: '7', value: 7 },
  { label: '6', value: 6 },
  { label: '5', value: 5 },
  { label: '4', value: 4 },
  { label: '3', value: 3 },
  { label: '2', value: 2 },
  { label: 'Joker', value: 15 },
];

export const THEMES: { id: import("./types").Theme; name: string; swatch: string }[] = [
  { id: "glass", name: "Glass", swatch: "linear-gradient(135deg,#4f7bff,#a855f7,#ff6fa5)" },
  { id: "baize", name: "Green Baize", swatch: "linear-gradient(135deg,#17503c 50%,#c8a14a 50%)" },
  { id: "paper", name: "Scorepad", swatch: "#f6f9fc linear-gradient(#9bbad0 1px,transparent 1px) 0 0/9px 9px" },
  { id: "pop", name: "Block Party", swatch: "linear-gradient(90deg,#2f3bff 25%,#ffd60a 25% 50%,#ff6a2b 50% 75%,#3ddc97 75%)" },
];
