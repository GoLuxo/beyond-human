import quotes from '../../shared/quotes.json';
import { dayOfYear } from './dates.js';

export { quotes };

export function dailyQuote(d = new Date()) {
  return quotes[(d.getFullYear() * 1000 + dayOfYear(d)) % quotes.length];
}

export function randomQuote(except) {
  let q = quotes[Math.floor(Math.random() * quotes.length)];
  while (quotes.length > 1 && q === except) q = quotes[Math.floor(Math.random() * quotes.length)];
  return q;
}
