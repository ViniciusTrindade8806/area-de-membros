"use client";
import { useEffect, useRef, useState } from "react";
import { Play, BookOpen, Clock, Layers, ArrowRight } from "lucide-react";
import { Module } from "@/lib/course";

export default function HeroCarousel({
  modules,
  lessonCount,
  startLabel,
  onStart,
  onBrowse,
}: {
  modules: Module[];
  lessonCount: (m: Module) => number;
  startLabel: (m: Module, i: number) => string;
  onStart: (m: Module, i: number) => void;
  onBrowse: (m: Module) => void;
}) {
  const [index, setIndex] = useState(0),
    [paused, setPaused] = useState(false);
  const pointer = useRef<number | null>(null);
  const count = modules.length;
  useEffect(() => {
    if (paused || count < 2) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % count);
    }, 7000);
    return () => clearInterval(timer);
  }, [paused, count]);
  if (!count) return null;
  const go = (i: number) => setIndex((i + count) % count);
  return (
    <section
      className="hero"
      role="region"
      aria-roledescription="carrossel"
      aria-label="Módulos em destaque"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onPointerDown={(e) => {
        if (e.pointerType !== "mouse") pointer.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (pointer.current === null) return;
        const dx = e.clientX - pointer.current;
        pointer.current = null;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      {modules.map((m, i) => (
        <div
          key={m.id}
          className={`hero-slide ${i === index ? "active" : ""}`}
          aria-hidden={i !== index}
          aria-roledescription="slide"
          aria-label={`${i + 1} de ${count}`}
        >
          <img
            className="hero-image"
            src={m.image}
            alt=""
            loading={i === 0 ? "eager" : "lazy"}
          />
          <div className="hero-shade" />
          <div className="hero-content">
            <div className="hero-meta">
              <span>
                <Layers size={14} /> Módulo {String(i + 1).padStart(2, "0")}
              </span>
              <i />
              <span>
                <BookOpen size={14} /> {lessonCount(m)} aulas
              </span>
              <i />
              <span>
                <Clock size={14} /> No seu ritmo
              </span>
            </div>
            <h1 className="display">{m.title}</h1>
            <p>{m.subtitle}</p>
            <div className="hero-actions">
              <button
                className="primary"
                tabIndex={i === index ? 0 : -1}
                onClick={() => onStart(m, i)}
              >
                <Play size={16} fill="currentColor" />
                {startLabel(m, i)}
              </button>
              <button
                className="secondary"
                tabIndex={i === index ? 0 : -1}
                onClick={() => onBrowse(m)}
              >
                Ver módulo <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      ))}
      {count > 1 && (
        <div className="hero-dots">
          {modules.map((m, i) => (
            <button
              key={m.id}
              className={i === index ? "active" : ""}
              aria-label={`Ir para ${m.name}`}
              aria-current={i === index}
              onClick={() => go(i)}
            >
              <i />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
