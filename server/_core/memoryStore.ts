/**
 * In-memory store for zero-config mode (no DATABASE_URL).
 * Survives within a single serverless instance lifetime; enough for a real demo.
 */

export type MemoryAgent = {
  id: number;
  name: string;
  description: string;
  systemPrompt: string;
  model: string;
  status: "active" | "inactive";
  createdAt: string;
};

export type MemoryExecution = {
  id: number;
  agentId: number;
  input: string;
  output: string;
  status: string;
  provider?: string;
  latencyMs?: number;
  createdAt: string;
};

let nextAgentId = 100;
let nextExecId = 1;

const agents = new Map<number, MemoryAgent>();
const executions: MemoryExecution[] = [];

function seed() {
  if (agents.size > 0) return;
  const now = new Date().toISOString();
  const seeds: Omit<MemoryAgent, "id" | "createdAt">[] = [
    {
      name: "مساعد عام",
      description: "وكيل محادثة عام بالعربية والإنجليزية",
      systemPrompt:
        "أنت مساعد ذكي مفيد على منصة AgenticAI. أجب بوضوح وباللغة التي يستخدمها المستخدم.",
      model: "demo-agent-v1",
      status: "active",
    },
    {
      name: "كاتب محتوى",
      description: "يساعد في كتابة منشورات ومقالات قصيرة",
      systemPrompt:
        "أنت كاتب محتوى محترف. اكتب نصوصاً واضحة وجذابة حسب طلب المستخدم.",
      model: "demo-agent-v1",
      status: "active",
    },
    {
      name: "مساعد برمجة",
      description: "يشرح الكود ويقترح حلولاً برمجية",
      systemPrompt:
        "أنت مساعد برمجة. اشرح باختصار وقدّم أمثلة كود عند الحاجة.",
      model: "demo-agent-v1",
      status: "active",
    },
  ];
  for (const s of seeds) {
    const id = nextAgentId++;
    agents.set(id, { ...s, id, createdAt: now });
  }
}

seed();

export function listMemoryAgents(): MemoryAgent[] {
  seed();
  return Array.from(agents.values()).sort((a, b) => a.id - b.id);
}

export function getMemoryAgent(id: number): MemoryAgent | undefined {
  seed();
  return agents.get(id);
}

export function createMemoryAgent(
  data: Omit<MemoryAgent, "id" | "createdAt" | "status"> & { status?: "active" },
): MemoryAgent {
  seed();
  const agent: MemoryAgent = {
    id: nextAgentId++,
    name: data.name,
    description: data.description || "",
    systemPrompt: data.systemPrompt || "You are a helpful agent.",
    model: data.model || "demo-agent-v1",
    status: "active",
    createdAt: new Date().toISOString(),
  };
  agents.set(agent.id, agent);
  return agent;
}

export function addMemoryExecution(
  row: Omit<MemoryExecution, "id" | "createdAt">,
): MemoryExecution {
  const exec: MemoryExecution = {
    ...row,
    id: nextExecId++,
    createdAt: new Date().toISOString(),
  };
  executions.unshift(exec);
  if (executions.length > 200) executions.length = 200;
  return exec;
}

export function listMemoryExecutions(agentId?: number, limit = 50): MemoryExecution[] {
  const rows = agentId
    ? executions.filter((e) => e.agentId === agentId)
    : executions;
  return rows.slice(0, limit);
}
