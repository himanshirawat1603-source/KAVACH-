import { IncidentRecord } from '../types/incident';
import { CaseGuidedWorkflow } from './CaseGuidedWorkflow';

interface CreateCaseFlowProps {
  onCaseCreated: (created: IncidentRecord) => void;
  onCaseUpdated: (updated: IncidentRecord) => void;
  onOpenCreatedCase?: (caseCode: string) => void;
  onExitToMyCases: () => void;
  onCancel: () => void;
}

export function CreateCaseFlow({
  onCaseCreated,
  onCaseUpdated,
  onExitToMyCases,
  onCancel,
}: CreateCaseFlowProps) {
  return (
    <CaseGuidedWorkflow
      initialCase={null}
      forcedInitialStage={1}
      onCaseCreated={onCaseCreated}
      onCaseUpdated={onCaseUpdated}
      onExitToMyCases={onExitToMyCases}
      onCancelCreate={onCancel}
    />
  );
}
