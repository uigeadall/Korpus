import { notFound } from 'next/navigation';

/**
 * Адрес, на който няма страница. Коренният layout е под `[lang]`, затова
 * непознатото трябва да мине оттук, за да се покаже `not-found.tsx` с
 * менюто и на езика на страницата, а не голата страница на Next.
 */
export default function Nema() {
  notFound();
}
