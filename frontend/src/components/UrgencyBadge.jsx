import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function UrgencyBadge({ category = 'GREEN', urgency = 'informational' }) {
  const cat = (category || 'GREEN').toUpperCase();

  if (cat === 'RED') {
    return (
      <span className="badge-status-pill red" title="Potentially concerning findings requiring prompt professional medical evaluation.">
        <AlertCircle size={14} />
        <span>Prompt Evaluation (RED)</span>
      </span>
    );
  }

  if (cat === 'YELLOW') {
    return (
      <span className="badge-status-pill yellow" title="Finding should be routinely discussed with a healthcare professional.">
        <AlertTriangle size={14} />
        <span>Doctor Review Recommended (YELLOW)</span>
      </span>
    );
  }

  return (
    <span className="badge-status-pill green" title="All analyzed parameters are within normal reference limits.">
      <CheckCircle2 size={14} />
      <span>Within Reference Range (GREEN)</span>
    </span>
  );
}
