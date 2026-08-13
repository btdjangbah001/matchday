export const PHOTO_CREDITS = [
  { name: "Austin", url: "https://unsplash.com/@austin_7792" },
  { name: "Katherine Bandin", url: "https://unsplash.com/@kbandin" },
  { name: "Allen Boguslavsky", url: "https://unsplash.com/@allenboguslavsky" },
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
      icon: "screen",
      title: "One big screen",
      body: "Every seat faces it. No craning, no split attention, no muted commentary.",
    },
    {
      icon: "seat",
      title: "A seat that is yours",
      body: "Booked ahead and held for you, so arriving late costs you nothing.",
    },
    {
      icon: "food",
      title: "Food and drink",
      body: "Independent vendors on site through the season. Bring an appetite.",
    },
    {
      icon: "parking",
      title: "Parking on site",
      body: "A reserved bay, booked with your seat. No circling the block at kickoff.",
    },
  ],
} as const;
