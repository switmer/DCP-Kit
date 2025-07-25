import { Icon } from "@/components/ui/Icon";
import { Position } from "@/rules/positions";
import { useState } from "react";

export const AliasInput = ({
  rule,
  setRule,
}: {
  rule: Position | null;
  setRule: (p: Position) => void;
}) => {
  const [add, setAdd] = useState(false);
  const [newValue, setNewValue] = useState("");

  return (
    <div className="flex flex-wrap gap-[10px] items-center">
      {rule?.aliases?.map((a) => (
        <div
          key={a}
          className="leading-tight overflow-y-auto text-white text-sm font-medium bg-zinc-500 bg-opacity-20 h-6 pr-1 pl-2 flex items-center gap-1 rounded-md"
        >
          {a}
          <div
            className="flex items-center justify-center w-4 h-4 cursor-pointer"
            onClick={() => {
              if (!rule) return;

              const aliases = rule?.aliases?.filter((al) => al !== a);

              setRule({
                ...rule,
                aliases,
              });
            }}
          >
            <Icon
              name="cross"
              className="w-3 h-3 text-white text-opacity-35 hover:text-opacity-45 duration-150"
            />
          </div>
        </div>
      ))}
      {!add ? (
        <div
          onClick={() => setAdd(true)}
          className="flex gap-1 cursor-pointer items-center text-sm font-medium text-white"
        >
          <div className="p-1">
            <Icon
              className="w-4 h-4 text-white text-opacity-60"
              name="plus-circle"
            />
          </div>
          Add {rule?.aliases?.length ? "another" : "an alias"}
        </div>
      ) : (
        <div className="flex items-center gap-1 bg-zinc-500 bg-opacity-20 pr-1 pl-2 rounded-md">
          <input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            style={{
              width: `${newValue.length}ch`,
              minWidth: "5ch",
            }}
            onBlur={() => {
              if (!newValue || !rule) {
                setAdd(false);
                return;
              }

              setRule({
                ...rule,
                aliases: [...(rule?.aliases ?? []), newValue],
              });
              setNewValue("");
              setAdd(false);
            }}
            autoFocus
            className="leading-tight bg-transparent overflow-y-auto text-white text-sm font-medium h-6 flex items-center gap-1"
          />
          <div
            className="cursor-pointer"
            onClick={() => {
              if (!newValue || !rule) {
                setAdd(false);
                return;
              }

              setRule({
                ...rule,
                aliases: [...(rule?.aliases ?? []), newValue],
              });
              setNewValue("");
              setAdd(false);
            }}
          >
            <Icon
              className="w-5 h-5 text-white text-opacity-60"
              name="checkmark-alternative"
            />
          </div>
        </div>
      )}
    </div>
  );
};
