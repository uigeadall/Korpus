import type { Ezik } from '@/i18n/ezik';

/**
 * Име, лого и контакти на едно място.
 * Марката още не е избрана — „Корпус" е работно име (виж SPEC, раздел 11.1).
 * Смяната на името и контактите става само тук.
 */

export const brand = {
  /** Работно име. ПРОМЕНИ, когато марката е избрана. */
  name: 'Корпус',
  /** Същото име на латиница — за английския и китайския сайт. */
  nameLatin: 'Korpus',
  /** Подзаглавие под логото */
  tagline: 'Корпусна мебел по индивидуален проект',
  /** Пътят до логото в /public. Докато няма лого, се ползва текстов знак. */
  logo: null as string | null,
  /** Домейн без схема, за canonical и OpenGraph */
  domain: 'example.bg', // ПРОВЕРИ
  contacts: {
    phone: '', // предстои
    phoneHref: '',
    email: '', // предстои
    /** Адрес на студиото — предстои */
    studio: '',
    city: { bg: 'България', en: 'Bulgaria', zh: '保加利亚' } satisfies Record<Ezik, string>,
  },
  /** Работно време за показване в контактите */
  hours: { bg: 'по уговорка', en: 'by appointment', zh: '需提前预约' } satisfies Record<Ezik, string>,
  /** Получател на запитванията (вътрешен имейл на екипа) */
  inboxEmail: process.env.TEAM_INBOX_EMAIL ?? '',
} as const;

export const legal = {
  /** Всички правни текстове са чернови до преглед от юрист. */
  draft: true,
  warrantyYears: 2,
  /** Срок на съхранение на запитвания без поръчка, месеци */
  inquiryRetentionMonths: 12,
} as const;

/** Името, както се пише на дадения език: кирилица у дома, латиница навън. */
export function imeNaMarkata(ezik: Ezik): string {
  return ezik === 'bg' ? brand.name : brand.nameLatin;
}
