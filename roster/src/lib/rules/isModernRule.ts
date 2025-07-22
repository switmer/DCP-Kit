import { ModernRule, Rule } from '@/types/rules';

export const isModernRule = (rule: Rule): rule is ModernRule => {
  return 'type' in rule;
};
