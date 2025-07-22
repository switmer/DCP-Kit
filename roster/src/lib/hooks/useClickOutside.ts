import { useEffect, useRef } from "react";

function useOutsideClick(callback: () => void) {
  const ref = useRef<any>();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!event?.target) return;
      if (ref?.current && !ref?.current?.contains(event.target)) {
        callback();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, callback]);

  return ref;
}

export default useOutsideClick;
