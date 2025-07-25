"use client";

import { FC, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { NoteType } from "@/types/type";
import { AnimatePresence, motion } from "framer-motion";
import { wrap } from "popmotion";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

type Props = {
  company: string;
  project: string;
  notes: NoteType[];
  setShowNotes: (b: boolean) => void;
  user: User;
  selectedNoteId: number | null;
};

const variants = {
  enter: (direction: number) => {
    return {
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    };
  },
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => {
    return {
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    };
  },
};

const swipeConfidenceThreshold = 10000;

const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

export const Notes: FC<Props> = ({
  notes,
  user,
  setShowNotes,
  company,
  project,
  selectedNoteId,
}) => {
  const [[index, direction], setCurrentIndex] = useState(() => {
    if (selectedNoteId) {
      const selectedIndex = notes.findIndex(
        (note) => note.id === selectedNoteId
      );
      return [selectedIndex !== -1 ? selectedIndex : 0, 0];
    }
    return [0, 0];
  });
  const supabase = createClient();
  const [acknowledgedNotes, setAcknowledgedNotes] = useState<number[]>([]);

  const currentIndex = wrap(0, notes.length, index);

  const paginate = (newDirection: number) => {
    const newIndex = index + newDirection;
    if (newIndex >= 0 && newIndex < notes.length) {
      setCurrentIndex([newIndex, newDirection]);
    } else if (newIndex >= notes.length) {
      setShowNotes(false);
    }
  };

  const onAcknowledge = async (id: number) => {
    const payload: Record<string, any> = {
      member: user.id,
    };

    if ("company" in notes[currentIndex]) {
      payload.notice = id;
    } else {
      payload.note = id;
    }

    await supabase.from("note_acknowledge").insert(payload);
    setAcknowledgedNotes((prev) => [...prev, id]);
  };

  const isAcknowledgeable = useMemo(() => {
    return (
      notes[currentIndex]?.acknowledgeable &&
      !acknowledgedNotes.includes(notes[currentIndex].id) &&
      notes[currentIndex].type === "before_details"
    );
  }, [acknowledgedNotes, currentIndex, notes]);

  const customGradient = useMemo(() => {
    const isLeftToRight = currentIndex % 2 === 0;
    const startAngle = isLeftToRight ? -45 : 45;

    return `linear-gradient(
        ${startAngle}deg,
        rgba(72, 72, 72, 0.1) 0%,
        rgba(214, 254, 80, 0.1) 80%,
        rgba(214, 254, 80, 0.2) 100%
      )`;
  }, [currentIndex]);

  const currentNote = notes[currentIndex];

  return (
    <div>
      <div
        className={
          "z-[100] max-w-[400px] mx-auto fixed top-0 bottom-0 left-0 right-0 flex flex-col gap-3 w-screen h-screen p-5 bg-inherit"
        }
      >
        <button
          onClick={() => setShowNotes(false)}
          className="w-10 h-10 absolute right-5 top-5 flex justify-center items-center rounded-[10px] bg-zinc-900 bg-opacity-80 hover:bg-opacity-100 duration-100"
        >
          <Icon name="cross" className="w-5 h-5 text-zinc-400" />
        </button>

        <div className="text-white/50 uppercase text-sm tracking-[1px]">
          {company}
        </div>

        <div className="text-xl font-medium">{project}</div>

        <div className="flex gap-1 items-center mb-3">
          {notes.map((n, i) => {
            return (
              <div
                key={n.id}
                className={cn(
                  "h-0.5 rounded-[43px] flex-1 duration-150",
                  currentIndex >= i ? "bg-[#c9fb65]" : "bg-white/30"
                )}
              ></div>
            );
          })}
        </div>

        <div className="relative flex flex-1 flex-col">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              className="inset-0 absolute cursor-grab"
              key={currentIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.35 },
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragEnd={(e, { offset, velocity }) => {
                const swipe = swipePower(offset.x, velocity.x);

                if (swipe < -swipeConfidenceThreshold) {
                  if (!isAcknowledgeable) paginate(1);
                } else if (swipe > swipeConfidenceThreshold) {
                  paginate(-1);
                }
              }}
            >
              <div
                className="relative flex flex-col w-full overflow-hidden p-6 rounded-3xl z-0 h-full"
                style={{
                  background: customGradient,
                  backdropFilter: "blur(6px)",
                }}
              >
                <div className="flex flex-col w-full flex-1 gap-3">
                  <div className="text-[32px] font-medium text-white py-2">
                    {currentNote?.title}
                  </div>

                  <div className="text-[22px] text-white/90 flex-1">
                    {currentNote?.note}
                  </div>
                </div>

                {isAcknowledgeable ? (
                  <button
                    className="relative overflow-hidden rounded-3xl h-12"
                    onClick={() => {
                      if (isAcknowledgeable) {
                        onAcknowledge(currentNote.id);
                      }

                      if (currentIndex < notes.length - 1) {
                        paginate(1);
                      } else {
                        setShowNotes(false);
                      }
                    }}
                  >
                    <span className="absolute inset-[1.5px] z-10 flex items-center justify-center rounded-3xl text-black bg-accent">
                      <div className="pl-2 font-bold text-[15px]">
                        Acknowledge
                      </div>
                      <Icon
                        name="arrow-left"
                        className={`w-9 h-9 text-black rotate-180`}
                      />
                    </span>

                    <span
                      aria-hidden
                      className="absolute inset-0 z-0 scale-x-[1.5] blur before:absolute before:inset-0 before:top-1/2 before:aspect-[4/3] before:animate-disco before:bg-gradient-conic before:from-accent before:via-transparent before:to-transparent"
                    />
                  </button>
                ) : (
                  <>
                    <button
                      className="w-1/2 h-full absolute left-0 top-0 bottom-0"
                      onClick={() => paginate(-1)}
                    />
                    <button
                      className="w-1/2 h-full absolute right-0 top-0 bottom-0"
                      onClick={() => paginate(1)}
                    />
                  </>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex justify-center pt-3">
          <div
            className="flex items-center justify-center w-[155px] h-[30px] px-2 rounded-full"
            style={{ background: "rgba(72, 72, 72, 0.25)" }}
          >
            <Icon name="logo" className="w-4 h-4 text-white pr-1" />

            <span className="text-[12px] text-white/80 pr-1">Powered by</span>
            <span className="text-[12px] text-white font-medium">Roster</span>
          </div>
        </div>
      </div>
    </div>
  );
};
