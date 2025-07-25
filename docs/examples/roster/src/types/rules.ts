export type LegacyRule = {
  aliases: string[];
  position: string;
  departments: string[];
  overridePosition: string;
};

export type ModernRule = {
  type: 'position' | 'department';
  aliases: string[];
  position?: string; // for position rules
  departments: string[];
  overridePosition?: string; // for position rules
  overrideDepartment?: string; // for department rules
};

export type Rule = LegacyRule | ModernRule;
