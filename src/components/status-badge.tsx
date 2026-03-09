import { Badge } from "@/components/ui/badge";
import { GpStatus, SubmissionStatus } from "@/lib/types";

export function GpStatusBadge({ status }: { status: GpStatus }) {
  if (status === "finalized") return <Badge variant="success">Finalized</Badge>;
  if (status === "under_review") return <Badge variant="warning">Under Review</Badge>;
  return <Badge variant="neutral">Draft</Badge>;
}

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  switch (status) {
    case "both_detected":
      return <Badge variant="success">Both Teams Detected</Badge>;
    case "one_team_missing":
      return <Badge variant="warning">One Team Missing</Badge>;
    case "needs_review":
      return <Badge variant="danger">Needs Review</Badge>;
    case "manually_corrected":
      return <Badge variant="accent">Manually Corrected</Badge>;
    case "finalized":
      return <Badge variant="success">Finalized</Badge>;
    default:
      return <Badge variant="neutral">Missing Submission</Badge>;
  }
}
