"use client";
import { cn } from "@/lib/utils";
import { AspectRatio } from "../AspectRatio";
import React, {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useResizeObserver, useIntersectionObserver } from "usehooks-ts";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { Icon } from "../Icon";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const Pdf: React.FC<{
  sheetSrc: string;
  className?: string;
  containerClassName?: string;
  wrapperClassName?: string;
  ratio?: number;
  rounded?: boolean;
  highlight?: string[];
  controls?: boolean;
}> = ({
  sheetSrc,
  className,
  containerClassName,
  wrapperClassName,
  ratio,
  rounded = true,
  highlight,
  controls,
}) => {
  const [isDocumentReady, setIsDocumentReady] = useState(false);

  const [pages, setPages] = useState<number>(0);
  const [scale, setScale] = useState(1.0);
  const [currentPage, setCurrentPage] = useState(1);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setPages(numPages);
    setIsDocumentReady(true);
  }

  const ref = useRef<HTMLDivElement>(null);
  const { height: wrapperHeight = 0 } = useResizeObserver({
    ref: ref,
    box: "border-box",
  });

  const observerOptions = useMemo(
    () => ({
      threshold: 0.5,
      root: ref.current,
    }),
    []
  );

  const scrollToPage = (pageNumber: number) => {
    if (ref.current) {
      ref.current.scrollTo({
        top: (pageNumber - 1) * wrapperHeight,
        behavior: "instant",
      });
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
      scrollToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < pages) {
      setCurrentPage((prev) => prev + 1);
      scrollToPage(currentPage + 1);
    }
  };

  function highlightPattern(text: string, patterns: string[]) {
    return patterns.reduce((highlightedText, pattern) => {
      return highlightedText.replace(
        pattern,
        (value) => `<mark>${value}</mark>`
      );
    }, text);
  }

  const textRenderer = useCallback(
    (textItem: any) => highlightPattern(textItem.str, highlight ?? []),
    [highlight]
  );

  const zoomIn = () => {
    if (scale < 5) {
      setScale((prevScale) => prevScale + 1);
    }
  };

  const zoomOut = () => {
    if (scale > 1) {
      setScale((prevScale) => prevScale - 1);
    }
  };

  // Reset state when sheetSrc changes
  useEffect(() => {
    setIsDocumentReady(false);
    setPages(0);
    setCurrentPage(1);
    setScale(1.0);
  }, [sheetSrc]);

  return (
    <div className={containerClassName}>
      {controls && (
        <>
          <div className="flex flex-col absolute top-[52px] left-2 z-10 gap-1 p-1 bg-neutral-700 bg-opacity-50 backdrop-blur-[20px] rounded-lg">
            <button
              className="cursor-pointer w-6 h-6 flex items-center justify-center bg-lime-300 bg-opacity-10 text-accent hover:bg-opacity-30 rounded-md"
              onClick={zoomIn}
            >
              <Icon name="plus" className="w-5 h-5" />
            </button>
            <button
              className="cursor-pointer w-6 h-6 flex items-center justify-center bg-lime-300 bg-opacity-10 text-accent hover:bg-opacity-30 rounded-md"
              onClick={zoomOut}
            >
              <Icon name="minus" className="w-5 h-5" />
            </button>
          </div>
          {!!pages &&
            scale === 1 &&
            (pages > 1 ? (
              <>
                <span className="flex z-10 items-center justify-center h-6 px-2 text-[13px] text-white rounded-xl backdrop-blur-md bg-neutral-700 bg-opacity-50 absolute bottom-2 right-2">
                  <button
                    className="flex items-center justify-center text-accent disabled:opacity-50 rotate-180"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                  >
                    <Icon name="chevron-small" className="w-5 h-5" />
                  </button>
                  <div className="w-10 text-center">
                    {currentPage} / {pages}
                  </div>
                  <button
                    className="flex items-center justify-center text-accent disabled:opacity-50"
                    onClick={goToNextPage}
                    disabled={currentPage === pages}
                  >
                    <Icon name="chevron-small" className="w-5 h-5" />
                  </button>
                </span>
              </>
            ) : (
              <span className="flex z-10 items-center justify-center h-6 px-2 text-[13px] text-white rounded-xl backdrop-blur-md bg-neutral-700 bg-opacity-50 absolute bottom-2 right-2">
                {currentPage} / {pages}
              </span>
            ))}
        </>
      )}
      <div
        className={cn(
          "p-2 bg-neutral-700 bg-opacity-25 backdrop-blur-[20px] relative flex w-full h-full overflow-hidden max-h-[calc(100vh-68px)]",
          wrapperClassName,
          rounded && "rounded-3xl",
          (pages > 1 || scale > 1) && "overflow-scroll"
        )}
        ref={ref}
      >
        <AspectRatio ratio={ratio ?? 1 / 1.41} className={cn(className)}>
          <div
            className={cn(
              "w-full h-fit",
              scale === 1 && "flex flex-col items-center"
            )}
          >
            <Document
              key={sheetSrc}
              file={`/callsheet-pdfs/${encodeURIComponent(sheetSrc)}?original=true`}
              onLoadSuccess={({ numPages }) => {
                onDocumentLoadSuccess({ numPages });
              }}
              loading={<></>}
            >
              {isDocumentReady &&
                Array.from(new Array(pages), (_, index) => (
                  <PdfPage
                    key={`page_${index + 1}`}
                    pageNumber={index + 1}
                    wrapperHeight={wrapperHeight}
                    scale={scale}
                    textRenderer={textRenderer}
                    observerOptions={observerOptions}
                    onIntersect={() => {
                      if (!pages || !wrapperHeight) {
                        return;
                      }
                      setCurrentPage(index + 1);
                    }}
                  />
                ))}
            </Document>
          </div>
        </AspectRatio>
      </div>
    </div>
  );
};

interface PdfPageProps {
  pageNumber: number;
  wrapperHeight: number;
  scale: number;
  textRenderer: (textItem: any) => string;
  observerOptions: IntersectionObserverInit;
  onIntersect: () => void;
}

const PdfPage: React.FC<PdfPageProps> = ({
  pageNumber,
  wrapperHeight,
  scale,
  textRenderer,
  observerOptions,
  onIntersect,
}) => {
  const { ref, isIntersecting } = useIntersectionObserver(observerOptions);

  useEffect(() => {
    if (isIntersecting) {
      onIntersect();
    }
  }, [isIntersecting, onIntersect]);

  return (
    <div ref={ref} key={`page_wrapper_${pageNumber}`}>
      <Page
        key={`page_${pageNumber}`}
        pageNumber={pageNumber}
        height={wrapperHeight}
        scale={scale}
        customTextRenderer={textRenderer}
      />
    </div>
  );
};
