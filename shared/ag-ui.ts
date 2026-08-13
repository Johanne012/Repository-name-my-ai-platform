/**
 * AG-UI Protocol — Agent-User Interaction event types
 * Spec-aligned subset used by our agent runtime.
 * Compatible with CopilotKit Channels SDK and any AG-UI client.
 *
 * @see https://docs.ag-ui.com
 * @see https://github.com/ag-ui-protocol/ag-ui
 */

export const EventType = {
  RUN_STARTED: "RUN_STARTED",
  RUN_FINISHED: "RUN_FINISHED",
  RUN_ERROR: "RUN_ERROR",
  STEP_STARTED: "STEP_STARTED",
  STEP_FINISHED: "STEP_FINISHED",
  TEXT_MESSAGE_START: "TEXT_MESSAGE_START",
  TEXT_MESSAGE_CONTENT: "TEXT_MESSAGE_CONTENT",
  TEXT_MESSAGE_END: "TEXT_MESSAGE_END",
  TOOL_CALL_START: "TOOL_CALL_START",
  TOOL_CALL_ARGS: "TOOL_CALL_ARGS",
  TOOL_CALL_END: "TOOL_CALL_END",
  TOOL_CALL_RESULT: "TOOL_CALL_RESULT",
  STATE_SNAPSHOT: "STATE_SNAPSHOT",
  STATE_DELTA: "STATE_DELTA",
  MESSAGES_SNAPSHOT: "MESSAGES_SNAPSHOT",
  RAW: "RAW",
  CUSTOM: "CUSTOM",
} as const;

export type EventTypeName = (typeof EventType)[keyof typeof EventType];

export type BaseEvent = {
  type: EventTypeName;
  timestamp?: number;
};

export type RunStartedEvent = BaseEvent & {
  type: typeof EventType.RUN_STARTED;
  threadId: string;
  runId: string;
  parentRunId?: string;
};

export type RunFinishedEvent = BaseEvent & {
  type: typeof EventType.RUN_FINISHED;
  threadId: string;
  runId: string;
  result?: unknown;
};

export type RunErrorEvent = BaseEvent & {
  type: typeof EventType.RUN_ERROR;
  threadId: string;
  runId: string;
  message: string;
  code?: string;
};

export type StepStartedEvent = BaseEvent & {
  type: typeof EventType.STEP_STARTED;
  stepId: string;
  stepName?: string;
};

export type StepFinishedEvent = BaseEvent & {
  type: typeof EventType.STEP_FINISHED;
  stepId: string;
};

export type TextMessageStartEvent = BaseEvent & {
  type: typeof EventType.TEXT_MESSAGE_START;
  messageId: string;
  role: "assistant" | "user" | "system" | "tool";
};

export type TextMessageContentEvent = BaseEvent & {
  type: typeof EventType.TEXT_MESSAGE_CONTENT;
  messageId: string;
  delta: string;
};

export type TextMessageEndEvent = BaseEvent & {
  type: typeof EventType.TEXT_MESSAGE_END;
  messageId: string;
};

export type ToolCallStartEvent = BaseEvent & {
  type: typeof EventType.TOOL_CALL_START;
  toolCallId: string;
  toolCallName: string;
  parentMessageId?: string;
};

export type ToolCallArgsEvent = BaseEvent & {
  type: typeof EventType.TOOL_CALL_ARGS;
  toolCallId: string;
  delta: string;
};

export type ToolCallEndEvent = BaseEvent & {
  type: typeof EventType.TOOL_CALL_END;
  toolCallId: string;
};

export type ToolCallResultEvent = BaseEvent & {
  type: typeof EventType.TOOL_CALL_RESULT;
  toolCallId: string;
  content: string;
  role?: "tool";
};

export type StateSnapshotEvent = BaseEvent & {
  type: typeof EventType.STATE_SNAPSHOT;
  snapshot: Record<string, unknown>;
};

export type MessagesSnapshotEvent = BaseEvent & {
  type: typeof EventType.MESSAGES_SNAPSHOT;
  messages: Array<{
    id: string;
    role: string;
    content: string;
  }>;
};

export type CustomEvent = BaseEvent & {
  type: typeof EventType.CUSTOM;
  name: string;
  value?: unknown;
};

export type AgUiEvent =
  | RunStartedEvent
  | RunFinishedEvent
  | RunErrorEvent
  | StepStartedEvent
  | StepFinishedEvent
  | TextMessageStartEvent
  | TextMessageContentEvent
  | TextMessageEndEvent
  | ToolCallStartEvent
  | ToolCallArgsEvent
  | ToolCallEndEvent
  | ToolCallResultEvent
  | StateSnapshotEvent
  | MessagesSnapshotEvent
  | CustomEvent;

/** Input accepted by an AG-UI compatible agent run */
export type RunAgentInput = {
  threadId?: string;
  runId?: string;
  messages: Array<{
    id?: string;
    role: "system" | "user" | "assistant" | "tool";
    content: string;
  }>;
  tools?: Array<{
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  }>;
  context?: Array<{ description: string; value: string }>;
  state?: Record<string, unknown>;
  /** Platform agent id (our internal agents table id) */
  agentId?: number;
  /** Optional model override */
  model?: string;
};

export function nowTs(): number {
  return Date.now();
}

export function sseEncode(event: AgUiEvent): string {
  return `data: ${JSON.stringify({ ...event, timestamp: event.timestamp ?? nowTs() })}\n\n`;
}
