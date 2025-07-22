import { LegacyRule, ModernRule } from '@/types/rules';

export const migrateLegacyRuleToModern = (rule: LegacyRule): ModernRule => {
  return {
    type: 'position',
    aliases: rule.aliases,
    position: rule.position,
    departments: rule.departments,
    overridePosition: rule.overridePosition,
  };
};
