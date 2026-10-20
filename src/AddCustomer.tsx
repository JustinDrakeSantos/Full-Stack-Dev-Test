import { useState, type FormEvent } from "react";
import { localCustomerSchema, type LocalCustomer } from "./localCustomers";
export default function AddCustomer({
  onSave,
  onCancel,
}: {
  onSave: (customer: LocalCustomer) => string | undefined;
  onCancel: () => void;
}) {
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const number = (name: string) =>
      text(name) === "" ? undefined : Number(text(name));
    const result = localCustomerSchema.safeParse({
      id: `LOCAL-${crypto.randomUUID()}`,
      name: text("name"),
      address: text("address"),
      phone: text("phone") || undefined,
      propertyType: text("propertyType"),
      systemType: text("systemType") || "Unknown",
      squareFootage: number("squareFootage"),
      systemAge: number("systemAge"),
    });
    if (!result.success) {
      setError(
        result.error.issues
          .map((i) => `${i.path.join("")}: ${i.message}`)
          .join(". "),
      );
      return;
    }
    const message = onSave(result.data);
    if (message) setError(message);
  }
  return (
    <form className="new-customer" onSubmit={submit}>
      <h3>New customer & property</h3>
      <p className="muted">
        Saved only in this browser, not shared with the office or other devices.
        One record represents one customer at one property. Only name and site
        address are required.
      </p>
      <label>
        Customer / business name *
        <input
          name="name"
          autoFocus
          required
          maxLength={120}
          autoComplete="name"
        />
      </label>
      <label>
        Property address *
        <textarea
          name="address"
          required
          maxLength={240}
          autoComplete="street-address"
        />
      </label>
      <div className="fields">
        <label>
          Phone (optional)
          <input name="phone" type="tel" maxLength={40} autoComplete="tel" />
        </label>
        <label>
          Property type
          <select name="propertyType" defaultValue="Unknown">
            <option value="Unknown">Unknown</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
          </select>
        </label>
        <label>
          Area in sq ft (optional)
          <input
            name="squareFootage"
            type="number"
            min={1}
            max={10000000}
            step={1}
          />
        </label>
        <label>
          System age in years (optional)
          <input name="systemAge" type="number" min={0} max={200} step={1} />
        </label>
      </div>
      <label>
        Recorded system (optional)
        <input
          name="systemType"
          maxLength={120}
          placeholder="Leave blank if not known"
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="receipt-actions">
        <button className="primary" type="submit">
          Save & start inspection →
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
