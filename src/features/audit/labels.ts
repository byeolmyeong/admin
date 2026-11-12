import { strings } from '../../content/strings';

const t = strings.audit;
type Labels = Readonly<Record<string, string>>;

/** 문구가 없는 값(계약에 새로 생긴 값)은 받은 그대로 보인다. 물려받은 이름(toString 등)은 문구로 보지 않는다. */
const pick = (labels: Labels, key: string): string => (Object.prototype.hasOwnProperty.call(labels, key) ? (labels[key] ?? key) : key);

export const actionLabel = (action: string): string => pick(t.actions, action);
export const actorTypeLabel = (actorType: string): string => pick(t.actorTypes, actorType);
export const targetLabel = (targetType: string): string => pick(t.targets, targetType);
export const outcomeLabel = (outcome: string): string => pick(t.outcomes, outcome);

/** detail 의 키마다 값의 문구. status · category 는 문의 화면과 같은 말을 쓴다. */
const valueLabels: Readonly<Record<string, Labels>> = {
  ...t.detail.values,
  status: strings.inquiryStatus,
  category: strings.inquiries.categories,
};

const valueText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value) ?? '';
};

/** detail(코드 값만 담은 작은 객체)을 "키: 값" 글자들로. 모르는 키·값은 받은 그대로다. */
export const detailChips = (detail: Readonly<Record<string, unknown>> | null): string[] =>
  Object.entries(detail ?? {}).map(([key, value]) => {
    const text = valueText(value);
    const values = Object.prototype.hasOwnProperty.call(valueLabels, key) ? valueLabels[key] : undefined;
    return t.detail.chip(pick(t.detail.keys, key), values ? pick(values, text) : text);
  });
