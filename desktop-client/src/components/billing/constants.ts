export const MERCHANT_STATE_CODE = '19'; // West Bengal

export interface HsnPreset {
  code: string;
  name: string;
  gst: number;
  category: string;
}

export const HSN_PRESETS: HsnPreset[] = [
  { code: "1006", name: "Rice (5% GST)", gst: 5, category: "Groceries & Food Essentials" },
  { code: "1101", name: "Wheat Flour / Atta (5% GST)", gst: 5, category: "Groceries & Food Essentials" },
  { code: "1701", name: "Sugar (5% GST)", gst: 5, category: "Groceries & Food Essentials" },
  { code: "1512", name: "Edible Oils (5% GST)", gst: 5, category: "Groceries & Food Essentials" },
  { code: "0901", name: "Coffee & Tea (5% GST)", gst: 5, category: "Groceries & Food Essentials" },
  { code: "2106", name: "Sweets & Namkeens (12% GST)", gst: 12, category: "Groceries & Food Essentials" },

  { code: "3401", name: "Soaps & Toiletries (18% GST)", gst: 18, category: "Cosmetics & Personal Care" },
  { code: "3305", name: "Shampoo & Hair Care (18% GST)", gst: 18, category: "Cosmetics & Personal Care" },
  { code: "3306", name: "Toothpaste & Oral Hygiene (18% GST)", gst: 18, category: "Cosmetics & Personal Care" },
  { code: "3304", name: "Skincare & Cosmetics (18% GST)", gst: 18, category: "Cosmetics & Personal Care" },

  { code: "8517", name: "Mobiles & Smart Devices (18% GST)", gst: 18, category: "Electronics & Tech" },
  { code: "8471", name: "Computers, Keyboards & Mice (18% GST)", gst: 18, category: "Electronics & Tech" },
  { code: "8528", name: "TVs, Monitors & Screens (18% GST)", gst: 18, category: "Electronics & Tech" },
  { code: "8504", name: "Chargers & Power Adapters (18% GST)", gst: 18, category: "Electronics & Tech" },

  { code: "6109", name: "T-shirts & Knitted Wear (12% GST)", gst: 12, category: "Apparel & Footwear" },
  { code: "6203", name: "Men's Shirts & Trousers (12% GST)", gst: 12, category: "Apparel & Footwear" },
  { code: "6204", name: "Women's Clothing & Suits (12% GST)", gst: 12, category: "Apparel & Footwear" },
  { code: "6403", name: "Footwear & Shoes (12% GST)", gst: 12, category: "Apparel & Footwear" },

  { code: "4820", name: "Registers & Notebooks (12% GST)", gst: 12, category: "Stationery & Books" },
  { code: "9608", name: "Pens, Markers & Refills (18% GST)", gst: 18, category: "Stationery & Books" },
  { code: "4901", name: "Printed Books & Pamphlets (0% GST)", gst: 0, category: "Stationery & Books" },

  { code: "3004", name: "Medicines & Formulations (12% GST)", gst: 12, category: "Healthcare & Pharmacy" },
  { code: "9018", name: "Medical Instruments (12% GST)", gst: 12, category: "Healthcare & Pharmacy" }
];
