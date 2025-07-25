import { ModernRule } from '@/types/rules';
import { Position } from '@/rules/positions';

export const modernRuleToPosition = (modernRule: ModernRule | undefined): Position | undefined => {
  if (!modernRule || modernRule.type !== 'position' || !modernRule.position) {
    return undefined;
  }

  return {
    position: modernRule.position,
    overridePosition: modernRule.overridePosition || undefined,
    departments: modernRule.departments,
    aliases: modernRule.aliases,
  };
};
