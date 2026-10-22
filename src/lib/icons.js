import {
  Sparkles, Dumbbell, BookOpen, Droplet, Bed, Brain, Leaf, Footprints, Smartphone, PenLine, Sunrise, Coffee,
  Music, Code, Wallet, Heart, Salad, Bike, Camera, GraduationCap, Wind, Mountain, Sprout, Moon,
  Briefcase, Users, Palette, Rocket, Target,
} from 'lucide-react';

export const HABIT_ICONS = {
  sparkles: Sparkles,
  dumbbell: Dumbbell,
  book: BookOpen,
  water: Droplet,
  sleep: Bed,
  brain: Brain,
  leaf: Leaf,
  walk: Footprints,
  phone: Smartphone,
  write: PenLine,
  sunrise: Sunrise,
  coffee: Coffee,
  music: Music,
  code: Code,
  money: Wallet,
  heart: Heart,
  food: Salad,
  bike: Bike,
  camera: Camera,
  study: GraduationCap,
  breathe: Wind,
  climb: Mountain,
  grow: Sprout,
  moon: Moon,
};

export const habitIcon = (name) => HABIT_ICONS[name] ?? Sparkles;

export const HABIT_SUGGESTIONS = [
  { name: 'Work out', icon: 'dumbbell' },
  { name: 'Read 20 pages', icon: 'book' },
  { name: 'Drink 2 litres of water', icon: 'water' },
  { name: 'Meditate for 10 minutes', icon: 'breathe' },
  { name: 'No phone for the first hour', icon: 'phone' },
  { name: 'In bed by 11', icon: 'sleep' },
  { name: 'Walk 8,000 steps', icon: 'walk' },
  { name: 'Write 300 words', icon: 'write' },
  { name: 'Eat a clean meal', icon: 'food' },
  { name: 'Learn something new', icon: 'study' },
];

export const GOAL_CATEGORIES = {
  health: { label: 'Health', icon: Heart },
  mind: { label: 'Mind', icon: Brain },
  career: { label: 'Career', icon: Briefcase },
  wealth: { label: 'Wealth', icon: Wallet },
  people: { label: 'Relationships', icon: Users },
  craft: { label: 'Craft', icon: Palette },
  adventure: { label: 'Adventure', icon: Rocket },
  growth: { label: 'Growth', icon: Sprout },
};

export const categoryOf = (key) => GOAL_CATEGORIES[key] ?? { label: 'Goal', icon: Target };
