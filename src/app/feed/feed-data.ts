// Placeholder content for the feed screen. These mirror the static markup from
// the original feed.html mockup; swap them for real DB queries when wiring the
// backend.

export type Story = {
  name: string;
  image: string;
  mini?: string;
};

export type Person = {
  name: string;
  role: string;
  image: string;
};

export type FriendStatus = "online" | "offline";

export type Friend = Person & {
  status: FriendStatus;
  lastSeen?: string;
};

export const stories: Story[] = [
  {
    name: "Ryan Roslansky",
    image: "/assets/images/card_ppl2.png",
    mini: "/assets/images/mini_pic.png",
  },
  {
    name: "Ryan Roslansky",
    image: "/assets/images/card_ppl3.png",
    mini: "/assets/images/mini_pic.png",
  },
  {
    name: "Ryan Roslansky",
    image: "/assets/images/card_ppl4.png",
    mini: "/assets/images/mini_pic.png",
  },
];

export const suggestedPeople: Person[] = [
  {
    name: "Steve Jobs",
    role: "CEO of Apple",
    image: "/assets/images/people1.png",
  },
  {
    name: "Ryan Roslansky",
    role: "CEO of Linkedin",
    image: "/assets/images/people2.png",
  },
  {
    name: "Dylan Field",
    role: "CEO of Figma",
    image: "/assets/images/people3.png",
  },
];

export const youMightLike: Person[] = [
  {
    name: "Radovan SkillArena",
    role: "Founder & CEO at Trophy",
    image: "/assets/images/Avatar.png",
  },
];

export const friends: Friend[] = [
  {
    name: "Steve Jobs",
    role: "CEO of Apple",
    image: "/assets/images/people1.png",
    status: "offline",
    lastSeen: "5 minute ago",
  },
  {
    name: "Ryan Roslansky",
    role: "CEO of Linkedin",
    image: "/assets/images/people2.png",
    status: "online",
  },
  {
    name: "Dylan Field",
    role: "CEO of Figma",
    image: "/assets/images/people3.png",
    status: "online",
  },
  {
    name: "Steve Jobs",
    role: "CEO of Apple",
    image: "/assets/images/people1.png",
    status: "offline",
    lastSeen: "5 minute ago",
  },
  {
    name: "Ryan Roslansky",
    role: "CEO of Linkedin",
    image: "/assets/images/people2.png",
    status: "online",
  },
  {
    name: "Dylan Field",
    role: "CEO of Figma",
    image: "/assets/images/people3.png",
    status: "online",
  },
  {
    name: "Dylan Field",
    role: "CEO of Figma",
    image: "/assets/images/people3.png",
    status: "online",
  },
  {
    name: "Steve Jobs",
    role: "CEO of Apple",
    image: "/assets/images/people1.png",
    status: "offline",
    lastSeen: "5 minute ago",
  },
];
