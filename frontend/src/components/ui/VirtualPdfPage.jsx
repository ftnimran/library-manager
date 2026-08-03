import { useState, useEffect, useRef } from "react";
import { Page } from "react-pdf";

export default function VirtualPdfPage({
  pageNumber,
  zoomScale,
  setPageNumber,
  setInputPage,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [originalSize, setOriginalSize] = useState({ width: 600, height: 848 });
  const containerRef = useRef(null);

  const getBaseScale = () => {
    if (window.innerWidth < 480) return 0.5;
    if (window.innerWidth < 768) return 0.7;
    return 1.5;
  };

  const [baseScale, setBaseScale] = useState(getBaseScale());

  useEffect(() => {
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setBaseScale(getBaseScale());
      }, 150);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const displayWidth = originalSize.width * zoomScale * baseScale;
  const displayHeight = originalSize.height * zoomScale * baseScale;

  useEffect(() => {
    if (!containerRef.current) return;
    const mountObserver = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: "150% 0px" },
    );
    const activeObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPageNumber(pageNumber);
          setInputPage(pageNumber);
        }
      },
      { rootMargin: "-40% 0px -40% 0px" },
    );
    mountObserver.observe(containerRef.current);
    activeObserver.observe(containerRef.current);
    return () => {
      mountObserver.disconnect();
      activeObserver.disconnect();
    };
  }, [pageNumber, setPageNumber, setInputPage]);

  return (
    <div
      ref={containerRef}
      id={`pdf-page-${pageNumber}`}
      className="pdf-page-wrapper shadow-2xl bg-white relative mb-4 sm:mb-8 transition-all max-w-full overflow-hidden"
      style={{ minHeight: displayHeight, minWidth: displayWidth }}
    >
      {isVisible ? (
        <Page
          pageNumber={pageNumber}
          renderTextLayer={true}
          renderAnnotationLayer={false}
          scale={zoomScale * baseScale}
          onLoadSuccess={(page) =>
            setOriginalSize({
              width: page.originalWidth,
              height: page.originalHeight,
            })
          }
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-text-muted bg-bg-light/30">
          <i className="fa-solid fa-spinner fa-spin mr-2"></i> Page {pageNumber}
        </div>
      )}
    </div>
  );
}
