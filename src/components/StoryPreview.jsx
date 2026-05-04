import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  Trash2
} from "lucide-react";
import { createJiraTicket } from "../services/createJiraTicket.js";

const PRIORITIES = ["High", "Medium", "Low"];

function Field({ label, children }) {
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      <div className="field-control">{children}</div>
    </div>
  );
}

function DebugInfoPanel({ debugInfo }) {
  if (!import.meta.env.DEV || !debugInfo) {
    return null;
  }

  return (
    <div className="debug-panel" aria-label="Debug Info">
      <div className="debug-panel-title">Debug Info</div>
      <dl>
        <div>
          <dt>Source</dt>
          <dd>{debugInfo.source}</dd>
        </div>
        <div>
          <dt>Model</dt>
          <dd>{debugInfo.model}</dd>
        </div>
        <div>
          <dt>Response time</dt>
          <dd>{debugInfo.responseTimeMs} ms</dd>
        </div>
        {debugInfo.fallbackReason && (
          <div>
            <dt>Fallback reason</dt>
            <dd>{debugInfo.fallbackReason}</dd>
          </div>
        )}
        <div>
          <dt>Last request</dt>
          <dd>{debugInfo.timestamp}</dd>
        </div>
      </dl>
    </div>
  );
}

function ReadOnlyList({ items, emptyText }) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];

  if (safeItems.length === 0) {
    return <p className="empty-list-copy">{emptyText}</p>;
  }

  return (
    <ul className="readonly-list">
      {safeItems.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

function buildImprovementHighlights(requirement, story) {
  if (!story) {
    return null;
  }

  const requirementWords = requirement.trim().split(/\s+/).filter(Boolean).length;

  return {
    clarified: [
      story.userStory ? "Converted client wording into a role-based user story." : "",
      story.priority ? `Assigned priority as ${story.priority}.` : "",
      story.epic ? `Grouped the work under the ${story.epic} epic.` : ""
    ].filter(Boolean),
    structured: [
      `Created ${story.acceptanceCriteria?.length || 0} testable acceptance criteria.`,
      `Extracted ${story.labels?.length || 0} Jira labels from ${requirementWords} input words.`,
      "Separated Jira-ready fields for summary, description, criteria, priority, labels, and epic."
    ],
    assumptions: Array.isArray(story.assumptions) ? story.assumptions.filter(Boolean) : []
  };
}

function HighlightImprovements({ highlights }) {
  if (!highlights) {
    return null;
  }

  return (
    <div className="improvement-diff" aria-label="Highlight Improvements">
      <div className="improvement-title">Highlight Improvements</div>
      <div className="diff-row">
        <span className="diff-marker diff-marker-blue">~</span>
        <div>
          <strong>Clarified</strong>
          <ReadOnlyList items={highlights.clarified} emptyText="No clarification changes." />
        </div>
      </div>
      <div className="diff-row">
        <span className="diff-marker diff-marker-green">+</span>
        <div>
          <strong>Structured</strong>
          <ReadOnlyList items={highlights.structured} emptyText="No structure changes." />
        </div>
      </div>
      <div className="diff-row">
        <span className="diff-marker diff-marker-yellow">?</span>
        <div>
          <strong>Added as assumptions</strong>
          <ReadOnlyList items={highlights.assumptions} emptyText="No assumptions added." />
        </div>
      </div>
    </div>
  );
}

export function StoryPreview({ story, requirement, hasGroomed, isGrooming, onStoryChange }) {
  const [validationError, setValidationError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createdTicket, setCreatedTicket] = useState(null);
  const canCreateTicket = Boolean(story?.summary?.trim() && story?.description?.trim());
  const highlights = buildImprovementHighlights(requirement, story);

  useEffect(() => {
    setValidationError("");
    setIsCreating(false);
    setCreatedTicket(null);
  }, [story?.summary]);

  function updateField(field, value) {
    setValidationError("");
    setCreatedTicket(null);
    onStoryChange({ ...story, [field]: value });
  }

  function updateCriterion(index, value) {
    const acceptanceCriteria = story.acceptanceCriteria.map((criterion, currentIndex) =>
      currentIndex === index ? value : criterion
    );

    updateField("acceptanceCriteria", acceptanceCriteria);
  }

  function addCriterion() {
    updateField("acceptanceCriteria", [...story.acceptanceCriteria, ""]);
  }

  function removeCriterion(index) {
    const acceptanceCriteria = story.acceptanceCriteria.filter(
      (_, currentIndex) => currentIndex !== index
    );

    updateField("acceptanceCriteria", acceptanceCriteria);
  }

  function updateLabel(index, value) {
    const labels = story.labels.map((label, currentIndex) =>
      currentIndex === index ? value : label
    );

    updateField("labels", labels);
  }

  function addLabel() {
    updateField("labels", [...story.labels, ""]);
  }

  function removeLabel(index) {
    const labels = story.labels.filter((_, currentIndex) => currentIndex !== index);

    updateField("labels", labels);
  }

  async function handleCreateTicket(event) {
    event.preventDefault();

    if (!canCreateTicket) {
      setValidationError("Summary and Description are required before creating a ticket.");
      setCreatedTicket(null);
      return;
    }

    setValidationError("");
    setCreatedTicket(null);
    setIsCreating(true);

    try {
      const ticket = await createJiraTicket(story);
      setCreatedTicket(ticket);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <section className="panel preview-panel" aria-labelledby="preview-title">
      <div className="panel-header">
        <div>
          <p className="section-kicker">After</p>
          <h2 id="preview-title">Create Jira issue</h2>
        </div>
        <div className="preview-badges">
          {hasGroomed && (
            <span className="status-pill status-pill-green">
              <CheckCircle2 size={14} />
              AI Groomed
            </span>
          )}
          {story?.usingMockAiOutput && (
            <span className="status-pill status-pill-yellow">
              Using mock AI output
            </span>
          )}
          <span className="status-pill status-pill-blue">
            <FileText size={14} />
            {story ? "AUTH-128" : "Draft"}
          </span>
        </div>
      </div>

      {isGrooming ? (
        <div className="grooming-state" aria-live="polite">
          <div className="grooming-card">
            <Loader2 className="spin-icon" size={34} />
            <h3>Grooming story...</h3>
            <p>Extracting Jira fields, acceptance criteria, priority, and labels.</p>
            <div className="skeleton-stack" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      ) : !story ? (
        <div className="empty-state">
          <div className="empty-icon">
            <ClipboardCheck size={34} />
          </div>
          <h3>{hasGroomed ? "Nothing to preview" : "Story preview is empty"}</h3>
          <p>
            Add a messy requirement on the left and groom it to see structured
            Jira fields here.
          </p>
        </div>
      ) : (
        <form className="story-fields jira-card" onSubmit={handleCreateTicket}>
          <div className="jira-card-top">
            <div>
              <span className="issue-type-chip">{story.issueType}</span>
              <h3>{story.summary || "Untitled Jira story"}</h3>
            </div>
            <span className="priority-chip">{story.priority}</span>
          </div>
          <Field label="Issue Type">{story.issueType}</Field>
          <Field label="Epic">{story.epic}</Field>
          <Field label="Summary">
            <input
              className={`edit-input ${validationError && !story.summary.trim() ? "input-error" : ""}`}
              value={story.summary}
              onChange={(event) => updateField("summary", event.target.value)}
              aria-label="Summary"
              aria-invalid={validationError && !story.summary.trim() ? "true" : "false"}
            />
          </Field>
          <Field label="User Story">
            <textarea
              className="edit-textarea edit-textarea-short"
              value={story.userStory}
              onChange={(event) => updateField("userStory", event.target.value)}
              aria-label="User Story"
            />
          </Field>
          <Field label="Description">
            <textarea
              className={`edit-textarea ${
                validationError && !story.description.trim() ? "input-error" : ""
              }`}
              value={story.description}
              onChange={(event) => updateField("description", event.target.value)}
              aria-label="Description"
              aria-invalid={validationError && !story.description.trim() ? "true" : "false"}
            />
          </Field>
          <Field label="Acceptance Criteria">
            <div className="editable-list">
              {story.acceptanceCriteria.map((criterion, index) => (
                <div className="editable-row" key={`criterion-${index}`}>
                  <textarea
                    className="edit-textarea row-textarea"
                    value={criterion}
                    onChange={(event) => updateCriterion(index, event.target.value)}
                    aria-label={`Acceptance criterion ${index + 1}`}
                  />
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => removeCriterion(index)}
                    aria-label={`Remove acceptance criterion ${index + 1}`}
                    title="Remove acceptance criterion"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button className="secondary-button" type="button" onClick={addCriterion}>
                <Plus size={16} />
                Add criterion
              </button>
            </div>
          </Field>
          <Field label="Assumptions">
            <ReadOnlyList
              items={story.assumptions}
              emptyText="No assumptions were identified."
            />
          </Field>
          <Field label="Questions">
            <ReadOnlyList
              items={story.questions}
              emptyText="No client questions were identified."
            />
          </Field>
          <Field label="Priority">
            <select
              className="edit-input edit-select"
              value={story.priority}
              onChange={(event) => updateField("priority", event.target.value)}
              aria-label="Priority"
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Labels">
            <div className="editable-list">
              <div className="label-grid">
                {story.labels.map((label, index) => (
                  <div className="label-editor" key={`label-${index}`}>
                    <input
                      className="edit-input label-input"
                      value={label}
                      onChange={(event) => updateLabel(index, event.target.value)}
                      aria-label={`Label ${index + 1}`}
                    />
                    <button
                      className="icon-button"
                      type="button"
                      onClick={() => removeLabel(index)}
                      aria-label={`Remove label ${index + 1}`}
                      title="Remove label"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <button className="secondary-button" type="button" onClick={addLabel}>
                <Plus size={16} />
                Add label
              </button>
            </div>
          </Field>
          <HighlightImprovements highlights={highlights} />
          <DebugInfoPanel debugInfo={story.debugInfo} />
          {(validationError || createdTicket) && (
            <div className="ticket-status" aria-live="polite">
              {validationError && <p className="validation-message">{validationError}</p>}
              {createdTicket && (
                <div className="success-message">
                  <CheckCircle2 size={20} />
                  <div>
                    <strong>Mock Jira ticket created: {createdTicket.ticketKey}</strong>
                    <span>No Jira API was called. This is a local prototype result.</span>
                  </div>
                  <a className="mock-ticket-link" href={createdTicket.ticketUrl}>
                    View Mock Ticket
                    <ExternalLink size={15} />
                  </a>
                </div>
              )}
            </div>
          )}
          <div className="issue-actions">
            <button type="submit" disabled={isCreating || !canCreateTicket}>
              {isCreating ? (
                <>
                  <Loader2 className="spin-icon" size={18} />
                  Creating...
                </>
              ) : (
                "Create Jira Ticket"
              )}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
