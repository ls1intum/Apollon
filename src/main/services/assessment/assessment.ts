import { FeedbackCorrectionStatus } from '../../typings';

export interface IAssessment {
  score: number;
  feedback?: string;
  label?: string;
  labelColor?: string;
  dropInfo?: any;
  correctionStatus?: FeedbackCorrectionStatus;
}
