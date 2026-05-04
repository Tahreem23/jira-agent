import React from "react";
import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { RequirementPanel } from "./components/RequirementPanel.jsx";
import { StoryPreview } from "./components/StoryPreview.jsx";
import { groomRequirement } from "./services/groomRequirement.js";

const starterRequirement =
  "Client wants users to register and login. Users should verify email, reset forgotten password, and admin should approve new users before access.";

export default function App() {
  const [requirement, setRequirement] = useState(starterRequirement);
  const [story, setStory] = useState(null);
  const [hasGroomed, setHasGroomed] = useState(false);
  const [isGrooming, setIsGrooming] = useState(false);
  const [groomError, setGroomError] = useState("");

  const canGroom = useMemo(
    () => requirement.trim().length > 0 && !isGrooming,
    [isGrooming, requirement]
  );

  async function handleGroomStory() {
    if (!canGroom) return;

    setStory(null);
    setHasGroomed(false);
    setGroomError("");
    setIsGrooming(true);

    try {
      const groomedStory = await groomRequirement(requirement);
      setStory(groomedStory);
      setHasGroomed(true);
    } catch (error) {
      setGroomError(error.message || "Unable to groom story.");
    } finally {
      setIsGrooming(false);
    }
  }

  function handleUseExample() {
    setRequirement(starterRequirement);
    setStory(null);
    setHasGroomed(false);
    setGroomError("");
    setIsGrooming(false);
  }

  function handleReset() {
    setRequirement("");
    setStory(null);
    setHasGroomed(false);
    setGroomError("");
    setIsGrooming(false);
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Product operations workspace</p>
          <h2>Jira AI Story Grooming Agent</h2>
          <p className="hero-copy">
            Convert rough client notes into a structured Jira-ready story preview.
          </p>
        </div>
        <div className="hero-badge" aria-label="AI grooming status">
          <Sparkles size={18} />
          Backend AI
        </div>
      </header>

      <section className="workspace-grid" aria-label="Story grooming workspace">
        <RequirementPanel
          value={requirement}
          onChange={setRequirement}
          onGroom={handleGroomStory}
          onUseExample={handleUseExample}
          onReset={handleReset}
          canGroom={canGroom}
          isGrooming={isGrooming}
          error={groomError}
        />
        <StoryPreview
          story={story}
          requirement={requirement}
          hasGroomed={hasGroomed}
          isGrooming={isGrooming}
          onStoryChange={setStory}
        />
      </section>
    </main>
  );
}
