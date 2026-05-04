import React from "react";
import { FilePlus2, Loader2, RotateCcw, WandSparkles } from "lucide-react";

export function RequirementPanel({
  value,
  onChange,
  onGroom,
  onUseExample,
  onReset,
  canGroom,
  isGrooming,
  error
}) {
  return (
    <section className="panel input-panel" aria-labelledby="requirements-title">
      <div className="panel-header">
        <div>
          <p className="section-kicker">Before</p>
          <h2 id="requirements-title">Messy client requirement</h2>
        </div>
        <span className="status-pill">Draft notes</span>
      </div>

      <div className="input-toolbar" aria-label="Requirement helpers">
        <button className="secondary-button" type="button" onClick={onUseExample}>
          <FilePlus2 size={16} />
          Example client requirement
        </button>
        <div className="input-primary-actions">
          <button className="ghost-button" type="button" onClick={onReset}>
            <RotateCcw size={16} />
            Reset
          </button>
          <button type="button" onClick={onGroom} disabled={!canGroom}>
            {isGrooming ? (
              <>
                <Loader2 className="spin-icon" size={18} />
                Grooming...
              </>
            ) : (
              <>
                <WandSparkles size={18} />
                Groom Story
              </>
            )}
          </button>
        </div>
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste raw client requirements, call notes, Slack snippets, or meeting bullets..."
        aria-label="Messy client requirement"
      />

      <div className="input-footer">
        <span>{value.trim().length} characters</span>
      </div>
      {error && (
        <div className="input-error-message" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}
