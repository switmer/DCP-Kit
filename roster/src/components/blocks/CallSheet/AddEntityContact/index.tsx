import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { cn, makeName } from '@/lib/utils';
import React, { FC, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCompanyStore } from '@/store/company';
import { toast } from 'sonner';
import { Formik, FormikValues } from 'formik';
import { Field } from '@/components/blocks/CrewTable/AddCrew/Field';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { updateCallSheetTimestamp } from '@/lib/updateCallSheetTimestamp';

type Props = {
  entityName: string;
  entityId: string;
  projectId: string;
  sheetId: string;
  onSave: () => void;
  className?: string;
  iconClassName?: string;
};

export const AddEntityContact: FC<Props> = (props) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { activeCompany } = useCompanyStore();

  if (!activeCompany) {
    toast.error('No active company found');
    return;
  }

  const supabase = createClient();

  const handleSubmit = async (values: FormikValues) => {
    setIsLoading(true);

    const [first_name, last_name] = makeName(values.name);

    //-- create company_crew_member record.
    const { data: crewData, error: crewError } = await supabase
      .from('company_crew_member')
      .insert({
        company: activeCompany,
        name: values.name,
        first_name,
        last_name,
        email: values.email ? values.email : null,
        phone: values.phone ? values.phone : null,
      })
      .select()
      .single();

    if (!crewData || crewError) {
      console.error('Error: ', crewError);
      toast.error('Something went wrong creating crew member. Please try again.');

      setIsLoading(false);
      setOpen(false);

      return;
    }

    //-- check for existing project member.
    const projectOrConditions = [];
    if (values.phone) projectOrConditions.push(`phone.eq.${values.phone}`);
    if (values.email) projectOrConditions.push(`email.eq.${values.email}`);

    let projectMemberQuery = supabase
      .from('project_member')
      .select('*, project_position(*)')
      .eq('project', props.projectId);

    if (projectOrConditions.length > 0) {
      projectMemberQuery = projectMemberQuery.or(projectOrConditions.join(','));
    }

    const { data: existingProjectMembers } = await projectMemberQuery;

    let projectMemberId;
    let projectPositionId;
    const existingProjectMember = existingProjectMembers?.[0];

    if (existingProjectMember) {
      //-- use existing project member.
      projectMemberId = existingProjectMember.id;

      //-- check for existing position with same title/department.
      const existingPosition = existingProjectMember.project_position?.find(
        (pos) =>
          pos.title?.toLowerCase() === values.title?.toLowerCase() &&
          pos.department?.toLowerCase() === values.role?.toLowerCase(),
      );

      if (existingPosition) {
        projectPositionId = existingPosition.id;
      } else {
        //-- create new position for existing member.
        const { data: newPosition } = await supabase
          .from('project_position')
          .insert({
            title: values.title,
            department: values.role,
            project_member: projectMemberId,
            project: props.projectId,
          })
          .select('id')
          .single();

        projectPositionId = newPosition?.id;
      }
    } else {
      //-- create new project member.
      const { data: projectMember, error: projectMemberError } = await supabase
        .from('project_member')
        .insert({
          name: values.name,
          email: values.email,
          phone: values.phone,
          project: props.projectId,
          crew: crewData.id,
        })
        .select('id')
        .single();

      if (projectMemberError) {
        console.error('Error: ', projectMemberError);
        toast.error('Something went wrong creating project member. Please try again.');

        setIsLoading(false);
        setOpen(false);

        return;
      }

      projectMemberId = projectMember?.id;

      //-- create position for new member.
      const { data: projectPosition, error: positionError } = await supabase
        .from('project_position')
        .insert({
          project: props.projectId,
          project_member: projectMemberId,
          department: props.entityName,
          title: values.title,
        })
        .select('id')
        .single();

      if (positionError) {
        console.error('Error: ', positionError);
        toast.error('Something went wrong creating project position. Please try again.');

        setIsLoading(false);
        setOpen(false);

        return;
      }

      projectPositionId = projectPosition?.id;
    }

    //-- create call_sheet_member record.
    const { error: callSheetMemberError } = await supabase.from('call_sheet_member').insert({
      company: activeCompany,
      call_sheet: props.sheetId,
      project: props.projectId,
      project_position: projectPositionId,
      crew_member: crewData.id,
      call_time: values.call ?? null,
      wrap_time: values.wrap ?? null,
      isKey: values.isMain ?? false,
      order: -1,
      department: props.entityName, // Ensure department matches the entity name
    });

    if (callSheetMemberError) {
      console.error('Error: ', callSheetMemberError);
      toast.error('Something went wrong creating call sheet member. Please try again.');

      setIsLoading(false);
      setOpen(false);

      return;
    }

    //-- create entity_point_of_contact record.
    const { data: pocData, error: pocError } = await supabase
      .from('entity_point_of_contact')
      .insert({
        project_entity: props.entityId,
        project: props.projectId,
        name: values.name,
        phone: values.phone ?? null,
        email: values.email ?? null,
        // avatar: values.avatar,
        title: values.title ?? null,
        role: values.role ?? null,
        // call: values.call ?? null,
        // wrap: values.wrap ?? null,
        isMain: values.isMain ?? false,
      })
      .select()
      .single();

    if (!pocData || pocError) {
      console.error('Error: ', pocError);
      toast.error('Something went wrong adding contact. Please try again.');

      setIsLoading(false);
      setOpen(false);

      return;
    }

    // update call sheet's updated_at timestamp.
    await updateCallSheetTimestamp(supabase, props.sheetId);

    setIsLoading(false);
    setOpen(false);

    props.onSave();

    toast.success('Successfully added contact.');
  };

  return (
    <Dialog
      defaultOpen={open}
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
      }}
    >
      <DialogTrigger>
        <Button
          variant="outlineAccent"
          size="compact"
          className={cn('px-2 gap-1 justify-start pl-3 pr-4 hover:bg-lime-300/5 duration-150', props.className)}
        >
          <Icon name="plus-alt" className={cn('w-[18px] h-[18px] text-lime-300', props.iconClassName)} />
          Add Contact
        </Button>
      </DialogTrigger>

      <DialogContent className="gap-0">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items center gap-2 items-center">Add Contact</div>
          </DialogTitle>
        </DialogHeader>

        <Formik
          initialValues={{
            name: '',
            phone: '',
            email: '',
            avatar: '',
            title: '',
            role: '',
            call: '',
            wrap: '',
            isMain: false,
          }}
          validateOnBlur={true}
          validateOnMount={true}
          onSubmit={handleSubmit}
        >
          {({
            isValidating,
            isValid,
            touched,
            errors,
            values,
            submitForm,
            handleChange,
            handleBlur,
            setFieldValue,
          }) => {
            return (
              <>
                <div className="p-8 flex flex-col gap-5 max-w-[463px]">
                  <Field
                    label="Full Name"
                    name="name"
                    placeholder="e.g., Steve Witmer"
                    errors={errors}
                    touched={touched}
                    validate={(value: string) => {
                      if (!value) {
                        return 'Name is required';
                      }
                    }}
                    values={values}
                  />

                  <Field
                    label="Phone"
                    name="phone"
                    placeholder="e.g., (555) 867-5309"
                    errors={errors}
                    touched={touched}
                    type="tel"
                    // icon="phone"
                    values={values}
                    handleChange={handleChange}
                  />

                  <Field
                    label="Email"
                    name="email"
                    type="email"
                    placeholder="e.g., you@example.com"
                    errors={errors}
                    touched={touched}
                    validate={(value: string) => {
                      if (value && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(value)) {
                        return 'Valid email is required';
                      }
                    }}
                    // icon="email"
                    values={values}
                  />

                  <Field
                    label="Title"
                    name="title"
                    placeholder="e.g., Senior Manager"
                    errors={errors}
                    touched={touched}
                    validate={(value: string) => {
                      if (!value) {
                        return 'Title is required';
                      }
                    }}
                    values={values}
                  />

                  <Field
                    label="Role"
                    name="role"
                    placeholder="e.g., Brand Content"
                    errors={errors}
                    touched={touched}
                    // validate={(value: string) => {
                    //   if (!value) {
                    //     return 'Role is required';
                    //   }
                    // }}
                    values={values}
                  />

                  <div className="flex gap-2">
                    <Field
                      label="Call Time"
                      name="call"
                      placeholder="e.g., 10:00AM"
                      errors={errors}
                      touched={touched}
                      type="text"
                      // icon="pin"
                      values={values}
                      handleChange={handleChange}
                    />

                    <Field
                      label="Wrap Time"
                      name="wrap"
                      placeholder="e.g., 7:00PM"
                      errors={errors}
                      touched={touched}
                      type="text"
                      // icon="pin"
                      values={values}
                      handleChange={handleChange}
                    />
                  </div>
                </div>

                <div className="relative top-[-14px] flex items-center gap-2 pl-8">
                  <div
                    onClick={() => {
                      setFieldValue('isMain', !values.isMain);
                    }}
                    className={cn(
                      'relative flex items-center w-[37px] h-[20px] bg-zinc-600 rounded-full cursor-pointer',
                      values.isMain === true && 'bg-lime-300',
                    )}
                  >
                    <div
                      className={cn(
                        'relative left-[2px] w-[17px] h-[17px] rounded-full bg-zinc-900 transition-all duration-150',
                        values.isMain === true && 'left-[18px]',
                      )}
                    />
                  </div>

                  <div className="text-white/40 pl-[6px]">Main contact at company</div>
                </div>

                <DialogFooter>
                  <Button
                    className="px-4 text-sm font-semibold"
                    variant="outline"
                    size="compact"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>

                  <Button
                    className="px-4 min-w-[65px] text-sm font-semibold disabled:bg-opacity-20 disabled:pointer-events-none disabled:cursor-not-allowed"
                    variant="accent"
                    size="compact"
                    disabled={!isValid || isValidating || isLoading}
                    onClick={submitForm}
                  >
                    {!isLoading ? 'Save' : <LoadingIndicator dark size="small" />}
                  </Button>
                </DialogFooter>
              </>
            );
          }}
        </Formik>
      </DialogContent>
    </Dialog>
  );
};
