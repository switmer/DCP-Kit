import { Table as TableComponent, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { parsePhoneNumber } from 'react-phone-number-input';
import { Button } from '@/components/ui/Button';
import { ArrowDownIcon, ArrowUpIcon, CaretSortIcon } from '@radix-ui/react-icons';
import { Tooltip } from '@/components/ui/Tooltip';

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  Column,
  SortingState,
  OnChangeFn,
  ColumnDef,
} from '@tanstack/react-table';
import { Skeleton } from '@/components/ui/Skeleton';
import { CompanyCrewMemberType } from '@/types/type';
import React, { useMemo } from 'react';
import { searchDepartments } from '@/rules/departments';
import { capitalizeString } from '@/lib/utils';
import { useSearchDepartments, useSearchPositions } from '@/store/crew';
import { Editable } from '@/components/ui/Editable';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export const Table: React.FC<{
  loading: boolean;
  data: CompanyCrewMemberType[];
  setSelectedDepartment?: (dept: string | null) => void;
  department?: string | null;
  selectedRole?: string | null;
  sorting: SortingState;
  setSorting: OnChangeFn<SortingState>;
  title?: string;
  onRowClick?: (id: number) => void;
  hideDepartment?: boolean;
  handleMouseEnterCrew?: (crewMember: CompanyCrewMemberType, e: React.MouseEvent<HTMLDivElement>) => void;
  handleMouseLeaveCrew?: () => void;
  onUpdateDepartment?: (oldTitle: string, newTitle: string) => void;
}> = ({
  loading,
  data,
  setSelectedDepartment,
  department,
  sorting,
  setSorting,
  title,
  onRowClick,
  hideDepartment,
  handleMouseEnterCrew,
  handleMouseLeaveCrew,
  onUpdateDepartment,
}) => {
  const supabase = createClient();

  const handleUpdateDepartment = async (newTitle: string) => {
    if (!title || newTitle === title) return;

    onUpdateDepartment && onUpdateDepartment(title, newTitle);

    // setSelectedDepartment && setSelectedDepartment(newTitle);
  };

  const { search: searchPositions } = useSearchPositions();
  const { search: searchDepartmentRules } = useSearchDepartments();

  const columns: Array<ColumnDef<any>> = useMemo(() => {
    const defs: Array<ColumnDef<any>> = [
      {
        accessorKey: 'name',
        enableHiding: false,
        header: ({ column }) => {
          return <ColumnHeaderWithSorting {...{ column, name: 'Name' }} />;
        },
      },
      {
        id: 'department',
        accessorKey: 'position',
        enableHiding: false,
        header: ({ column }) => {
          return <ColumnHeaderWithSorting {...{ column, name: 'Department' }} />;
        },
        cell: ({ row }) => {
          let baseRoleDepartments = row?.original?.position;

          if (department) {
            /* @ts-ignore */
            baseRoleDepartments = [
              {
                department: department,
              },
            ];
          }

          const departments: unknown[] = [
            /* @ts-ignore */
            ...new Set(
              baseRoleDepartments
                /* @ts-ignore */
                ?.map((d) => d?.department)
                ?.flat()
                .filter(Boolean),
            ),
          ];

          if (!departments?.length) return null;

          return (
            <div className="flex flex-col gap-1">
              {departments.map((department) => {
                /* @ts-ignore */
                const d = department?.replaceAll('_', ' ');

                // try to find a custom department rule first.
                const departmentRule = searchDepartmentRules(d?.toLowerCase());

                let displayName;

                if (departmentRule && departmentRule.overrideDepartment) {
                  // Use custom department name from rules
                  displayName = departmentRule.overrideDepartment;
                } else {
                  // fall back to static department lookup, then capitalize original.
                  const staticDepartment = searchDepartments(d?.toLowerCase());

                  displayName = staticDepartment?.department ?? capitalizeString(d);
                }

                return (
                  <Tooltip content={d} key={department as string}>
                    <div className="max-w-[200px] leading-[20px] overflow-hidden text-ellipsis whitespace-nowrap">
                      {displayName}
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          );
        },
      },

      {
        id: 'roles',
        accessorKey: 'position',
        header: ({ column }) => {
          return <ColumnHeaderWithSorting {...{ column, name: 'Positions' }} />;
        },
        cell: ({ row }) => {
          let base = row?.original?.position;

          const roles: unknown[] = [
            /* @ts-ignore */
            ...new Set(
              base
                ?.map(
                  /* @ts-ignore */
                  (d) => searchPositions(d?.name?.toLocaleLowerCase())?.position ?? capitalizeString(d?.name),
                )
                .filter(Boolean),
            ),
          ];

          if (!roles?.length) return <></>;

          return (
            <div className="flex gap-1 flex-col">
              {roles.map((role) => {
                const roleInitials =
                  role
                    /* @ts-ignore */
                    ?.split(' ')
                    .map((word = '') => word[0])
                    .join('') ?? '-';

                return (
                  <div className="flex gap-2 items-center" key={role as string}>
                    <Avatar className="w-[24px] h-[24px] bg-transparent rounded-full">
                      <AvatarFallback className="w-full h-full bg-white bg-opacity-10 flex items-center justify-center">
                        <span className="text-white text-[9px] font-medium leading-none text-xs">{roleInitials}</span>
                      </AvatarFallback>
                    </Avatar>
                    {role as string}
                  </div>
                );
              })}
            </div>
          );
        },
        enableHiding: false,
      },
      {
        accessorKey: 'email',
        header: ({ column }) => {
          return <ColumnHeaderWithSorting {...{ column, name: 'Email' }} />;
        },
        enableHiding: false,
      },
      {
        accessorKey: 'phone',
        cell: ({ row }) => {
          const val: string | null = row?.original?.phone;

          if (!val) return <></>;
          const parsedPhone = parsePhoneNumber(val, 'US');

          return parsedPhone?.formatNational();
        },
        header: ({ column }) => {
          return <ColumnHeaderWithSorting {...{ column, name: 'Phone' }} />;
        },
        enableHiding: false,
      },
      /*       {
        id: "locations",
        cell: ({ row }) => {
          const rawLocations = [

            ...new Set([
              ...((row?.original?.role_department_map as any[])
                ?.filter((r) => !r?.deleted)
                ?.map((r) => r?.location)
                ?.filter(Boolean) ?? []),
            ]),
          ];

          return (
            <div className="leading-[20px] flex items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap">
              {rawLocations?.[0]}
              {rawLocations.length > 1 &&
                ` , + ${rawLocations.length - 1} other${
                  rawLocations.length - 1 !== 1 ? "s" : ""
                }`}
            </div>
          );
        },
        enableHiding: false,
        header: () => <div className="text-right">Locations</div>,
      }, */
    ];

    return hideDepartment ? defs.filter((def) => def.id !== 'department') : defs;
  }, [searchDepartmentRules, searchPositions, hideDepartment, department]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  return (
    <div className="flex flex-col gap-2 border bg-white bg-opacity-[0.02] border-white border-opacity-10 backdrop-blur-2xl rounded-3xl overflow-hidden">
      {!!title && (
        <div className="text-white text-2xl font-normal pt-5 px-4 flex items-center gap-4">
          <Editable
            type="text"
            value={title}
            onChange={handleUpdateDepartment}
            className="text-2xl font-normal cursor-pointer"
          />
          <div className="w-[33px] h-6 bg-white bg-opacity-10 rounded-xl backdrop-blur-sm justify-center items-center flex">
            <div className="text-white text-[13px] font-normal leading-tight">{data.length}</div>
          </div>
        </div>
      )}

      <TableComponent>
        <TableHeader className="sticky top-0 z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-b border-zinc-600 border-opacity-20">
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    className="text-white z-100 bg-[#0A0A0A] text-opacity-95 text-base leading-none font-bold h-14 p-0 min-w-[200px] px-4"
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {loading ? (
            <>
              {[...new Array(10)].map((_, i) => (
                <TableRow
                  key={i}
                  className="border-b border-zinc-600 border-opacity-20 last-of-type:border-transparent"
                >
                  <TableCell className="h-14 p-0 px-4 text-white text-opacity-95 text-base font-normal leading-none">
                    <Skeleton className="w-[115px] h-4" />
                  </TableCell>
                  <TableCell className="h-14 p-0 px-4 text-white text-opacity-95 text-base font-normal leading-none">
                    <div className="flex gap-2 items-center">
                      <Skeleton className="w-[24px] h-[24px] rounded-full" />
                      <Skeleton className="w-[100px] h-4" />
                    </div>
                  </TableCell>
                  <TableCell className="h-14 p-0 px-4 text-white text-opacity-95 text-base font-normal leading-none">
                    <Skeleton className="w-[115px] h-4" />
                  </TableCell>
                  <TableCell className="h-14 p-0 px-4 text-white text-opacity-95 text-base font-normal leading-none">
                    <Skeleton className="w-[115px] h-4" />
                  </TableCell>
                </TableRow>
              ))}
            </>
          ) : (
            <>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row, i) => {
                  return (
                    <TableRow
                      onMouseEnter={(e) => {
                        handleMouseEnterCrew && handleMouseEnterCrew(row.original, e);
                      }}
                      onMouseLeave={(e) => {
                        handleMouseLeaveCrew && handleMouseLeaveCrew();
                      }}
                      onClick={() => onRowClick?.(row.original.id as unknown as number)}
                      key={`${row.id}-${i}`}
                      className="border-b cursor-pointer hover:bg-white hover:bg-opacity-5 border-zinc-600 border-opacity-20 last-of-type:border-transparent"
                    >
                      {row.getVisibleCells().map((cell, n) => (
                        <TableCell
                          className="h-14 p-2 px-4 text-white text-opacity-95 text-base font-normal leading-none"
                          key={`${row.id}-${n}`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow className="border-b border-zinc-600 border-opacity-20 last-of-type:border-transparent">
                  <TableCell colSpan={4} className="h-24 text-center">
                    No crew yet.
                  </TableCell>
                </TableRow>
              )}
            </>
          )}
        </TableBody>
      </TableComponent>
    </div>
  );
};

const ColumnHeaderWithSorting = ({ column, name }: { column: Column<CompanyCrewMemberType>; name: string }) => {
  return (
    <Button
      variant="ghost"
      className="flex items-center gap-2 p-0"
      onClick={() => {
        if (column.getIsSorted() === 'desc') {
          column.clearSorting();
          return;
        }
        column.toggleSorting(column.getIsSorted() === 'asc');
      }}
    >
      {name}
      {column.getIsSorted() === 'desc' ? (
        <ArrowDownIcon className="h-3 w-3 opacity-90 text-lime-300" />
      ) : column.getIsSorted() === 'asc' ? (
        <ArrowUpIcon className="h-3 w-3 opacity-90 text-lime-300" />
      ) : (
        <CaretSortIcon className="h-3 w-3 opacity-50" />
      )}
    </Button>
  );
};
