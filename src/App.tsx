import EstimateDrawer from "./EstimateDrawer";
import { generateScope, symptoms, toggleSymptom } from "./workflow";
import { requestRecommendations } from "./recommendations";
import AddCustomer from "./AddCustomer";
import { sameSite, type LocalCustomer } from "./localCustomers";
import CustomerEstimate from "./CustomerEstimate";
import { defaultPresentation, type Presentation } from "./draft";
import { useEffect, useRef, useState } from "react";
import {
  catalog,
  customers,
  warnings,
  money,
  total,
  lineTotal,
  validQuantity,
  inspectionSchema,
  suggestionSchema,
  type Line,
  type Inspection,
  type Suggestions,
} from "./domain";
import { initialInspection as initial, parseDraft } from "./draft";
const key = "fieldquote-draft-v1";
function restore() {
  try {
    return parseDraft(JSON.parse(localStorage.getItem(key) ?? "null"));
  } catch {
    return null;
  }
}
export default function App() {
  const [saved] = useState(restore);
  const [localCustomers, setLocalCustomers] = useState<LocalCustomer[]>(
    saved?.localCustomers ?? [],
  );
  const [addingCustomer, setAddingCustomer] = useState(false);
  const allCustomers = [...localCustomers, ...customers];
  const revision = useRef(0);
  const contentRef = useRef<HTMLElement>(null);
  const [customerId, setCustomer] = useState<string>(saved?.customerId ?? "");
  const [lines, setLines] = useState<Line[]>(saved?.lines ?? []);
  const [inspection, setInspection] = useState<Inspection>(
    saved?.inspection ?? initial,
  );
  const [notes, setNotes] = useState<string>(saved?.notes ?? "");
  const [presentation, setPresentation] = useState<Presentation>(
    saved?.presentation ?? defaultPresentation,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerItemId, setDrawerItemId] = useState<string | null>(null);
  const [quantityText, setQuantityText] = useState<Record<string, string>>({});
  const suggestionsRef = useRef<HTMLElement>(null);
  const [step, setStep] = useState("Property");
  const [search, setSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [pending, setPending] = useState<Suggestions | null>(null);
  const [mode, setMode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [storage, setStorage] = useState("Draft saves on this device");
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const customer = allCustomers.find((c) => c.id === customerId);
  const amount = total(lines);
  const hasInvalid = Object.values(invalid).some(Boolean);
  useEffect(() => {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          customerId,
          lines,
          inspection,
          notes,
          presentation,
          localCustomers,
        }),
      );
      setStorage("Draft saved on this device");
    } catch {
      setStorage("Device storage unavailable. Keep this tab open.");
    }
  }, [customerId, lines, inspection, notes, presentation, localCustomers]);
  useEffect(() => {
    contentRef.current?.focus({ preventScroll: true });
    contentRef.current?.scrollIntoView({ block: "start" });
  }, [step]);
  useEffect(() => {
    if (step === "Review" && !notes.trim() && lines.length)
      setNotes(generateScope(lines));
  }, [step]);
  useEffect(() => {
    if (pending) {
      suggestionsRef.current?.focus({ preventScroll: true });
      suggestionsRef.current?.scrollIntoView({ block: "start" });
    }
  }, [pending !== null]);
  function edit<K extends keyof Inspection>(k: K, v: Inspection[K]) {
    revision.current++;
    setInspection((s) => ({ ...s, [k]: v }));
    setPending(null);
  }
  function add(id: string, q?: number) {
    setQuantityText((v) => {
      const next = { ...v };
      delete next[id];
      return next;
    });
    const item = catalog.find((i) => i.id === id)!;
    setLines((ls) =>
      ls.some((l) => l.id === id)
        ? ls
        : [
            ...ls,
            {
              id,
              quantity: q ?? (item.kind === "labor" ? (item.minHours ?? 1) : 1),
            },
          ],
    );
    setMessage("Item added to estimate.");
  }
  async function generate(demo = false) {
    if (!customer) {
      setMessage("Select a property first.");
      return;
    }
    const parsed = inspectionSchema.safeParse(inspection);
    if (!parsed.success) {
      setMessage("Enter a system and reported issue (at least 3 characters).");
      return;
    }
    const requestRevision = revision.current;
    setBusy(true);
    setPending(null);
    setMessage("");
    try {
      const result = await requestRecommendations(parsed.data, demo);
      if (revision.current !== requestRevision) {
        setMessage("Inspection changed. Generate fresh suggestions.");
        return;
      }
      setPending(result.suggestions);
      setMode(result.mode);
      setMessage("Suggestions ready. Review each item before approval.");
    } catch (e) {
      if (revision.current !== requestRevision) return;
      setMessage(
        e instanceof Error
          ? e.message
          : "AI unavailable. Use the manual catalog.",
      );
    } finally {
      setBusy(false);
    }
  }
  const visible = catalog.filter(
    (i) =>
      (filter === "All" || i.kind === filter || i.category === filter) &&
      `${i.name} ${i.detail} ${i.id}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const quote = (
    <aside className="panel quote">
      <div className="quote-heading">
        <p className="eyebrow">YOUR ESTIMATE</p>
        <span>{lines.length} items</span>
      </div>
      <h2>{customer?.name ?? "New estimate"}</h2>
      <p className="muted">Review quantities and labor hours.</p>
      {!lines.length && (
        <div className="empty">
          <span>＋</span>
          <h3>A clear quote starts here.</h3>
          <p>Add catalog items or approve inspection suggestions.</p>
        </div>
      )}
      {lines.map((l) => {
        const i = catalog.find((i) => i.id === l.id)!;
        return (
          <article
            className="line"
            key={l.id}
            id={`estimate-item-${l.id}`}
            tabIndex={-1}
            aria-label={i.name}
          >
            <strong>{i.name}</strong>
            <small>
              {money(i.cents)} / {i.kind === "labor" ? "hour" : "unit"}
            </small>
            <div className="quantity">
              <label>
                {i.kind === "labor" ? "Hours" : "Units"}
                <input
                  aria-label={`${i.name}: ${i.kind === "labor" ? "hours" : "units"}`}
                  aria-invalid={invalid[l.id] || undefined}
                  aria-describedby={
                    invalid[l.id] ? `quantity-error-${l.id}` : undefined
                  }
                  type="number"
                  min={i.kind === "labor" ? 0.01 : 1}
                  max={100}
                  step={i.kind === "labor" ? 0.01 : 1}
                  value={quantityText[l.id] ?? String(l.quantity)}
                  onChange={(e) => {
                    setQuantityText((v) => ({ ...v, [l.id]: e.target.value }));
                    const q = Number(e.target.value);
                    const ok = validQuantity(i, q);
                    setInvalid((v) => ({ ...v, [l.id]: !ok }));
                    if (ok)
                      setLines((ls) =>
                        ls.map((x) =>
                          x.id === l.id ? { ...x, quantity: q } : x,
                        ),
                      );
                  }}
                />
              </label>
              <strong>{money(lineTotal(i, l.quantity))}</strong>
              <button
                aria-label={"Remove " + i.name}
                onClick={() => {
                  setLines((ls) => ls.filter((x) => x.id !== l.id));
                  setInvalid((v) => ({ ...v, [l.id]: false }));
                }}
              >
                ×
              </button>
            </div>
            {invalid[l.id] && (
              <p className="error" id={`quantity-error-${l.id}`}>
                Enter{" "}
                {i.kind === "labor"
                  ? "0.01–100 hours (2 decimals)"
                  : "1–100 whole units"}
                . Total retains last valid value.
              </p>
            )}
          </article>
        );
      })}
      <div className="total">
        <span>Estimated subtotal</span>
        <strong>{money(amount)}</strong>
      </div>
      <small>
        Equipment uses catalog base costs; labor uses listed hourly charges.
        Final customer pricing, taxes, markups and adjustments require
        verification.
      </small>
      <button
        className="primary"
        disabled={!lines.length || hasInvalid}
        onClick={() => {
          setDrawerOpen(false);
          setStep("Review");
        }}
      >
        Review estimate →
      </button>
      <button
        className="quiet"
        onClick={() => {
          if (
            window.confirm(
              "Clear this estimate draft, including the selected property, inspection and items? Locally added customer records are kept.",
            )
          ) {
            revision.current++;
            setCustomer("");
            setLines([]);
            setInspection(initial);
            setNotes("");
            setPresentation(defaultPresentation);
            setAddingCustomer(false);
            setPending(null);
            setInvalid({});
            setQuantityText({});
            setDrawerOpen(false);
            setStep("Property");
            setMessage("Draft cleared.");
          }
        }}
      >
        Clear draft
      </button>
    </aside>
  );
  return (
    <>
      <header className="top">
        <a href="#main" className="brand">
          <span className="mark">FQ</span>
          <span>
            FieldQuote <b>AI</b>
            <small>ON-SITE ESTIMATING</small>
          </span>
        </a>
        <span className="save">{storage}</span>
      </header>
      <main id="main">
        <div className="intro">
          <div>
            <p className="eyebrow">FROM INSPECTION TO ESTIMATE</p>
            <h1>
              Clear estimates.
              <br />
              Confident next steps.
            </h1>
            <p>Built for the job site. Reviewed by you.</p>
          </div>
          <div className="job-tag">
            FIELD WORKSPACE{" "}
            <strong>{customer ? customer.name : "New estimate"}</strong>
            <span>
              {customer
                ? customer.propertyType + " property"
                : "Select a customer to begin"}
            </span>
          </div>
        </div>
        <nav aria-label="Estimate steps">
          {["Property", "Inspection", "Catalog", "Review"].map((s, i) => (
            <button
              key={s}
              aria-current={step === s ? "step" : undefined}
              className={step === s ? "active" : ""}
              onClick={() => setStep(s)}
            >
              <span>{i + 1}</span>
              {s}
            </button>
          ))}
        </nav>
        <div role="status" className={message ? "notice" : "sr-only"}>
          {message}
        </div>
        <div
          className={
            step === "Review" ? "workspace receipt-workspace" : "workspace"
          }
        >
          <section
            className="panel"
            ref={contentRef}
            tabIndex={-1}
            aria-label={step + " workspace"}
          >
            {step === "Property" && (
              <>
                <p className="eyebrow">01 / CUSTOMER & PROPERTY</p>
                <h2>Where are we working?</h2>
                <p className="muted">
                  Select a customer or add a new site, then confirm property
                  details.
                </p>
                <button
                  onClick={() => setAddingCustomer(true)}
                  disabled={addingCustomer || localCustomers.length >= 100}
                >
                  + Add customer & property
                </button>
                {localCustomers.length >= 100 && (
                  <p className="muted">
                    This browser has reached the limit of 100 added records.
                  </p>
                )}
                {addingCustomer && (
                  <AddCustomer
                    onCancel={() => setAddingCustomer(false)}
                    onSave={(record) => {
                      if (localCustomers.length >= 100)
                        return "This browser has reached the 100-record limit.";
                      if (allCustomers.some((c) => sameSite(c, record)))
                        return "This customer and address already exist. Cancel and select the existing record.";
                      revision.current++;
                      setLocalCustomers((list) => [record, ...list]);
                      setCustomer(record.id);
                      setInspection({ ...initial });
                      setPending(null);
                      setAddingCustomer(false);
                      setCustomerSearch("");
                      setStep("Inspection");
                      setMessage(
                        "Customer added on this device. Existing estimate items retained; review their suitability.",
                      );
                    }}
                  />
                )}
                {localCustomers.length > 0 && (
                  <button
                    className="quiet"
                    onClick={() => {
                      if (
                        !window.confirm(
                          "Remove all customers added on this browser? Supplied sample records remain. The current estimate items and notes are retained.",
                        )
                      )
                        return;
                      revision.current++;
                      if (localCustomers.some((c) => c.id === customerId)) {
                        setCustomer("");
                        setInspection({ ...initial });
                        setPending(null);
                      }
                      setLocalCustomers([]);
                      setMessage(
                        "Locally added customer records removed. Review remaining estimate notes for personal details.",
                      );
                    }}
                  >
                    Remove locally added customers ({localCustomers.length})
                  </button>
                )}
                <label>
                  Find a customer
                  <input
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search name or address"
                  />
                </label>
                <div className="customer-list">
                  {allCustomers
                    .filter((c) =>
                      `${c.name} ${c.address}`
                        .toLowerCase()
                        .includes(customerSearch.toLowerCase()),
                    )
                    .map((c) => (
                      <button
                        key={c.id}
                        className={
                          "customer " + (customerId === c.id ? "selected" : "")
                        }
                        aria-pressed={customerId === c.id}
                        onClick={() => {
                          if (c.id !== customerId) {
                            revision.current++;
                            setCustomer(c.id);
                            setInspection({ ...initial });
                            setPending(null);
                            setMessage(
                              "Property selected. Existing estimate items retained; review their suitability.",
                            );
                          }
                          setStep("Inspection");
                        }}
                      >
                        <strong>{c.name}</strong>
                        <span>{c.address}</span>
                        <small>
                          {c.id.startsWith("LOCAL-")
                            ? "Saved on this device · "
                            : ""}
                          {c.propertyType} · {c.squareFootage ?? "Unknown"} sq
                          ft {customerId === c.id ? " · Selected ✓" : ""}
                        </small>
                      </button>
                    ))}
                </div>
                {!allCustomers.some((c) =>
                  `${c.name} ${c.address}`
                    .toLowerCase()
                    .includes(customerSearch.toLowerCase()),
                ) && <p>No matching customers.</p>}
                {customer && (
                  <div className="site">
                    <strong>Property record</strong>
                    <p>
                      {customer.systemType} · {customer.systemAge ?? "Unknown"}{" "}
                      years old
                    </p>
                    <p>
                      Last service: {customer.lastServiceDate ?? "Not recorded"}{" "}
                      · Phone: {customer.phone ?? "Not recorded"}
                    </p>
                    <small>
                      Historical information; confirm during inspection.
                    </small>
                  </div>
                )}
                <button
                  className="primary"
                  disabled={!customer}
                  onClick={() => setStep("Inspection")}
                >
                  Start inspection →
                </button>
              </>
            )}
            {step === "Inspection" && (
              <>
                <button
                  className="back-link"
                  onClick={() => setStep("Property")}
                >
                  ← Back to property
                </button>
                <p className="eyebrow">02 / SITE INSPECTION</p>
                <h2>Capture what you observe.</h2>
                <p className="muted">
                  {
                    [
                      inspection.system.trim(),
                      inspection.issue.trim().length >= 3,
                    ].filter(Boolean).length
                  }{" "}
                  of 2 required details complete. Only entered facts go to the
                  recommendation service; omit personal information.
                </p>
                <div className="fields">
                  <label>
                    System type *
                    <input
                      maxLength={120}
                      value={inspection.system}
                      placeholder={customer?.systemType ?? "e.g. Heat pump"}
                      onChange={(e) => edit("system", e.target.value)}
                    />
                  </label>
                  {customer && customer.systemType !== "Unknown" && (
                    <button
                      className="system-shortcut"
                      onClick={() => edit("system", customer.systemType)}
                    >
                      Use recorded system
                    </button>
                  )}
                  <label>
                    Job type
                    <select
                      value={inspection.job}
                      onChange={(e) =>
                        edit("job", e.target.value as Inspection["job"])
                      }
                    >
                      {[
                        "diagnostic",
                        "repair",
                        "install",
                        "maintenance",
                        "ductwork",
                      ].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Observed condition
                    <select
                      value={inspection.condition}
                      onChange={(e) =>
                        edit(
                          "condition",
                          e.target.value as Inspection["condition"],
                        )
                      }
                    >
                      {["Unknown", "Good", "Worn", "Failed"].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Urgency
                    <select
                      value={inspection.urgency}
                      onChange={(e) =>
                        edit("urgency", e.target.value as Inspection["urgency"])
                      }
                    >
                      {["Routine", "Soon", "Urgent"].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <fieldset className="symptom-picker">
                  <legend>Quick-select reported symptoms</legend>
                  <div className="symptom-options">
                    {symptoms.map((symptom) => (
                      <button
                        key={symptom}
                        aria-pressed={inspection.issue
                          .split(";")
                          .map((s) => s.trim())
                          .includes(symptom)}
                        onClick={() =>
                          (() => {
                            const next = toggleSymptom(
                              inspection.issue,
                              symptom,
                            );
                            if (next === inspection.issue)
                              setMessage(
                                "Reported issue is full. Shorten it before adding a symptom.",
                              );
                            else edit("issue", next);
                          })()
                        }
                      >
                        {symptom}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label>
                  Reported issue *
                  <textarea
                    maxLength={1000}
                    value={inspection.issue}
                    onChange={(e) => edit("issue", e.target.value)}
                    placeholder="What brought you to the site?"
                  />
                </label>
                <details className="inspection-details">
                  <summary>
                    Additional inspection details (age, specifications & notes)
                  </summary>{" "}
                  <label>
                    Age in years (if known)
                    <input
                      inputMode="numeric"
                      maxLength={3}
                      value={inspection.age}
                      onChange={(e) => {
                        if (/^\d{0,3}$/.test(e.target.value))
                          edit("age", e.target.value);
                      }}
                    />
                  </label>
                  <label>
                    Measurements / specifications (optional)
                    <input
                      maxLength={500}
                      value={inspection.specs}
                      onChange={(e) => edit("specs", e.target.value)}
                      placeholder="Verified model, capacity, voltage…"
                    />
                  </label>
                  <label>
                    Inspection notes (optional)
                    <textarea
                      maxLength={1000}
                      value={inspection.notes}
                      onChange={(e) => edit("notes", e.target.value)}
                    />
                  </label>
                </details>
                <div className="callout">
                  Recommendations require your approval. A checklist cannot
                  confirm compatibility or replace diagnosis. Default server
                  mode is a deterministic demo; the response identifies the
                  actual mode.
                </div>
                <button
                  className="primary"
                  disabled={busy || !customer}
                  onClick={() => generate()}
                >
                  {busy ? "Generating…" : "Generate AI Recommendations →"}
                </button>
                <button
                  disabled={busy || !customer}
                  onClick={() => generate(true)}
                >
                  Try demo recommendations · no model call
                </button>
                <button onClick={() => setStep("Catalog")}>
                  Choose items manually
                </button>
                {pending && (
                  <section
                    className="suggestions"
                    ref={suggestionsRef}
                    tabIndex={-1}
                    aria-label="Recommendations for technician review"
                  >
                    <p className="eyebrow">
                      {mode === "demo"
                        ? "DEMO MODE · NO MODEL CALLED"
                        : "LIVE AI"}{" "}
                      / REVIEW REQUIRED
                    </p>
                    <h2>Recommendations ready</h2>
                    <p className="muted">
                      Review why each item was suggested, then approve it to add
                      its catalog cost to your estimate. Adding an item does not
                      verify diagnosis or compatibility.
                    </p>
                    {pending.recommendations.length === 0 && (
                      <p>
                        No recommendations to show. Use the catalog or generate
                        again.
                      </p>
                    )}
                    {pending.recommendations.map((r, index) => {
                      const item = catalog.find((i) => i.id === r.catalogId)!;
                      const selectedLine = lines.find((l) => l.id === item.id);
                      const shownQuantity =
                        selectedLine?.quantity ?? r.quantity;
                      return (
                        <article className="suggestion" key={r.catalogId}>
                          <p className="eyebrow">
                            {lines.some((l) => l.id === item.id)
                              ? "IN ESTIMATE ✓"
                              : "SUGGESTED · NOT YET APPROVED"}
                          </p>
                          <h3>{item.name}</h3>
                          <small>Catalog ID: {item.id}</small>
                          <p>
                            <strong>Why this item:</strong> {r.reason}
                          </p>
                          <p className="recommendation-cost">
                            Listed amount:{" "}
                            <strong>
                              {money(lineTotal(item, shownQuantity))}
                            </strong>{" "}
                            <small>
                              {shownQuantity}{" "}
                              {item.kind === "labor" ? "hours" : "units"} ×{" "}
                              {money(item.cents)} · Final customer price not set
                            </small>
                          </p>
                          <small>
                            Compatibility and scope require verification.
                          </small>
                          <label>
                            Suggested{" "}
                            {item.kind === "labor" ? "hours" : "units"}
                            <input
                              type="number"
                              disabled={lines.some((l) => l.id === item.id)}
                              min={item.kind === "labor" ? 0.01 : 1}
                              max={100}
                              step={item.kind === "labor" ? 0.01 : 1}
                              value={shownQuantity}
                              onChange={(e) => {
                                const q = Number(e.target.value);
                                if (validQuantity(item, q))
                                  setPending({
                                    ...pending,
                                    recommendations:
                                      pending.recommendations.map((x, i) =>
                                        i === index ? { ...x, quantity: q } : x,
                                      ),
                                  });
                              }}
                            />
                          </label>
                          <button
                            className="primary"
                            disabled={lines.some((l) => l.id === item.id)}
                            onClick={() => {
                              add(item.id, r.quantity);
                              setMessage(
                                `${item.name} added to estimate at ${money(lineTotal(item, r.quantity))} listed amount. Verification still required. Open Items to edit quantity.`,
                              );
                            }}
                          >
                            {lines.some((l) => l.id === item.id)
                              ? "In estimate ✓"
                              : "Approve & add to estimate"}
                          </button>
                          <button
                            onClick={() =>
                              setPending({
                                ...pending,
                                recommendations: pending.recommendations.filter(
                                  (x) => x !== r,
                                ),
                              })
                            }
                          >
                            {selectedLine ? "Hide recommendation" : "Dismiss"}
                          </button>
                        </article>
                      );
                    })}
                    <button
                      className="primary"
                      onClick={() => setDrawerOpen(true)}
                    >
                      Review selected items ({lines.length})
                    </button>
                    <h4>Verify before quoting</h4>
                    <ul>
                      {pending.missingInformation.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                    <h4>Recommendation assumptions</h4>
                    <ul>
                      {pending.assumptions.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                    <p>
                      Record relevant assumptions in estimate notes; suggestions
                      are never included automatically.
                    </p>
                  </section>
                )}
              </>
            )}
            {step === "Catalog" && (
              <>
                <p className="eyebrow">03 / EQUIPMENT & LABOR</p>
                <h2>The right items for the job.</h2>
                <label>
                  Search catalog
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Name, model, or catalog ID"
                  />
                </label>
                <label>
                  Filter
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    {[
                      "All",
                      "equipment",
                      "labor",
                      ...new Set(catalog.map((i) => i.category)),
                    ].map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </label>
                <p className="muted">
                  {visible.length} results · Base costs &amp; hourly rates
                </p>
                {visible.some((i) => i.kind === "labor") && (
                  <p className="muted">
                    Labor hours can be adjusted after adding an item.
                  </p>
                )}
                <div className="catalog">
                  {visible.map((i) => (
                    <article key={i.id}>
                      <div>
                        <small>
                          {i.kind.toUpperCase()} / {i.id}
                        </small>
                        <h3>{i.name}</h3>
                        <p>{i.detail}</p>
                        <strong>
                          {money(i.cents)}
                          {i.kind === "labor" ? " / hour" : " / unit"}
                        </strong>
                      </div>
                      <button
                        aria-label={
                          lines.some((l) => l.id === i.id)
                            ? `View ${i.name} in estimate`
                            : `Add ${i.name}`
                        }
                        onClick={() => {
                          if (lines.some((l) => l.id === i.id)) {
                            setDrawerItemId(`estimate-item-${i.id}`);
                            setDrawerOpen(true);
                          } else add(i.id);
                        }}
                      >
                        {lines.some((l) => l.id === i.id) ? "Added ✓" : "+ Add"}
                      </button>
                    </article>
                  ))}
                </div>
                {visible.length === 0 && (
                  <p>No items match. Try another search or filter.</p>
                )}
                <details>
                  <summary>
                    Data normalization notices ({warnings.length})
                  </summary>
                  <ul>
                    {warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </details>
              </>
            )}
            {step === "Review" && (
              <CustomerEstimate
                customer={customer}
                lines={lines}
                notes={notes}
                onNotesChange={setNotes}
                presentation={presentation}
                onPresentationChange={setPresentation}
                hasInvalid={hasInvalid}
                onEdit={() => setStep("Catalog")}
              />
            )}
          </section>
          {step !== "Review" && !drawerOpen && (
            <div className="desktop-estimate">{quote}</div>
          )}
        </div>
        <footer>
          FieldQuote AI · Built for the field, with a human in control.
          <br />
          Saved data stays in this browser. On shared devices, clear the draft
          and remove locally added customers from Property.
        </footer>
      </main>
      {drawerOpen && (
        <EstimateDrawer
          focusItemId={drawerItemId}
          onClose={() => {
            setDrawerOpen(false);
            setDrawerItemId(null);
          }}
        >
          {quote}
        </EstimateDrawer>
      )}
      <div className="mobile-total">
        <span>
          <small>ESTIMATED SUBTOTAL</small>
          <strong>{money(amount)}</strong>
        </span>
        <button
          className="primary"
          aria-label={`View estimate, ${lines.length} items`}
          aria-haspopup="dialog"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          <svg
            className="cart-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M3 3h2l2.4 12h11.2l2-8H6" />
            <circle cx="9" cy="20" r="1" />
            <circle cx="18" cy="20" r="1" />
          </svg>
          View {lines.length}
        </button>
      </div>
    </>
  );
}
