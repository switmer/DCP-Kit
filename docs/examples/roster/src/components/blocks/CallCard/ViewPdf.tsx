import { Icon } from "@/components/ui/Icon";
import { createClient } from "@/lib/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export const ViewPdf: React.FC<{
  src: string;
  sheet: string;
  member: string;
  company: string;
}> = ({ src, sheet, member, company }) => {
  const supabase = createClient();
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (showPreview) {
      supabase
        .from("notification_log")
        .insert({
          type: "call_card_opened_pdf",
          call_sheet: sheet,
          call_sheet_member: member,
          company: company,
        })
        .then(() => {});
    }
  }, [showPreview]);

  if (!src) return null;

  return (
    <>
      <div
        className="flex flex-col gap-4 group cursor-pointer"
        onClick={() => setShowPreview(true)}
      >
        <div className="text-white text-base font-medium leading-tight w-full items-center gap-2 flex relative">
          View full call sheet
          <span className="h-5 px-2 font-600 flex items-center justify-center rounded-[40px] text-xs bg-white bg-opacity-20">
            PDF
          </span>
        </div>

        <div className="relative rounded-[16px] overflow-hidden w-full h-[200px] bg-card-gradient duration-100 cursor-pointer flex flex-col justify-end items-end after:absolute after:inset-0 after:bg-black/0 after:transition-all after:duration-200 group-hover:after:bg-black/10">
          <div className="absolute inset-2 overflow-hidden rounded-md pointer-events-none">
            <iframe
              src={`${src}#toolbar=0&scrollbar=0`}
              className="w-full h-full"
            />
          </div>
        </div>
      </div>

      <PdfPreview
        src={`${src}#toolbar=0&scrollbar=0`}
        setShowPreview={setShowPreview}
        showPreview={showPreview}
      />
    </>
  );
};

const PdfPreview: React.FC<{
  src: string;
  setShowPreview: (show: boolean) => void;
  showPreview: boolean;
}> = ({ src, setShowPreview, showPreview }) => {
  return (
    <AnimatePresence>
      {showPreview && (
        <motion.div
          className="fixed inset-0 bg-black z-50 flex justify-center items-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className={
              "max-w-[calc(100%-1rem)] flex flex-col gap-3 w-screen h-screen p-5 bg-inherit"
            }
          >
            <button
              onClick={() => setShowPreview(false)}
              className="w-10 h-10 absolute right-5 top-5 flex justify-center items-center rounded-[10px] bg-zinc-900 bg-opacity-80 hover:bg-opacity-100 duration-100"
            >
              <Icon name="cross" className="w-5 h-5 text-zinc-400" />
            </button>

            <div className="text-white/50 uppercase text-sm tracking-[1px] text-nowrap text-ellipsis overflow-hidden h-10 leading-10 w-[calc(100%-44px)]"></div>

            <div className="relative flex flex-1 flex-col">
              <AnimatePresence initial={false}>
                <motion.div
                  className="inset-0 absolute cursor-grab"
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.35 },
                  }}
                >
                  <div className="relative border-opacity-10 border flex flex-col w-full items-center justify-center overflow-hidden rounded-3xl z-0 h-full">
                    <iframe src={src} className="w-full h-full" />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
