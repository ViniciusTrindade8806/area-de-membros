"use client";
import { useEffect, useId, useRef, useState, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
export default function Swimlane({
  title,
  icon,
  actions,
  toolbar,
  empty,
  children,
}: {
  title: string;
  icon?: ReactNode;
  actions?: ReactNode;
  toolbar?: ReactNode;
  empty?: ReactNode;
  children: ReactNode;
}) {
  const rail = useRef<HTMLDivElement>(null),
    id = useId();
  const [edges, setEdges] = useState({ start: true, end: true });
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const update = () =>
      setEdges({
        start: el.scrollLeft < 2,
        end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
      });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [children]);
  function scroll(direction: number) {
    const el = rail.current!;
    el.scrollBy({
      left: direction * el.clientWidth * 0.8,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  const controls = !empty && (
    <div className="rail-controls">
      <button
        className="rail-arrow"
        aria-label={`Anterior: ${title}`}
        aria-controls={id}
        disabled={edges.start}
        onClick={() => scroll(-1)}
      >
        <ChevronLeft size={18} />
      </button>
      <button
        className="rail-arrow"
        aria-label={`Próximo: ${title}`}
        aria-controls={id}
        disabled={edges.end}
        onClick={() => scroll(1)}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
  return (
    <section className="swimlane" aria-label={title}>
      <div className="lane-head">
        <h2 className="lane-title">
          {icon}
          {title}
        </h2>
        {(actions || !toolbar) && (
          <div className="lane-actions">
            {actions}
            {!toolbar && controls}
          </div>
        )}
      </div>
      {toolbar && (
        <div className="lane-toolbar">
          <div className="lane-toolbar-items">{toolbar}</div>
          {controls}
        </div>
      )}
      {empty || (
        <div id={id} className="swimlane-track" ref={rail}>
          {children}
        </div>
      )}
    </section>
  );
}
