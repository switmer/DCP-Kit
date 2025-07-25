import { Button } from '@/components/ui/Button';
import * as Sentry from '@sentry/nextjs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import React, { useState } from 'react';
import { AddCrewForm } from './Form';
import { FormikValues } from 'formik';
import { createClient } from '@/lib/supabase/client';
import { cn, makeName } from '@/lib/utils';
import { toast } from 'sonner';
import { CallSheetMemberType, CallSheetType, CompanyCrewMemberType } from '@/types/type';
import { processRole } from '@/lib/processRole';
import { useCrewStore, useSearchDepartments, useSearchPositions } from '@/store/crew';
import { formatPhoneNumber } from '@/lib/phone';
import { updateCallSheetTimestamp } from '@/lib/updateCallSheetTimestamp';
import { modernRuleToPosition } from '@/lib/rules/modernRuleToPosition';
import { searchDepartments } from '@/rules/departments';
import { createDepartmentRule } from '@/lib/rules/createRules';
import { Json } from '@/types/supabase';

export const AddCrew: React.FC<{
  companyId?: string;
  department?: string;
  position?: string;
  onUpdate: () => void;
  sheet?: CallSheetType;
  variant?: 'default' | 'secondary' | 'outline' | 'outlineAccent' | 'outlineAccentAlt' | 'ghost' | 'danger' | 'alert';
  buttonText?: string;
  iconName?: string;
  className?: string;
  iconClass?: string;
}> = ({ companyId, department, position, onUpdate, sheet, variant, buttonText, iconName, className, iconClass }) => {
  const [open, setOpen] = useState(false);
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const { search: searchPositions } = useSearchPositions();
  const { search: searchDepartmentRules } = useSearchDepartments();
  const { positionRules, positionRulesId, setPositionRules } = useCrewStore.getState();

  const onSubmitWithCallSheet = async (values: FormikValues) => {
    if (!companyId) return;

    setLoading(true);

    //-- build "or" conditions separately to account for null values.
    const orConditions = [];
    if (values.phone) orConditions.push(`phone.eq.${values.phone}`);
    if (values.email) orConditions.push(`email.eq.${values.email}`);

    //-- only perform OR if we have conditions.
    let query = supabase.from('company_crew_member').select().eq('company', companyId);

    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','));
    }

    let { data: found_crew_members, error: crewLookupError } = await query;

    if (crewLookupError) {
      toast.error('Error looking up crew member');
      setLoading(false);
      return;
    }

    let crew_member = (found_crew_members ?? [])[0];

    if (!crew_member) {
      const [first_name, last_name] = makeName(values.name);

      const { data, error } = await supabase
        .from('company_crew_member')
        .insert({
          company: companyId,
          email: values.email ? values.email : null,
          phone: values.phone ? values.phone : null,
          name: values.name,
          first_name,
          last_name,
        })
        .select()
        .single();

      if (error) {
        toast.error('Something went wrong creating crew member');
        setLoading(false);
        return;
      }

      crew_member = data;
    }

    try {
      await processRole(
        { title: values.position?.toLowerCase() } as CallSheetMemberType,
        { id: crew_member?.id, company: companyId } as CompanyCrewMemberType,
        [values.department].flat(),
        supabase,
        (query: string) => modernRuleToPosition(searchPositions(query)),
      );
    } catch (e) {
      Sentry.captureException(e);
    }

    //-- check for existing project member.
    const { data: existingProjectMember } = await supabase
      .from('project_member')
      .select('*, project_position(*)')
      /* @ts-ignore */
      .eq('project', sheet?.project?.id)
      .eq('crew', crew_member?.id)
      .single();

    let projectMemberId;
    let projectPositionId;

    if (existingProjectMember) {
      //-- use existing project member.
      projectMemberId = existingProjectMember.id;

      //-- check for existing position with same title/department.
      const existingPosition = existingProjectMember.project_position?.find(
        (pos) =>
          pos.title?.toLowerCase() === values.position?.toLowerCase() &&
          pos.department?.toLowerCase() === (department ?? values.department)?.toLowerCase(),
      );

      if (existingPosition) {
        projectPositionId = existingPosition.id;
      } else {
        //-- create new position for existing member.
        const { data: newPosition } = await supabase
          .from('project_position')
          .insert({
            title: values.position,
            department: department ?? values.department,
            project_member: projectMemberId,
            /* @ts-ignore */
            project: sheet?.project?.id,
          })
          .select('id')
          .single();

        projectPositionId = newPosition?.id;
      }
    } else {
      //-- create new project member.
      const { formattedPhone } = formatPhoneNumber(values.phone);
      const { data: projectMember } = await supabase
        .from('project_member')
        .insert({
          name: values.name,
          email: values.email,
          phone: formattedPhone || values.phone,
          /* @ts-ignore */
          project: sheet?.project?.id,
          crew: crew_member?.id,
        })
        .select('id')
        .single();

      projectMemberId = projectMember?.id;

      //-- create position for new member.
      const { data: projectPosition } = await supabase
        .from('project_position')
        .insert({
          title: values.position,
          department: department ?? values.department,
          project_member: projectMemberId,
          /* @ts-ignore */
          project: sheet?.project?.id,
        })
        .select('id')
        .single();

      projectPositionId = projectPosition?.id;
    }

    //-- create call sheet member with project position.
    const { error } = await supabase.from('call_sheet_member').insert({
      company: companyId,
      call_sheet: sheet?.id,
      order: -1,
      /* @ts-ignore */
      project: sheet?.project?.id,
      crew_member: crew_member?.id,
      project_position: projectPositionId,
    });

    if (error) {
      toast.error('Something went wrong');
      setLoading(false);
      return;
    }

    // update the call sheet's updated_at timestamp.
    if (sheet?.id) {
      await updateCallSheetTimestamp(supabase, sheet.id);
    }

    setLoading(false);
    setOpen(false);
    onUpdate();
    toast.success(`${values.name} added to your call sheet`);
  };

  const onSubmit = async (values: FormikValues) => {
    if (!companyId || !positionRulesId) return;

    setLoading(true);

    // check if any of the departments are custom (not in existing rules or static departments).
    const customDepartments = values.department.filter(
      (dept: string) => !searchDepartments(dept.toLowerCase()) && !searchDepartmentRules(dept.toLowerCase()),
    );

    if (customDepartments.length > 0 && companyId) {
      // create a new department rule.
      try {
        // create department rules for all custom departments.
        const newDepartmentRules = customDepartments.map((dept: string) =>
          createDepartmentRule(
            dept.trim(), // original department.
            dept.trim(), // custom department name.
            [], // no aliases initially.
          ),
        );

        // Add to existing rules
        const updatedRules = [...positionRules, ...newDepartmentRules];

        await supabase.from('crew_rule_set').upsert({
          id: positionRulesId,
          company: companyId,
          rule_set: updatedRules as unknown as Json,
        });

        setPositionRules(updatedRules);

        console.log(`Auto-created department rules for: ${customDepartments.join(', ')}`);
      } catch (error) {
        console.error('Failed to create department rules:', error);
        // Don't block the crew creation if rule creation fails
      }
    }

    //-- build "or" conditions separately to account for null values.
    const orConditions = [];
    if (values.phone) orConditions.push(`phone.eq.${values.phone}`);
    if (values.email) orConditions.push(`email.eq.${values.email}`);

    //-- only perform "or" if we have conditions.
    let query = supabase.from('company_crew_member').select('id').eq('company', companyId);

    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','));
    }

    let { data: found_crew_members, error: crewLookupError } = await query;

    if (crewLookupError) {
      toast.error('Error looking up crew member');
      setLoading(false);
      return;
    }

    let crew_member = (found_crew_members ?? [])[0];

    if (!crew_member) {
      const [first_name, last_name] = makeName(values.name);

      const { data, error } = await supabase
        .from('company_crew_member')
        .insert({
          company: companyId,
          email: values.email ? values.email : null,
          phone: values.phone ? values.phone : null,
          city: values.city ? values.city : null,
          state: values.state ? values.state : null,
          name: values.name,
          first_name,
          last_name,
        })
        .select()
        .single();

      if (error) {
        toast.error('Something went wrong creating crew member');
        setLoading(false);
        return;
      }

      await processRole(
        { title: values.position?.toLowerCase() } as CallSheetMemberType,
        { id: data?.id, company: companyId } as CompanyCrewMemberType,
        [values.department].flat(),
        supabase,
        (query: string) => modernRuleToPosition(searchPositions(query)),
      );

      // update the call sheet's updated_at timestamp.
      if (sheet?.id) {
        await updateCallSheetTimestamp(supabase, sheet.id);
      }

      setLoading(false);
      setOpen(false);

      onUpdate();

      toast.success(`${values.name} added to your crew`);

      return;
    }

    try {
      await processRole(
        { title: values.position?.toLowerCase() } as CallSheetMemberType,
        { id: crew_member?.id, company: companyId } as CompanyCrewMemberType,
        [values.department].flat(),
        supabase,
        (query: string) => modernRuleToPosition(searchPositions(query)),
      );
    } catch (e) {
      Sentry.captureException(e);

      toast.error('Something went wrong');

      setLoading(false);

      return;
    }

    // update the call sheet's updated_at timestamp.
    if (sheet?.id) {
      await updateCallSheetTimestamp(supabase, sheet.id);
    }

    setLoading(false);
    setOpen(false);

    onUpdate();

    toast.success(`${values.name} added to your crew`);
  };

  return (
    <Dialog defaultOpen={open} open={open} onOpenChange={(o) => setOpen(o)}>
      <DialogTrigger>
        <Button
          variant={variant ?? 'accent'}
          size={'compact'}
          className={cn(
            'text-sm font-bold gap-2 px-2',
            variant === 'secondary' && 'hover:bg-white/10',
            iconName === 'plus' && 'pr-4',
            className,
          )}
        >
          <Icon name={iconName ?? 'user'} className={cn('w-6 h-6', iconClass)} />
          {buttonText ?? 'Add Crew'}
        </Button>
      </DialogTrigger>

      <DialogContent
        className="gap-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Add crew</DialogTitle>
        </DialogHeader>

        <AddCrewForm
          onCancel={() => setOpen(false)}
          loading={loading}
          toSheet={!!sheet}
          onSubmit={!sheet ? onSubmit : onSubmitWithCallSheet}
          department={department}
          position={position}
        />
      </DialogContent>
    </Dialog>
  );
};
