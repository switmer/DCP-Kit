import { LegacyRule, ModernRule, Rule } from '@/types/rules';
import { isLegacyRule } from '@/lib/rules/isLegacyRule';
import { Position } from '@/rules/positions';

export const migrateLegacyRuleToModern = (rule: LegacyRule): ModernRule => {
  return {
    type: 'position',
    aliases: rule.aliases,
    position: rule.position,
    departments: rule.departments,
    overridePosition: rule.overridePosition,
  };
};

export const migrateRuleSet = (ruleSet: Position[] | Rule[]): ModernRule[] => {
  return ruleSet.map((rule) => {
    if (isLegacyRule(rule)) {
      return migrateLegacyRuleToModern(rule);
    }

    return rule as ModernRule;
  });
};
