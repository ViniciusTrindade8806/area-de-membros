"use client";
import { useEffect, useState, useRef } from "react";
import {
  Play,
  Lock,
  ArrowRight,
  ArrowLeft,
  Search,
  X,
  Check,
  ChevronRight,
  LogOut,
  BookOpen,
  LayoutGrid,
  Users,
  Upload,
  Plus,
  Menu,
  Clock,
  TrendingUp,
  Download,
  Settings,
  Compass,
  PlayCircle,
  History,
  Eye,
  Sparkles,
} from "lucide-react";
import dynamic from "next/dynamic";
import Swimlane from "@/components/swimlane";
import HeroCarousel from "@/components/hero-carousel";
import ContentEditor from "@/components/content-editor";
const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), {
  ssr: false,
});
import {
  demoLessons,
  modules as initialModules,
  Lesson,
  Module,
} from "@/lib/course";
import { supabase, configured } from "@/lib/supabase";

export default function Home() {
  const [modules, setModules] = useState<Module[]>(initialModules);
  const [view, setView] = useState("home"),
    [lessons, setLessons] = useState<Lesson[]>(configured ? [] : demoLessons),
    [active, setActive] = useState<Lesson | null>(null),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(false),
    [message, setMessage] = useState(""),
    [user, setUser] = useState<any>(null),
    [loading, setLoading] = useState(configured),
    [admin, setAdmin] = useState(false),
    [completed, setCompleted] = useState<string[]>([]),
    [positions, setPositions] = useState<Record<string, number>>({}),
    [token, setToken] = useState(""),
    [mobile, setMobile] = useState(false),
    [members, setMembers] = useState<any[]>([]),
    [busy, setBusy] = useState(false),
    [recovery, setRecovery] = useState(false),
    [laneModule, setLaneModule] = useState("all"),
    [laneStatus, setLaneStatus] = useState("all"),
    [scrolled, setScrolled] = useState(false);
  const segment = useRef(0),
    session = useRef("");
  async function api(action: string, data: Record<string, unknown> = {}) {
    const access = (await supabase?.auth.getSession())?.data.session
      ?.access_token;
    const r = await fetch("/api/platform", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access || ""}`,
      },
      body: JSON.stringify({ action, ...data }),
    });
    const j = await r.json();
    if (!r.ok)
      throw Error(j.error || "Não foi possível concluir. Tente novamente.");
    return j;
  }
  async function refresh() {
    try {
      const d = await api("catalog");
      setLessons(d.lessons);
      setModules(d.modules);
      setCompleted(
        d.progress.filter((p: any) => p.completed).map((p: any) => p.lesson_id),
      );
      setPositions(
        Object.fromEntries(
          d.progress.map((p: any) => [p.lesson_id, p.position]),
        ),
      );
      setAdmin(d.admin);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setUser(s?.user || null);
      if (
        event === "PASSWORD_RECOVERY" ||
        (event === "SIGNED_IN" &&
          new URLSearchParams(window.location.search).get("setup") === "1")
      )
        setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (user) void refresh();
  }, [user]);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 7000);
    return () => clearTimeout(timer);
  }, [message]);
  const ordered = [...lessons].sort(
    (a, b) =>
      modules.findIndex((m) => m.id === a.module) -
        modules.findIndex((m) => m.id === b.module) ||
      a.position - b.position ||
      a.id.localeCompare(b.id),
  );
  const next = ordered.find((l) => !completed.includes(l.id)) || ordered[0];
  function unlocked(l: Lesson) {
    const i = ordered.findIndex((x) => x.id === l.id);
    return (
      admin ||
      completed.includes(l.id) ||
      i === 0 ||
      ordered.slice(0, i).every((x) => completed.includes(x.id))
    );
  }
  const moduleOf = (l?: Lesson | null) =>
      modules.find((m) => m.id === l?.module),
    moduleLessons = (m: Module) => ordered.filter((l) => l.module === m.id),
    percent = lessons.length
      ? Math.round((completed.length / lessons.length) * 100)
      : 0,
    laneItems = ordered.filter(
      (l) =>
        (laneModule === "all" || l.module === laneModule) &&
        (laneStatus === "all" ||
          (laneStatus === "done"
            ? completed.includes(l.id)
            : unlocked(l) && !completed.includes(l.id))),
    );
  const lessonState = (l: Lesson) =>
    completed.includes(l.id)
      ? { icon: <Check size={13} />, label: "Concluída", tone: "done" }
      : !unlocked(l)
        ? { icon: <Lock size={13} />, label: "Bloqueada", tone: "locked" }
        : { icon: <Play size={13} />, label: "Disponível", tone: "open" };
  const duration = (l: Lesson) =>
    l.status === "demo"
      ? "Demonstração"
      : l.duration
        ? `${Math.ceil(l.duration / 60)} min`
        : "Em preparação";
  async function openLesson(l: Lesson) {
    if (!unlocked(l)) {
      setMessage("Conclua as aulas anteriores para liberar este conteúdo.");
      return;
    }
    setActive(l);
    setToken("");
    session.current = "";
    segment.current = positions[l.id] || 0;
    if (configured) {
      try {
        const d = await api("playback", { lessonId: l.id });
        setToken(d.token);
        session.current = d.sessionId;
      } catch (e) {
        setMessage((e as Error).message);
      }
    }
  }
  async function track(time: number) {
    if (!active || !session.current) return;
    if (time < segment.current || time - segment.current > 16) {
      segment.current = time;
      return;
    }
    if (time - segment.current < 8) return;
    const start = segment.current;
    segment.current = time;
    try {
      const d = await api("progress", {
        lessonId: active.id,
        start,
        end: time,
        sessionId: session.current,
      });
      setPositions((p) => ({ ...p, [active.id]: time }));
      if (d.completed)
        setCompleted((p) => (p.includes(active.id) ? p : [...p, active.id]));
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  async function auth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      if (recovery) {
        const r = await supabase!.auth.updateUser({
          password: String(f.get("password")),
        });
        if (r.error) throw r.error;
        setRecovery(false);
      } else {
        const r = await supabase!.auth.signInWithPassword({
          email: String(f.get("email")),
          password: String(f.get("password")),
        });
        if (r.error) throw r.error;
      }
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function adminAction(action: string, data: Record<string, unknown>) {
    setBusy(true);
    try {
      const r = await api(action, data);
      setMessage("Alterações salvas.");
      await refresh();
      return r;
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const nav = (v: string) => {
    setView(v);
    setActive(null);
    setMobile(false);
    if (v === "members" && configured)
      api("members")
        .then((d) => setMembers(d.members))
        .catch((e) => setMessage(e.message));
  };
  if (configured && (!user || recovery) && !loading)
    return (
      <main className="login">
        <img src="/brand/logo.png" alt="E-Drive GO" />
        <form onSubmit={auth} className="login-card">
          <span className="eyebrow">
            <Sparkles size={14} /> Jornada E-Drive GO
          </span>
          <h1 className="display">
            {recovery ? "Defina sua senha" : "Seu próximo passo começa aqui."}
          </h1>
          <p>Acesse a sua jornada de aprendizado.</p>
          {!recovery && (
            <label>
              E-mail
              <input name="email" type="email" required autoComplete="email" />
            </label>
          )}
          <label>
            Senha
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={recovery ? "new-password" : "current-password"}
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "Aguarde…" : recovery ? "Salvar senha" : "Entrar"}
            <ArrowRight size={18} />
          </button>
          {!recovery && (
            <button
              type="button"
              className="text-button"
              onClick={async (e) => {
                const email = (
                  e.currentTarget.form!.elements.namedItem(
                    "email",
                  ) as HTMLInputElement
                ).value;
                if (!email)
                  return setMessage(
                    "Preencha seu e-mail para recuperar a senha.",
                  );
                const r = await supabase!.auth.resetPasswordForEmail(email, {
                  redirectTo: window.location.origin,
                });
                setMessage(
                  r.error
                    ? r.error.message
                    : "Se o e-mail estiver cadastrado, você receberá as instruções.",
                );
              }}
            >
              Esqueci minha senha
            </button>
          )}
          <small>O acesso é exclusivo para clientes convidados.</small>
        </form>
        {message && (
          <div role="status" className="toast">
            {message}
          </div>
        )}
      </main>
    );
  return (
    <>
      <header
        className={`${view === "home" && !active && !loading ? "overlay" : ""} ${scrolled || mobile ? "scrolled" : ""}`}
      >
        <a className="brand" href="/" aria-label="E-Drive GO início">
          <img src="/brand/logo.png" alt="E-Drive GO" />
          <span>JORNADA</span>
        </a>
        <nav className={mobile ? "open" : ""}>
          <button
            className={view === "home" ? "selected" : ""}
            onClick={() => nav("home")}
          >
            Início
          </button>
          <button
            className={view === "journey" ? "selected" : ""}
            onClick={() => nav("journey")}
          >
            Minha jornada
          </button>
          <button
            className={view === "materials" ? "selected" : ""}
            onClick={() => nav("materials")}
          >
            Materiais
          </button>
        </nav>
        <div className="header-right">
          <button
            className="icon-button"
            aria-label="Buscar aulas"
            onClick={() => setSearch(!search)}
          >
            <Search size={20} />
          </button>
          <span className="header-divider" />
          <button
            className="profile"
            onClick={() => nav("profile")}
            aria-label="Meu perfil"
          >
            {user?.email?.[0]?.toUpperCase() || "GO"}
          </button>
          <button
            className="icon-button mobile-menu"
            aria-label="Abrir menu"
            onClick={() => setMobile(!mobile)}
          >
            <Menu />
          </button>
        </div>
      </header>
      {search && (
        <div className="searchbar">
          <Search size={20} />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setView("journey");
              setActive(null);
            }}
            placeholder="Qual será seu próximo aprendizado?"
            aria-label="Buscar aulas"
          />
          <button
            className="icon-button"
            onClick={() => {
              setSearch(false);
              setQuery("");
            }}
            aria-label="Fechar busca"
          >
            <X />
          </button>
        </div>
      )}
      {!configured && (
        <div
          className={`demo-bar ${view === "home" && !active && !loading ? "floating" : ""}`}
        >
          <span>
            <span className="status-dot" /> Demonstração · conteúdos
            ilustrativos
          </span>
          <button onClick={() => nav(view === "admin" ? "home" : "admin")}>
            {view === "admin"
              ? "Voltar para a jornada"
              : "Conhecer painel admin"}
            <ArrowRight size={13} />
          </button>
        </div>
      )}
      {loading ? (
        <main className="page">
          <h1>Carregando sua jornada…</h1>
        </main>
      ) : active ? (
        <main className="page lesson-page">
          <button className="text-button" onClick={() => setActive(null)}>
            <ArrowLeft size={16} /> Voltar à jornada
          </button>
          <div className="lesson-layout">
            <section>
              <div className="video-box">
                {active.playback_id && token ? (
                  <MuxPlayer
                    playbackId={active.playback_id}
                    tokens={{ playback: token }}
                    startTime={positions[active.id] || 0}
                    onTimeUpdate={(e) =>
                      void track((e.target as HTMLVideoElement).currentTime)
                    }
                    onSeeking={(e) => {
                      segment.current = (
                        e.target as HTMLVideoElement
                      ).currentTime;
                    }}
                    accentColor="#8b4ae3"
                  />
                ) : (
                  <div className="video-empty">
                    <img src={moduleOf(active)?.image} alt="" />
                    <div className="video-overlay">
                      <span className="video-heading">
                        <strong>{active.title}</strong>
                        <small>
                          <Eye size={14} />
                          {active.status === "demo"
                            ? "Aula demonstrativa"
                            : "Preparando seu vídeo"}
                        </small>
                      </span>
                      <span className="video-center">
                        <span className="watch-play">
                          <Play size={26} fill="currentColor" />
                        </span>
                        <span>
                          {active.status === "demo"
                            ? "O vídeo oficial ainda não foi publicado."
                            : "Aguarde o carregamento ou abra a aula novamente."}
                        </span>
                      </span>
                      <span className="video-bar">
                        <span className="progress-track">
                          <i style={{ width: "0%" }} />
                        </span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="lesson-meta">
                <span>
                  <Compass size={14} /> {moduleOf(active)?.name}
                </span>
                <i />
                <span>
                  <Clock size={14} /> {duration(active)}
                </span>
              </div>
              <h1>{active.title}</h1>
              <p className="description">{active.description}</p>
              {completed.includes(active.id) && (
                <p className="success">
                  <Check size={18} /> Aula concluída
                </p>
              )}
              {active.material_url && (
                <a
                  className="secondary"
                  href={active.material_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download size={16} /> Material da aula
                </a>
              )}
            </section>
            <aside className="lesson-aside">
              <h3>
                Nesta jornada
                <small>
                  {completed.length}/{lessons.length}
                </small>
              </h3>
              {ordered.map((l, i) => (
                <button
                  key={l.id}
                  className={`lesson-row ${active.id === l.id ? "current" : ""}`}
                  onClick={() => openLesson(l)}
                >
                  <span>
                    {completed.includes(l.id) ? (
                      <Check size={16} />
                    ) : unlocked(l) ? (
                      String(i + 1).padStart(2, "0")
                    ) : (
                      <Lock size={15} />
                    )}
                  </span>
                  <span>
                    {l.title}
                    <small>{moduleOf(l)?.name}</small>
                  </span>
                </button>
              ))}
            </aside>
          </div>
        </main>
      ) : view === "home" ? (
        <main>
          <HeroCarousel
            modules={modules}
            lessonCount={(m) => moduleLessons(m).length}
            startLabel={(m, i) =>
              i === 0
                ? completed.length
                  ? "Continuar jornada"
                  : "Começar minha jornada"
                : moduleLessons(m).every((l) => completed.includes(l.id)) &&
                    moduleLessons(m).length
                  ? "Rever módulo"
                  : "Assistir módulo"
            }
            onStart={(m, i) => {
              const target =
                i === 0
                  ? next
                  : moduleLessons(m).find((l) => !completed.includes(l.id)) ||
                    moduleLessons(m)[0];
              if (target) openLesson(target);
              else
                setMessage("As aulas deste módulo serão publicadas em breve.");
            }}
            onBrowse={(m) => {
              setQuery(m.name);
              nav("journey");
            }}
          />
          <div className="content">
            <section className="continue">
              <div className="lane-head">
                <h2 className="lane-title">
                  <History size={20} />
                  {completed.length
                    ? "Continue de onde parou"
                    : "Seu próximo passo"}
                </h2>
                <span className="lane-note">Um aprendizado de cada vez.</span>
              </div>
              <button
                className="watch-card"
                disabled={!next}
                onClick={() => next && openLesson(next)}
                aria-label={next ? `Assistir ${next.title}` : undefined}
              >
                <img src={moduleOf(next)?.image || modules[0].image} alt="" />
                <span className="watch-shade" />
                <span className="watch-top">
                  <span>
                    <strong className="watch-title">
                      {next?.title || "Sua jornada está sendo preparada"}
                    </strong>
                    <span className="watch-tag">
                      <Eye size={14} />
                      {next
                        ? positions[next.id]
                          ? "Em andamento"
                          : completed.length
                            ? "Próxima aula"
                            : "Comece aqui"
                        : "Novas aulas em breve"}
                    </span>
                  </span>
                  {next && (
                    <span className="watch-module">{moduleOf(next)?.name}</span>
                  )}
                </span>
                <span className="watch-play">
                  <Play size={28} fill="currentColor" />
                </span>
                <span className="watch-bar">
                  <small>
                    {completed.length}/{lessons.length}
                  </small>
                  <span className="progress-track">
                    <i style={{ width: `${percent}%` }} />
                    <b style={{ left: `${percent}%` }} />
                  </span>
                  <small>{percent}% da jornada</small>
                </span>
              </button>
            </section>
            <Swimlane
              title="Explore sua jornada"
              icon={<Compass size={20} />}
              actions={
                <span className="lane-note">{modules.length} módulos</span>
              }
            >
              {modules.map((m, i) => {
                const ls = moduleLessons(m),
                  locked = ls.length > 0 && !unlocked(ls[0]),
                  done =
                    ls.length > 0 && ls.every((l) => completed.includes(l.id));
                return (
                  <button
                    key={m.id}
                    className="poster"
                    onClick={() => {
                      setQuery(m.name);
                      nav("journey");
                    }}
                  >
                    <span
                      className="poster-art"
                      style={{ backgroundColor: m.color }}
                    >
                      <img src={m.image} alt="" loading="lazy" />
                      <span className="poster-shade" />
                      <span className="poster-kicker">
                        Módulo {String(i + 1).padStart(2, "0")}
                      </span>
                      {(locked || done) && (
                        <span className={`poster-badge ${done ? "done" : ""}`}>
                          {done ? <Check size={14} /> : <Lock size={14} />}
                        </span>
                      )}
                      <strong className="display poster-title">
                        {m.title}
                      </strong>
                    </span>
                    <span className="poster-info">
                      <strong>{m.name}</strong>
                      <span className="poster-meta">
                        <BookOpen size={13} /> {ls.length} aulas
                        <i />
                        {done ? (
                          <span className="tone-done">Concluído</span>
                        ) : locked ? (
                          <span className="tone-locked">Em breve</span>
                        ) : (
                          <span className="tone-open">Disponível</span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
            </Swimlane>
            <Swimlane
              title="Aulas"
              icon={<PlayCircle size={20} />}
              actions={
                <div
                  className="tabs"
                  role="group"
                  aria-label="Filtrar por estado"
                >
                  {[
                    ["all", "Todas"],
                    ["open", "Disponíveis"],
                    ["done", "Concluídas"],
                  ].map(([k, label]) => (
                    <button
                      key={k}
                      className={laneStatus === k ? "active" : ""}
                      aria-pressed={laneStatus === k}
                      onClick={() => setLaneStatus(k)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              }
              toolbar={
                <div
                  className="chips"
                  role="group"
                  aria-label="Filtrar por módulo"
                >
                  {[{ id: "all", name: "Todos" }, ...modules].map((m) => (
                    <button
                      key={m.id}
                      className={`chip ${laneModule === m.id ? "active" : ""}`}
                      aria-pressed={laneModule === m.id}
                      onClick={() => setLaneModule(m.id)}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              }
              empty={
                laneItems.length ? undefined : (
                  <div className="lane-empty">
                    <PlayCircle size={28} />
                    <span>
                      {laneStatus === "done"
                        ? "Nenhuma aula concluída neste filtro ainda."
                        : "Nenhuma aula encontrada neste filtro."}
                    </span>
                  </div>
                )
              }
            >
              {laneItems.map((l) => {
                const m = moduleOf(l),
                  n = moduleLessons(m!).findIndex((x) => x.id === l.id),
                  g = ordered.findIndex((x) => x.id === l.id),
                  s = lessonState(l);
                return (
                  <button
                    className={`poster lesson-poster ${s.tone}`}
                    key={l.id}
                    onClick={() => openLesson(l)}
                    aria-label={`${l.title} · ${s.label}`}
                  >
                    <span
                      className="poster-art"
                      style={{ backgroundColor: m?.color }}
                    >
                      <img
                        loading="lazy"
                        src={m?.image}
                        alt=""
                        style={{
                          objectPosition: `${[50, 18, 82][n % 3]}% ${[50, 35, 65][n % 3]}%`,
                          transform: `scale(${[1, 1.18, 1.32][n % 3]})`,
                        }}
                      />
                      <span className="poster-shade" />
                      <span className={`poster-badge ${s.tone}`}>{s.icon}</span>
                      <span className="display poster-number" aria-hidden>
                        {String(g + 1).padStart(2, "0")}
                      </span>
                    </span>
                    <span className="poster-info">
                      <strong>{l.title}</strong>
                      <span className="poster-meta">
                        Aula {String(n + 1).padStart(2, "0")}
                        <i />
                        {m?.name}
                        <i />
                        <span className={`tone-${s.tone}`}>{s.icon}</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </Swimlane>
            <section className="closing">
              <span className="closing-icon">
                <TrendingUp size={22} />
              </span>
              <div>
                <h3 className="display">O melhor investimento é em você.</h3>
                <p>
                  Aprenda no seu tempo. Leve esse conhecimento para cada
                  corrida.
                </p>
              </div>
              <button className="secondary" onClick={() => nav("journey")}>
                Ver minha jornada <ArrowRight size={16} />
              </button>
            </section>
          </div>
        </main>
      ) : view === "journey" ? (
        <main className="page">
          <div className="page-head">
            <div>
              <span className="eyebrow">
                <Compass size={14} /> Sua trilha
              </span>
              <h1 className="display">Minha jornada</h1>
              <p className="muted">Cada aprendizado abre um novo caminho.</p>
            </div>
            <div className="journey-progress">
              <strong className="display">{percent}%</strong>
              <span>
                {completed.length} de {lessons.length} aulas concluídas
              </span>
              <span className="progress-track">
                <i style={{ width: `${percent}%` }} />
              </span>
            </div>
          </div>
          <div className="chips" role="group" aria-label="Filtrar por módulo">
            {[{ id: "all", name: "Todos" }, ...modules].map((m) => {
              const on = m.id === "all" ? !query : query === m.name;
              return (
                <button
                  key={m.id}
                  className={`chip ${on ? "active" : ""}`}
                  aria-pressed={on}
                  onClick={() => setQuery(m.id === "all" ? "" : m.name)}
                >
                  {m.name}
                </button>
              );
            })}
          </div>
          {modules
            .filter(
              (m) =>
                !query ||
                m.name.toLowerCase().includes(query.toLowerCase()) ||
                ordered.some(
                  (l) =>
                    l.module === m.id &&
                    l.title.toLowerCase().includes(query.toLowerCase()),
                ),
            )
            .map((m) => (
              <section className="journey-module" key={m.id}>
                <h2 className="lane-title">
                  {m.name}
                  <small>{moduleLessons(m).length} aulas</small>
                </h2>
                {ordered
                  .filter(
                    (l) =>
                      l.module === m.id &&
                      (!query ||
                        m.name.toLowerCase().includes(query.toLowerCase()) ||
                        l.title.toLowerCase().includes(query.toLowerCase())),
                  )
                  .map((l) => (
                    <button
                      className={`catalog-row ${lessonState(l).tone}`}
                      key={l.id}
                      onClick={() => openLesson(l)}
                    >
                      <span className="catalog-thumb">
                        <img src={m.image} alt="" loading="lazy" />
                        <span className="catalog-icon">
                          {lessonState(l).icon}
                        </span>
                      </span>
                      <span>
                        <strong>{l.title}</strong>
                        <small>
                          <span className={`tone-${lessonState(l).tone}`}>
                            {lessonState(l).label}
                          </span>{" "}
                          · {duration(l)}
                        </small>
                      </span>
                      <ChevronRight size={20} />
                    </button>
                  ))}
              </section>
            ))}
          {query && (
            <button className="text-button" onClick={() => setQuery("")}>
              Limpar busca
            </button>
          )}
        </main>
      ) : view === "materials" ? (
        <main className="page">
          <span className="eyebrow">
            <BookOpen size={14} /> Biblioteca
          </span>
          <h1 className="display">Materiais de apoio</h1>
          <p className="muted">Conhecimento para consultar quando precisar.</p>
          {ordered.filter((l) => l.material_url && unlocked(l)).length ? (
            ordered
              .filter((l) => l.material_url && unlocked(l))
              .map((l) => (
                <a
                  className="catalog-row"
                  key={l.id}
                  href={l.material_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="catalog-thumb icon-only">
                    <Download size={20} />
                  </span>
                  <span>
                    <strong>{l.title}</strong>
                    <small>{moduleOf(l)?.name}</small>
                  </span>
                  <ArrowRight size={20} />
                </a>
              ))
          ) : (
            <div className="empty">
              <span className="glow-icon">
                <BookOpen size={30} />
              </span>
              <h2>Seu apoio para a próxima etapa</h2>
              <p>
                Os materiais aparecerão aqui conforme forem publicados e suas
                aulas forem liberadas.
              </p>
            </div>
          )}
        </main>
      ) : view === "profile" ? (
        <main className="page">
          <div className="profile-head">
            <span className="profile-avatar">
              {user?.email?.[0]?.toUpperCase() || "GO"}
            </span>
            <div>
              <h1 className="display">Meu perfil</h1>
              <p className="muted">
                {user?.email || "Visitante da demonstração"}
              </p>
            </div>
          </div>
          <div className="profile-summary">
            <span className="glow-icon">
              <TrendingUp size={26} />
            </span>
            <div>
              <h2>{completed.length} aulas concluídas</h2>
              <p>Continue aprendendo, uma etapa por vez.</p>
              <span className="progress-track">
                <i style={{ width: `${percent}%` }} />
              </span>
              <small>
                {percent}% da jornada · {lessons.length - completed.length}{" "}
                aulas pela frente
              </small>
            </div>
          </div>
          <div className="profile-actions">
            {(admin || !configured) && (
              <button className="secondary" onClick={() => nav("admin")}>
                <Settings size={18} /> Administração
              </button>
            )}
            {user && (
              <button
                className="text-button"
                onClick={() => {
                  supabase?.auth.signOut();
                  setAdmin(false);
                  nav("home");
                }}
              >
                <LogOut size={18} /> Sair da conta
              </button>
            )}
          </div>
        </main>
      ) : (
        <main className="page admin-page">
          <div className="section-title">
            <div>
              <h1>Painel da jornada</h1>
              <p className="muted">Conteúdo e pessoas, em um só lugar.</p>
            </div>
          </div>
          <div className="admin-tabs">
            <button
              className={view === "admin" ? "selected" : ""}
              onClick={() => nav("admin")}
            >
              <LayoutGrid size={17} /> Conteúdo
            </button>
            <button
              className={view === "members" ? "selected" : ""}
              onClick={() => nav("members")}
            >
              <Users size={17} /> Alunos
            </button>
          </div>
          {!configured && (
            <div className="notice">
              Prévia do painel. Conecte Supabase e Mux para salvar conteúdos,
              enviar vídeos e convidar alunos.
            </div>
          )}
          {view === "members" ? (
            <>
              <form
                className="editor"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!configured)
                    return setMessage(
                      "Configure os serviços para enviar convites reais.",
                    );
                  const form = e.currentTarget;
                  const f = new FormData(form);
                  await adminAction("invite", {
                    email: f.get("email"),
                    name: f.get("name"),
                  });
                  form.reset();
                  nav("members");
                }}
              >
                <h2>Convidar aluno</h2>
                <label>
                  Nome
                  <input name="name" required />
                </label>
                <label>
                  E-mail
                  <input type="email" name="email" required />
                </label>
                <button className="primary" disabled={busy}>
                  Enviar convite <ArrowRight size={16} />
                </button>
              </form>
              {members.map((m) => (
                <div className="catalog-row" key={m.id}>
                  <span>
                    <strong>{m.name || m.email}</strong>
                    <small>
                      {m.email} · {m.completed_count || 0} aulas concluídas ·{" "}
                      {m.suspended ? "Suspenso" : "Ativo"}
                    </small>
                  </span>
                  <button
                    className="secondary"
                    disabled={busy || m.id === user?.id}
                    onClick={async () => {
                      await adminAction("suspend", {
                        id: m.id,
                        suspended: !m.suspended,
                      });
                      nav("members");
                    }}
                  >
                    {m.suspended ? "Reativar" : "Suspender"}
                  </button>
                </div>
              ))}
            </>
          ) : (
            <>
              <ContentEditor
                modules={modules}
                lessons={lessons}
                api={api}
                refresh={refresh}
                notify={setMessage}
                enabled={configured}
              />
              <form
                className="editor"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!configured)
                    return setMessage("Conecte o Supabase para salvar aulas.");
                  const form = e.currentTarget;
                  const f = new FormData(form);
                  const l = await adminAction("saveLesson", {
                    title: f.get("title"),
                    module: f.get("module"),
                    description: f.get("description"),
                    position: Number(f.get("position")),
                  });
                  if (l) form.reset();
                }}
              >
                <h2>Nova aula</h2>
                <div className="form-grid">
                  <label>
                    Título
                    <input
                      name="title"
                      placeholder="O que o aluno vai aprender?"
                      required
                    />
                  </label>
                  <label>
                    Módulo
                    <select name="module">
                      {modules.map((m) => (
                        <option value={m.id} key={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  Descrição
                  <textarea name="description" rows={3} />
                </label>
                <label>
                  Posição na jornada
                  <input
                    name="position"
                    type="number"
                    min={0}
                    defaultValue={lessons.length}
                  />
                </label>
                <button className="primary" disabled={busy}>
                  <Plus size={17} /> Criar rascunho
                </button>
              </form>
              <h2>Aulas da jornada</h2>
              {ordered.map((l) => (
                <div className="admin-lesson" key={l.id}>
                  <div>
                    <strong>{l.title}</strong>
                    <small>
                      {modules.find((m) => m.id === l.module)?.name} ·{" "}
                      {l.status === "demo"
                        ? "Demonstração"
                        : l.published
                          ? "Publicado"
                          : l.status === "ready"
                            ? "Pronto para publicar"
                            : l.status === "processing"
                              ? "Processando vídeo"
                              : "Rascunho"}
                    </small>
                  </div>
                  {configured && (
                    <div className="admin-actions">
                      <label className="secondary upload-label">
                        <Upload size={14} /> Vídeo
                        <input
                          aria-label={`Enviar vídeo para ${l.title}`}
                          type="file"
                          accept="video/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setBusy(true);
                            try {
                              const d = await api("upload", { lessonId: l.id });
                              setMessage(
                                "Enviando vídeo. Mantenha esta página aberta.",
                              );
                              const r = await fetch(d.url, {
                                method: "PUT",
                                body: file,
                              });
                              if (!r.ok)
                                throw Error(
                                  "Falha no envio. Selecione o arquivo para tentar novamente.",
                                );
                              setMessage(
                                "Vídeo enviado. Aguarde o processamento e atualize a lista.",
                              );
                              await refresh();
                            } catch (e) {
                              setMessage((e as Error).message);
                            } finally {
                              setBusy(false);
                            }
                          }}
                        />
                      </label>
                      <button
                        className="secondary"
                        disabled={busy || l.status !== "ready"}
                        onClick={() =>
                          adminAction("publish", {
                            lessonId: l.id,
                            published: !l.published,
                          })
                        }
                      >
                        {l.published ? "Despublicar" : "Publicar"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <button
                className="text-button"
                onClick={() => configured && refresh()}
              >
                Atualizar lista
              </button>
            </>
          )}
        </main>
      )}
      <footer>
        <img src="/brand/logo.png" alt="E-Drive GO" />
        <span>Conhecimento para ir mais longe.</span>
        <small>© {new Date().getFullYear()} E-Drive GO</small>
      </footer>
      {message && (
        <div className="toast" role="status">
          {message}
          <button
            aria-label="Fechar aviso"
            className="icon-button"
            onClick={() => setMessage("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
