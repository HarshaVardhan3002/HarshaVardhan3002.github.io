import type { ReactNode } from "react";
import type { Channel } from "../content";
import { cta, person, tvChannels } from "../content";
import type { Block, Page } from "./pages";

// Headings are painted in capitals on the TV; here they read as normal words.
const NAMES: [RegExp, string][] = [
  [/\bhugging face\b/g, "Hugging Face"],
  [/\bi\b/g, "I"],
];
function heading(h: string) {
  let s = h.charAt(0) + h.slice(1).toLowerCase();
  for (const [re, v] of NAMES) s = s.replace(re, v);
  return s;
}

function Out({ id, href, children }: { id?: string; href: string; children: ReactNode }) {
  return (
    <a data-hit={id} href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

function BlockHtml({ b }: { b: Block }) {
  switch (b.t) {
    case "text":
      return (
        <section>
          <h2>{heading(b.heading)}</h2>
          {(Array.isArray(b.body) ? b.body : [b.body]).map((p) => (
            <p key={p}>{p}</p>
          ))}
        </section>
      );
    case "numbers":
      return (
        <ul aria-label="In numbers">
          {b.items.map((n) => (
            <li key={n.label}>
              <strong>{n.value}</strong>: {n.label}
            </li>
          ))}
        </ul>
      );
    case "bullets":
      return (
        <section>
          <h2>{heading(b.heading)}</h2>
          <ul>
            {b.items.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      );
    case "steps":
      return (
        <section>
          <h2>{heading(b.heading)}</h2>
          <ol>
            {b.items.map((s) => (
              <li key={s.title}>
                <strong>{s.title}.</strong> {s.body}
              </li>
            ))}
          </ol>
        </section>
      );
    case "timeline":
      return (
        <section>
          <h2>{heading(b.heading)}</h2>
          <ul>
            {b.items.map((e) => (
              <li key={e.title + e.when}>
                <strong>{e.title}</strong>, {e.where}. <span className="dim">{e.when}.</span>
                {e.body && <> {e.body}</>}
              </li>
            ))}
          </ul>
        </section>
      );
    case "list":
      return (
        <section>
          <h2>{heading(b.heading)}</h2>
          <ul>
            {b.items.map((r) => (
              <li key={r.href + r.title}>
                <Out id={r.id} href={r.href}>
                  {r.title}
                </Out>
                {r.meta && <span className="dim"> ({r.meta})</span>}: {r.sub}
              </li>
            ))}
          </ul>
        </section>
      );
    case "chips":
      return (
        <section>
          <h2>{heading(b.heading)}</h2>
          <p>{b.items.join(", ")}</p>
        </section>
      );
    case "note":
      return <p className="note">{b.body}</p>;
    case "tree":
      return (
        <section>
          <h2>{heading(b.heading)}</h2>
          <p>{b.root}</p>
          <ul>
            {b.groups.map((g) => (
              <li key={g.path}>
                <strong>{g.path}</strong>
                {g.note && <span className="dim"> {g.note}</span>}
                {g.items.some((it) => it.note) ? (
                  <ul>
                    {g.items.map((it) => (
                      <li key={it.name}>
                        {it.name}
                        {it.note && <>: {it.note}</>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{g.items.map((it) => it.name).join(", ")}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      );
    case "links":
      return (
        <ul aria-label="Links">
          {b.items.map((l) => (
            <li key={l.href}>
              <Out id={l.id} href={l.href}>
                {l.label}
              </Out>
            </li>
          ))}
        </ul>
      );
  }
}

type Props = {
  channel?: Channel;
  page?: Page;
  plain: boolean;
  clear: boolean;
  rogue: boolean;
  onBack: () => void;
  onTune: (ch: number) => void;
  onClear: () => void;
  onRogue: () => void;
};

/** The same content as the picture, as plain HTML. */
export function Mirror({ channel: c, page: pg, plain, clear, rogue, onBack, onTune, onClear, onRogue }: Props) {
  if (c && pg)
    return (
      <article aria-label={c.title}>
        <button type="button" data-hit="back" onClick={onBack}>
          ← Back to the menu
        </button>
        <Out id="book" href={cta.href}>
          {cta.long}
        </Out>
        <p className="dim">Channel {c.ch}</p>
        <h1>{c.title}</h1>
        <p className="dim">{c.kind}</p>
        {c.video && <p>A muted demo video of {c.title} plays on the screen.</p>}
        {pg.blocks.map((b, i) => (
          <BlockHtml key={i} b={b} />
        ))}
        <button type="button" data-hit="back-end" onClick={onBack}>
          ← Back to the menu
        </button>
        <Out id="book-end" href={cta.href}>
          {cta.long}
        </Out>
      </article>
    );
  return (
    <section aria-label="Menu">
      <p className="dim">{person.place}</p>
      <h1>{person.name}</h1>
      <p>{person.lede}</p>
      <p>Now: {person.now}</p>
      <p>
        <Out id="book" href={cta.href}>
          {cta.long}
        </Out>
      </p>
      <ul aria-label="Profiles">
        <li>
          <Out id="link-github" href={person.github}>
            GitHub
          </Out>
        </li>
        <li>
          <Out id="link-hf" href={person.huggingface}>
            Hugging Face
          </Out>
        </li>
        <li>
          <Out id="link-linkedin" href={person.linkedin}>
            LinkedIn
          </Out>
        </li>
      </ul>
      <h2>Channels</h2>
      <ul>
        {tvChannels.map((x) => (
          <li key={x.ch}>
            <button type="button" data-hit={`open-${x.ch}`} onClick={() => onTune(x.ch)}>
              {x.ch} · {x.title}. {x.guide}
            </button>
          </li>
        ))}
      </ul>
      {!plain && (
        <>
          <button type="button" data-hit="toggle-clear" aria-pressed={clear} onClick={onClear}>
            Clear picture (no curve or scanlines)
          </button>
          <button type="button" data-hit="toggle-rogue" aria-pressed={rogue} onClick={onRogue}>
            Rogue mode
          </button>
        </>
      )}
    </section>
  );
}
