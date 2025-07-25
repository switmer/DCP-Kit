'use client';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const SettingsSidebar = () => {
  const pathName = usePathname();

  return (
    <div className="flex flex-col min-w-[300px] max-w-[300px] sticky top-0 p-8 min-h-screen gap-6 overflow-auto max-sm:hidden">
      <div className="text-white text-[28px] font-normal">Settings</div>
      <div className="flex flex-col gap-3">
        <Link
          className={cn(
            'flex justify-between items-center text-white text-opacity-60 h-10 px-2 text-lg rounded-md cursor-pointer hover:text-opacity-100 duration-150',
            pathName === '/settings/users' && 'text-opacity-100 bg-white bg-opacity-5',
          )}
          href={'/settings/users'}
        >
          Users
        </Link>

        <Link
          className={cn(
            'flex justify-between items-center text-white text-opacity-60 h-10 px-2 text-lg rounded-md cursor-pointer hover:text-opacity-100 duration-150',
            pathName === '/settings/notices' && 'text-opacity-100 bg-white bg-opacity-5',
          )}
          href={'/settings/notices'}
        >
          Company Notices
        </Link>

        <Link
          className={cn(
            'flex justify-between items-center text-white text-opacity-60 h-10 px-2 text-lg rounded-md cursor-pointer hover:text-opacity-100 duration-150',
            pathName === '/settings/department-rules' && 'text-opacity-100 bg-white bg-opacity-5',
          )}
          href={'/settings/department-rules'}
        >
          Department Rules
        </Link>
      </div>
    </div>
  );
};

/*  */
