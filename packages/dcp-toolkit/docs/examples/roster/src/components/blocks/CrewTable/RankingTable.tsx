import {
  Table as TableComponent,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  restrictToHorizontalAxis,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { parsePhoneNumber } from "react-phone-number-input";

import {
  ColumnDef,
  Row,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/Skeleton";
import { CompanyCrewMemberType, RankType, RateType } from "@/types/type";
import { Icon } from "@/components/ui/Icon";
import {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  UniqueIdentifier,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const RowDragHandleCell = ({ rowId }: { rowId: number }) => {
  const { attributes, listeners, isDragging } = useSortable({
    id: rowId,
  });

  return (
    <button {...attributes} {...listeners}>
      <Icon
        className={cn(
          "w-6 h-6 text-white duration-150",
          isDragging ? `cursor-grabbing opacity-100` : `cursor-grab opacity-50`
        )}
        name="drag"
      />
    </button>
  );
};

const DraggableCard = ({
  data,
  index,
  onRowClick,
}: {
  data: CompanyCrewMemberType;
  index: number;
  onRowClick?: (id: number) => void;
}) => {
  const {
    attributes,
    listeners,
    isDragging,
    transform,
    transition,
    setNodeRef,
  } = useSortable({
    id: data.id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition,
    opacity: isDragging ? 1 : 1,
    zIndex: isDragging ? 1 : 0,
    position: "relative",
  };

  return (
    <div
      {...attributes}
      {...listeners}
      ref={setNodeRef}
      style={style}
      key={data.id}
      onClick={() => onRowClick?.(data.id as unknown as number)}
      className={cn(
        "relative cursor-pointer w-[175px] h-[240px] p-6 bg-opacity-5 rounded-3xl duration-150 backdrop-blur-2xl flex-col justify-center gap-6 flex",
        isDragging ? "bg-lime-300 cursor-grabbing" : "bg-white cursor-grab"
      )}
    >
      <div
        className={cn(
          "w-[37px] h-[27px] pl-[5px] pr-2.5 py-1 gap-[3px] duration-150 rounded-[48px] justify-center items-center flex absolute top-2 left-2",
          isDragging
            ? "bg-lime-300 text-black"
            : "bg-white text-white bg-opacity-5"
        )}
      >
        <div className="opacity-40 justify-center items-center text-xs flex">
          #
        </div>
        <div className="text-sm font-medium">{index + 1}</div>
      </div>

      <button className="absolute right-2 top-2">
        <Icon
          name="drag-alternative"
          className={cn(
            "w-6 h-6",
            isDragging ? " text-lime-300" : " text-white opacity-50"
          )}
        />
      </button>

      <Avatar className="w-32 h-32 rounded-full">
        <AvatarFallback className="w-32 h-32 flex items-center justify-center">
          <span className="text-[98px] font-medium leading-none">
            {data.first_name?.[0]}
          </span>
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-1">
        <div className="text-white text-xl font-bold text-center">
          {data.first_name} {!!data.last_name ? `${data.last_name?.[0]}.` : ""}
        </div>
      </div>
    </div>
  );
};

const DraggableRow = ({
  row,
  onRowClick,
}: {
  row: Row<
    CompanyCrewMemberType & {
      rate?: number | null;
      rateType?: "hour" | "day" | "week" | null;
    }
  >;
  onRowClick?: (id: number) => void;
}) => {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition,
    opacity: isDragging ? 1 : 1,
    zIndex: isDragging ? 1 : 0,
    position: "relative",
  };
  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      key={row.id}
      onClick={() => onRowClick?.(row.original.id as unknown as number)}
      className="border-b cursor-pointer hover:bg-white hover:bg-opacity-5 border-zinc-600 border-opacity-20 last-of-type:border-transparent"
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell
          className="h-14 p-2 px-4 text-white text-opacity-95 text-base font-normal leading-none"
          key={cell.id}
        >
          {cell.column.id === "rate" ? (
            /* JANK: dragging not working, rates not accessible if writing render in columns. Workaround for now */
            <>
              {row?.original?.rate
                ? `$${row?.original?.rate} / ${row.original.rateType}`
                : "-"}
            </>
          ) : (
            <>{flexRender(cell.column.columnDef.cell, cell.getContext())}</>
          )}
        </TableCell>
      ))}
    </TableRow>
  );
};

export const RankingTable: React.FC<{
  loading: boolean;
  data: CompanyCrewMemberType[];
  selectedDepartment?: string | null;
  selectedRole?: string | null;
  onRowClick?: (id: number) => void;
  companyId: string;
}> = ({ loading, data: d, selectedRole, onRowClick, companyId }) => {
  const [data, setData] = useState<CompanyCrewMemberType[]>(d);
  const [rankData, setRankData] = useState<RankType | null>(null);
  const [rates, setRates] = useState<RateType[]>([]);
  const [loadingRatesRanks, setLoadingRatesRanks] = useState<boolean>(false);

  const supabase = createClient();

  useEffect(() => {
    if (!selectedRole) return;

    setLoadingRatesRanks(true);

    Promise.all([
      supabase
        .from("role_rate")
        .select()
        .in(
          "crew_member",
          d.map(({ id }) => id)
        )
        .eq("role", selectedRole?.toLocaleLowerCase())
        .then(({ data }) => {
          setRates(data ?? []);
        }),
      supabase
        .from("rank")
        .select()
        .eq("company", companyId)
        .eq("role", selectedRole?.toLowerCase())
        .then(({ data }) => {
          setRankData(data?.[0] ?? null);
        }),
    ]).then(() => setLoadingRatesRanks(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, selectedRole, d]);

  useEffect(() => {
    if (!rankData || !rankData.crew) {
      setData(d);
      return;
    }

    const rankSet = new Set(rankData.crew);

    const rankedData = d.filter((item) => rankSet.has(item.id));
    const unrankedData = d.filter((item) => !rankSet.has(item.id));

    const orderedRankedData = rankData.crew
      .map((rankId) => rankedData.find((item) => item.id === rankId))
      .filter((item) => item); // This filter removes any undefined entries if some ids in rankData.crew are not found in rankedData

    const combinedData = [...orderedRankedData, ...unrankedData];

    /* @ts-ignore */
    setData(combinedData);
  }, [d, rankData]);

  const dataIds = useMemo<UniqueIdentifier[]>(
    () => data?.map(({ id }) => id),
    [data]
  );

  const columns = useMemo<
    ColumnDef<
      CompanyCrewMemberType & {
        rate?: number | null;
        rateType?: "hour" | "day" | "week";
      }
    >[]
  >(
    () => [
      {
        accessorKey: "name",
        enableHiding: false,
        header: "Name",
        size: 220,
        cell: ({ row }) => {
          return (
            <div className="flex gap-2 items-center font-medium">
              <RowDragHandleCell rowId={row.id as unknown as number} />
              {row.original?.name}
            </div>
          );
        },
      },
      {
        id: "rank",
        header: "Rank",
        cell: ({ row }) => {
          return (
            <div className="flex gap-2 items-center">
              <div className="text-white text-opacity-60 font-medium">
                {row.index + 1}
              </div>
            </div>
          );
        },
      },
      {
        id: "rate",
        header: "Rate",
      },
      {
        accessorKey: "email",
        header: "Email",
        enableHiding: false,
      },
      {
        accessorKey: "phone",
        cell: ({ row }) => {
          const val: string | null = row?.original?.phone;

          if (!val) return <></>;
          const parsedPhone = parsePhoneNumber(val, "US");

          return parsedPhone?.formatNational();
        },
        header: "Phone",
        enableHiding: false,
      },
      {
        id: "shoots",
        cell: ({ row }) => {
          const shoots = [
            ...new Set([
              /* @ts-ignore */
              ...(row?.original?.call_sheet_member
                ?.map((m: { project: string }) => m.project)
                .filter(Boolean) ?? []),
            ]),
          ];
          return shoots?.length ?? 0;
        },
        header: "Shoots",
        enableHiding: false,
      },
      /*       {
        id: "locations",
        size: 220,
        cell: ({ row }) => {
          const rawLocations = [
            
            ...new Set([
              ...((row?.original?.role_department_map as any[])
                ?.map((r) => r.location)
                ?.filter(Boolean) ?? []),
            ]),
          ];

          return (
            <div className="flex justify-end items-center gap-1">
              <Icon className="w-6 min-w-6 h-6" name="pinAlternative" />
              <div className="flex leading-none items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap">
                {rawLocations.length ? (
                  <>
                    {rawLocations?.[0]}
                    {rawLocations.length > 1 &&
                      ` , + ${rawLocations.length - 1} other${
                        rawLocations.length - 1 !== 1 ? "s" : ""
                      }`}
                  </>
                ) : (
                  "-"
                )}
              </div>
            </div>
          );
        },
        enableHiding: false,
        header: () => <div className="text-right">Locations</div>,
      }, */
    ],
    [selectedRole]
  );

  const saveRank = async (d: CompanyCrewMemberType[]) => {
    const ids = d?.map(({ id }) => id);

    if (rankData?.id) {
      await supabase
        .from("rank")
        .update({ crew: ids })
        .eq("id", rankData.id)
        .then(({ error }) => {
          if (error) {
            toast.error("Something went wrong");
            return;
          }
          toast.success("Ranking updated");
        });
      return;
    }

    await supabase
      .from("rank")
      .insert({
        crew: ids,
        role: selectedRole?.toLocaleLowerCase(),
        company: companyId,
      })
      .then(({ error }) => {
        if (error) {
          toast.error("Something went wrong");
          return;
        }
        toast.success("Ranking updated");
      });
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id as unknown as string,
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id);
        const newIndex = dataIds.indexOf(over.id);
        saveRank(arrayMove(data, oldIndex, newIndex));
        return arrayMove(data, oldIndex, newIndex); //this is just a splice util
      });
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 0.01,
      },
    }),
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div className="p-[18px] rounded-3xl border border-white border-opacity-10 backdrop-blur-2xl flex flex-col gap-2 overflow-hidden">
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        <div className="flex items-center mb-1 gap-2 w-full overflow-scroll min-h-[240px]">
          <>
            {loading || loadingRatesRanks ? (
              <>
                <Skeleton className="w-[175px] h-[240px] rounded-3xl" />
                <Skeleton className="w-[175px] h-[240px] rounded-3xl" />
                <Skeleton className="w-[175px] h-[240px] rounded-3xl" />
              </>
            ) : (
              <SortableContext
                items={dataIds}
                strategy={horizontalListSortingStrategy}
              >
                {data.map((d, i) => (
                  <DraggableCard
                    key={`${d.id}-${i}`}
                    data={d}
                    index={i}
                    onRowClick={onRowClick}
                  />
                ))}
              </SortableContext>
            )}
          </>
        </div>
      </DndContext>
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        <TableComponent>
          <TableHeader className="sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b border-zinc-600 border-opacity-20"
              >
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className="text-white z-100 bg-[#0A0A0A] text-opacity-95 text-base leading-none font-bold h-14 p-0 px-4"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading || loadingRatesRanks ? (
              <>
                {[...new Array(10)].map((i) => (
                  <TableRow
                    key={i}
                    className="border-b border-zinc-600 border-opacity-20 last-of-type:border-transparent"
                  >
                    <TableCell className="h-14 p-0 px-4 text-white text-opacity-95 text-base font-normal leading-none">
                      <Skeleton className="w-[115px] h-4" />
                    </TableCell>
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
              <SortableContext
                items={dataIds}
                strategy={verticalListSortingStrategy}
              >
                <>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <DraggableRow
                        key={row.id}
                        row={{
                          ...row,
                          original: {
                            ...row.original,
                            rate: rates.find(
                              (r) => r.crew_member === row.original.id
                            )?.rate,
                            rateType: rates.find(
                              (r) => r.crew_member === row.original.id
                            )?.type,
                          },
                        }}
                        onRowClick={onRowClick}
                      />
                    ))
                  ) : (
                    <TableRow className="border-b border-zinc-600 border-opacity-20 last-of-type:border-transparent">
                      <TableCell colSpan={4} className="h-24 text-center">
                        No crew yet.
                      </TableCell>
                    </TableRow>
                  )}
                </>
              </SortableContext>
            )}
          </TableBody>
        </TableComponent>
      </DndContext>
    </div>
  );
};
