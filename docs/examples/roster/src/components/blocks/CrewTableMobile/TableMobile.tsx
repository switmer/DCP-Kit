import {
  Table as TableComponent,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/Table";
import { Avatar, AvatarFallback } from "@/components/ui/Avatar";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  OnChangeFn,
  ColumnDef,
} from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/Skeleton";
import { CompanyCrewMemberType } from "@/types/type";
import React, { useMemo } from "react";
import { searchDepartments } from "@/rules/departments";
import { capitalizeString } from "@/lib/utils";
import { useSearchPositions } from "@/store/crew";

export const TableMobile: React.FC<{
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
}) => {
  const { search: searchPositions } = useSearchPositions();
  const columns: Array<ColumnDef<any>> = useMemo(() => {
    const defs: Array<ColumnDef<any>> = [
      {
        accessorKey: "name",
        cell: ({ row }) => {
          const roleInitials = row.original.name
            ? row?.original?.name
                /* @ts-ignore */
                ?.split(" ")
                .map((word = "") => word[0])
                .join("") ?? "-"
            : "n/a";

          return (
            <div className="flex flex-auto items-center gap-1">
              <Avatar className="w-[24px] h-[24px] bg-transparent rounded-full">
                <AvatarFallback className="flex items-center justify-center w-full h-full">
                  <span className="text-[9px] font-medium leading-none text-xs">
                    {roleInitials}
                  </span>
                </AvatarFallback>
              </Avatar>

              <div className="font-medium">{row.original.name}</div>
            </div>
          );
        },
        enableHiding: false,
      },
      {
        id: "roles",
        accessorKey: "position",
        cell: ({ row }) => {
          let base = row?.original?.position;

          // if (department) {
          //   const dept = searchDepartments(department);
          //   const deptCheck = dept
          //     ? [
          //         dept?.department?.toLocaleLowerCase(),
          //         ...dept?.aliases?.map((a) => a?.toLocaleLowerCase()),
          //       ]
          //     : [department];
          //
          //   /* @ts-ignore */
          //   base = base?.filter(
          //     /* @ts-ignore */
          //     (v) =>
          //       v?.department?.some((vd: string) =>
          //         deptCheck.includes(vd?.toLocaleLowerCase())
          //       )
          //   );
          // }

          const roles: unknown[] = [
            /* @ts-ignore */
            ...new Set(
              base
                ?.map(
                  /* @ts-ignore */
                  (d) =>
                    searchPositions(d?.name?.toLocaleLowerCase())?.position ??
                    capitalizeString(d?.name)
                )
                .filter(Boolean)
            ),
          ];

          if (!roles?.length) return <></>;

          return (
            <div className="flex flex-col gap-1 flex-auto text-right">
              {roles.map((role: any) => {
                return (
                  <div
                    className="flex items-center justify-end gap-2 text-xs text-stone-500"
                    key={role}
                  >
                    {role}
                  </div>
                );
              })}
            </div>
          );
        },
        enableHiding: false,
      },
    ];

    return hideDepartment
      ? defs.filter((def) => def.id !== "department")
      : defs;
  }, []);

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
    <div className="flex flex-col gap-2 rounded-3xl overflow-hidden">
      {!!title && (
        <div
          onClick={() => setSelectedDepartment && setSelectedDepartment(title)}
          className="text-white text-xl font-medium pt-4 px-4 flex items-center gap-4 cursor-pointer"
        >
          {title}

          <div className="flex justify-center items-center w-[33px] h-6 bg-white bg-opacity-10 rounded-xl backdrop-blur-sm">
            <div className="text-white text-[13px] font-normal leading-tight">
              {data.length}
            </div>
          </div>
        </div>
      )}

      <TableComponent>
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
                table.getRowModel().rows.map((row, i) => (
                  <TableRow
                    onClick={() =>
                      onRowClick?.(row.original.id as unknown as number)
                    }
                    key={`${row.id}-${i}`}
                    className="flex justify-between items-center border-none cursor-pointer hover:bg-white hover:bg-opacity-5"
                  >
                    {row.getVisibleCells().map((cell) => (
                        <TableCell
                          className="flex items-center h-[40px] px-4 font-normal leading-none"
                        key={cell.id}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow className="border-none">
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
