import { FC } from 'react';
import { Breadcrumbs } from '@/components/blocks/Settings/Breadcrumbs';
import { CompanyType } from '@/types/type';
import data from '@/rules/departments';
import { EditableDepartmentList } from './EditableDepartmentList';

type Props = {
  company: CompanyType;
};

export const DepartmentRules: FC<Props> = (props) => {
  const defaultDepartments = data.map((el) => el.department);

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-1 flex-col gap-6 py-10">
        {props.company && <Breadcrumbs company={props.company} page="Department Rules" />}

        <div className="text-white text-[38px] font-normal font-['SF Pro'] justify-self-start">Department Rules</div>
      </div>

      <div className="flex flex-col w-full h-full overflow-y-scroll">
        <EditableDepartmentList initialDepartments={defaultDepartments} />
      </div>
    </div>
  );
};
