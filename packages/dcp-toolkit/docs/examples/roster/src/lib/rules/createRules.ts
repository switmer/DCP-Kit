import { ModernRule } from '@/types/rules';

export const createPositionRule = (
  originalPosition: string,
  overridePosition: string,
  departments: string[],
  aliases: string[] = [],
): ModernRule => {
  return {
    type: 'position',
    aliases,
    position: originalPosition,
    departments,
    overridePosition,
  };
};

export const createDepartmentRule = (
  originalDepartment: string,
  customDepartmentName: string,
  aliases: string[] = [],
): ModernRule => {
  return {
    type: 'department',
    aliases,
    departments: [originalDepartment],
    overrideDepartment: customDepartmentName,
  };
};
