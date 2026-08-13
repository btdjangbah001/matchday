export const PHOTO_CREDITS = [
  { name: "Fatih Beki", url: "https://unsplash.com/@mfbeki" },
  { name: "Christian Agbede", url: "https://unsplash.com/@chriscreations__" },
  { name: "Krists Luhaers", url: "https://unsplash.com/@kristsll" },
] as const;

export const VENUE = {
  name: "Matchday Watch Centre",
  addressLines: ["PLACEHOLDER — street address", "PLACEHOLDER — city"],
  mapsUrl: "https://maps.google.com/?q=PLACEHOLDER",
  phone: "PLACEHOLDER — +233 XX XXX XXXX",
  email: "PLACEHOLDER — hello@example.com",
  doorsOpen: "Doors open 45 minutes before kickoff",
  facilities: [
    {
      emoji: "📺",
      title: "One big screen",
      body: "Every seat faces it. No craning, no split attention, no muted commentary.",
    },
    {
      emoji: "🪑",
      title: "A seat that is yours",
      body: "Booked ahead and held for you, so arriving late costs you nothing.",
    },
    {
      emoji: "🍢",
      title: "Food and drink",
      body: "Independent vendors on site through the season. Bring an appetite.",
    },
    {
      emoji: "🅿️",
      title: "Parking on site",
      body: "A reserved bay, booked with your seat. No circling the block at kickoff.",
    },
  ],
} as const;
