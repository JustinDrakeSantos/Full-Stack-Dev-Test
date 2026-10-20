import { generateScope } from "./workflow";
import {
  catalog,
  customers,
  lineTotal,
  money,
  total,
  type Line,
} from "./domain";
import { type Presentation } from "./draft";
type Props = {
  customer: (typeof customers)[number] | undefined;
  lines: Line[];
  notes: string;
  onNotesChange: (value: string) => void;
  presentation: Presentation;
  onPresentationChange: (value: Presentation) => void;
  hasInvalid: boolean;
  onEdit: () => void;
};
export default function CustomerEstimate({
  customer,
  lines,
  notes,
  onNotesChange,
  presentation,
  onPresentationChange,
  hasInvalid,
  onEdit,
}: Props) {
  const groups = (
    [
      { kind: "equipment", title: "Equipment & materials", unit: "units" },
      { kind: "labor", title: "Labor & services", unit: "hours" },
    ] as const
  ).map((group) => ({
    ...group,
    lines: lines.filter(
      (l) => catalog.find((i) => i.id === l.id)?.kind === group.kind,
    ),
  }));
  const update = (field: keyof Presentation, value: string) =>
    onPresentationChange({ ...presentation, [field]: value });
  const ready = Boolean(
    customer &&
    lines.length &&
    !hasInvalid &&
    presentation.businessName.trim() &&
    presentation.title.trim(),
  );
  return (
    <div className="estimate">
      <div className="receipt-brand">
        <div>
          <span className="receipt-monogram" aria-hidden="true">
            FQ
          </span>
          <strong>
            {presentation.businessName.trim() || "Business name required"}
          </strong>
        </div>
        <span className="draft-badge">DRAFT COST ESTIMATE</span>
      </div>
      <p className="eyebrow">PROPOSED WORK / FOR YOUR REVIEW</p>
      <h2>{presentation.title.trim() || "Estimate title required"}</h2>
      <p className="muted">
        A clear breakdown of the proposed equipment and services.
      </p>
      <div className="receipt-controls receipt-actions">
        <button onClick={onEdit}>← Edit items</button>
        <button
          className="primary"
          disabled={!ready}
          onClick={() => window.print()}
        >
          Print / save estimate
        </button>
      </div>
      <section className="recipient-card" aria-label="Customer and property">
        <p className="eyebrow">PREPARED FOR</p>
        {customer ? (
          <>
            <h3>{customer.name}</h3>
            <p>{customer.address}</p>
            <small>Recorded system: {customer.systemType}</small>
          </>
        ) : (
          <p>Select a customer before creating an estimate.</p>
        )}
      </section>
      <p className="verification-flag">
        <strong>Verification required</strong> · Confirm diagnosis, equipment
        compatibility, labor scope and final customer pricing before issuing.
      </p>
      {groups
        .filter((g) => g.lines.length)
        .map((g) => (
          <section className="estimate-group" key={g.kind} aria-label={g.title}>
            <div className="group-heading">
              <h3>{g.title}</h3>
              <small>
                {g.lines.length} line {g.lines.length === 1 ? "item" : "items"}
              </small>
            </div>
            {g.lines.map((l) => {
              const i = catalog.find((i) => i.id === l.id)!;
              return (
                <article className="review-line" key={l.id}>
                  <div>
                    <strong>{i.name}</strong>
                    <small>
                      {l.quantity} {g.unit} × {money(i.cents)} /{" "}
                      {g.kind === "labor" ? "hour" : "unit"}
                    </small>
                  </div>
                  <strong>{money(lineTotal(i, l.quantity))}</strong>
                </article>
              );
            })}
            <div className="group-subtotal">
              <span>{g.kind === "labor" ? "Labor" : "Equipment"} subtotal</span>
              <strong>{money(total(g.lines))}</strong>
            </div>
          </section>
        ))}
      {!lines.length && (
        <p className="callout">
          No items selected. Choose Edit items to build your estimate.
        </p>
      )}
      <div className="receipt-grand">
        <span>Estimated subtotal</span>
        <strong>{money(total(lines))}</strong>
      </div>
      <div className="pricing-status">
        <strong>Final customer price: not set</strong>
        <p>
          Amounts above combine catalog equipment costs and listed labor
          charges, not an approved selling price. Confirm business pricing and
          any applicable taxes or fees before issuing a final quote.
        </p>
      </div>
      <p className="muted">
        USD · No tax, markup or additional fees applied. Equipment uses supplied
        catalog base costs; confirm business pricing before issuing.
      </p>
      <section className="receipt-notes">
        <h3>Scope of work</h3>
        <small>
          Editable proposed scope. Review again after changing selected items.
        </small>
        <p>
          {notes ||
            "Scope has not been documented. Confirm the work included before proceeding."}
        </p>
      </section>
      <section className="receipt-notes">
        <h3>Assumptions & verification</h3>
        <p>
          {presentation.assumptions ||
            "No job-specific assumptions documented."}
        </p>
        <p className="muted">
          Equipment compatibility, diagnosis and final scope require technician
          verification. Listed items were selected by the technician; this
          document does not certify a completed inspection.
        </p>
      </section>
      <section className="receipt-notes">
        <h3>Exclusions</h3>
        <p>
          {presentation.exclusions ||
            "Exclusions have not been specified. Confirm any work or charges outside this estimate before proceeding."}
        </p>
      </section>
      <details className="receipt-controls estimate-editor">
        <summary>Customize estimate & scope</summary>
        <p className="muted">
          Enter only your actual business details and agreed job scope. Blank
          sections remain explicitly unspecified.
        </p>
        <label>
          Business / display name *
          <input
            maxLength={100}
            value={presentation.businessName}
            onChange={(e) => update("businessName", e.target.value)}
          />
        </label>
        <label>
          Estimate title *
          <input
            maxLength={120}
            value={presentation.title}
            onChange={(e) => update("title", e.target.value)}
          />
        </label>
        <button
          disabled={!lines.length}
          onClick={() => {
            if (
              !notes.trim() ||
              window.confirm(
                "Replace the current scope with a draft based on the selected items?",
              )
            )
              onNotesChange(generateScope(lines));
          }}
        >
          Generate scope from selected items
        </button>
        <p className="muted">
          Generated text is editable and based only on selected items.
          Regenerate after item changes; review before sharing.
        </p>
        <label>
          Scope of work
          <textarea
            maxLength={6000}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Describe what the listed items cover."
          />
        </label>
        <label>
          Assumptions & verification
          <textarea
            maxLength={2000}
            value={presentation.assumptions}
            onChange={(e) => update("assumptions", e.target.value)}
            placeholder="Record measurements or conditions that still need confirmation."
          />
        </label>
        <label>
          Exclusions
          <textarea
            maxLength={2000}
            value={presentation.exclusions}
            onChange={(e) => update("exclusions", e.target.value)}
            placeholder="List agreed exclusions; do not assume additional fees."
          />
        </label>
        {(!presentation.businessName.trim() || !presentation.title.trim()) && (
          <p className="error" role="status">
            Enter a business name and estimate title before printing.
          </p>
        )}
      </details>
      {hasInvalid && (
        <p className="error">
          A quantity needs correction. Choose Edit items before printing.
        </p>
      )}
      <p className="estimate-disclaimer">
        Draft for discussion. This estimate is not a receipt for payment,
        customer acceptance, or a binding agreement. Confirm pricing, scope and
        technical suitability before issuing.
      </p>
    </div>
  );
}
