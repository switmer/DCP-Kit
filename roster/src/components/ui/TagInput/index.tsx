import { useField } from "formik";
import { cn } from "@/lib/utils";
import React, { useCallback, useRef, useState } from "react";
import { Icon } from "../Icon";

export const TagInput: React.FC<any> = ({ className, ...props }) => {
  const [_field, _meta, helpers] = useField({
    name: props.name,
    validate: (v) => {
      if (!v.length) {
        return "Required";
      }
    },
  });
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);

  const query = useRef<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputKeyUp = useCallback(
    (e: any) => {
      if (e.key !== "Enter") {
        return;
      }

      helpers.setValue([
        /* @ts-ignore */
        ...new Set([...(props.values?.[props.name] ?? []), query.current]),
      ]);
      query.current = "";
    },
    [helpers, props.name, props.values]
  );

  return (
    <div className="relative">
      <div
        className={cn(
          className,
          "cursor-text flex items-center gap-[6px] flex-wrap"
        )}
        onClick={() => {
          inputRef.current?.focus();
        }}
      >
        {props?.values?.[props.name]?.map((v: string, i: number) => {
          return (
            <div
              key={i}
              className="leading-tight overflow-y-auto text-lime-300 text-sm font-medium bg-zinc-850 h-6 pr-1 pl-2 flex items-center gap-1 rounded-md"
            >
              {v}
              <div
                className="flex items-center justify-center w-4 h-4 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();

                  helpers.setValue(
                    /* @ts-ignore */
                    props?.values?.[props.name]?.filter((_, j) => i !== j)
                  );
                }}
              >
                <Icon name="cross" className="w-3 h-3 text-zinc-500" />
              </div>
            </div>
          );
        })}
        <input
          className="bg-transparent"
          type="text"
          name={props.name}
          value={query.current}
          onChange={(e) => {
            query.current = e.target.value;
            props?.handleChange?.(e);
          }}
          onKeyUp={handleInputKeyUp}
          onFocus={(e) => {
            setSuggestionsVisible(true);
            props.onFocus?.(e);
          }}
          placeholder={
            props.values?.[props.name]?.length ? "" : props.placeholder
          }
          autoComplete="off"
          onBlur={(e) => {
            setTimeout(() => {
              if (!query.current?.length) return;

              helpers.setValue([
                /* @ts-ignore */
                ...new Set([
                  ...(props.values?.[props.name] ?? []),
                  query.current,
                ]),
              ]);

              props?.resetSuggestions?.();
              setSuggestionsVisible(false);
              query.current = "";
            }, 300);
            props.onBlur?.(e);
          }}
          style={{
            flex: 1,
            width: `${query.current.length}ch`,
            minWidth: "5ch",
          }}
          ref={inputRef}
        />
      </div>
      {props?.suggestions.length > 0 && suggestionsVisible && (
        <div className="flex animate-in fade-in-0 flex-col absolute left-0 right-0 max-h-[160px] z-40 top-[52px] overflow-scroll bg-zinc-900 rounded-lg p-1 text-white text-opacity-95 shadow-md">
          {props?.suggestions.map((s: string, i: number) => {
            return (
              <div
                onClick={() => {
                  helpers.setValue([
                    /* @ts-ignore */
                    ...new Set([...(props.values?.[props.name] ?? []), s]),
                  ]);
                  query.current = "";
                  props?.resetSuggestions?.();
                  setSuggestionsVisible(false);
                }}
                className="px-2 py-1 cursor-pointer rounded-sm duration-100 text-base hover:bg-white hover:bg-opacity-10 hover:text-white hover:text-opacity-95"
                key={`${s}-${i}`}
              >
                {s}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
