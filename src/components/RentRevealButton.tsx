"use client";

import { useState } from "react";

// =============================================================================
//  RentRevealButton — toggles masked rent figures on the Leases page
// =============================================================================
//  Rent is rendered masked by default (•••• in each cell). This button flips a
//  `rents-on` class on the table wrapper (#rent-scope), which CSS uses to swap
//  the mask for the real value. Default-masked keeps rent out of screenshots /
//  shoulder-surfing even though the page itself is already admin-only.
// =============================================================================

export default function RentRevealButton() {
  const [shown, setShown] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        const scope = document.getElementById("rent-scope");
        if (scope) setShown(scope.classList.toggle("rents-on"));
      }}
      aria-pressed={shown}
      className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100"
    >
      {shown ? "Hide rents" : "Show rents"}
    </button>
  );
}
