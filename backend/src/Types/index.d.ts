export interface CandidateInput {
  name: string;
  email?: string;
}

import { type InputJsonValue } from "../generated/prisma";

export interface SessionInput {
  candidateId: string;
  videoUrl?: string;
}

export interface EventInput {
  sessionId: string;
  type: string;
  label?: string;
  duration?: number;
  confidence?: number;
  meta?: InputJsonValue;
}

export interface ReportInput {
  sessionId: string;
  format: string;
  fileUrl: string;
}

export interface EventStatistic {
  type: string;
  count: number;
}

export interface SessionStatistics {
  totalEvents: number;
  duration: number;
  eventsByType: EventStatistic[];
}

export interface Candidate {
  id: string;
  name: string;
  email?: string | null;
}

export interface Session {
  id: string;
  candidateId: string;
  startTime: Date;
  endTime?: Date | null;
  videoUrl?: string | null;
  integrityScore?: number | null;
  duration?: number | null;
}

export interface Event {
  id: string;
  sessionId: string;
  type: string;
  timestamp: Date;
  label?: string | null;
  duration?: number | null;
  confidence?: number | null;
  meta?: InputJsonValue | null;
}

export interface WebSocketMessage {
  type: string;
  sessionId?: string;
  role?: 'candidate' | 'interviewer';
  data?: {
    type: string;
    label?: string;
    confidence?: number;
    duration?: number;
    meta?: InputJsonValue;
  };
  events?: EventInput[];
  [key: string]: unknown;
}

export interface WSClient {
  id: string;
  sessionId?: string;
  role?: 'candidate' | 'interviewer';
}
