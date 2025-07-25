import { LegacyRule, Rule } from '@/types/rules';
import { Position } from '@/rules/positions';

export const isLegacyRule = (rule: Position | Rule): rule is LegacyRule => {
  return !('type' in rule) && 'position' in rule;
};
