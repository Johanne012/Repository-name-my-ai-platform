import React, { useState, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Play, Save, Download, Upload, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

interface WorkflowNode {
  id: string;
  agentId: string;
  x: number;
  y: number;
  label: string;
}

interface WorkflowEdge {
  id: string;
  from: string;
  to: string;
}

export default function Orchestration() {
  const [workflowName, setWorkflowName] = useState('');
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const { data: agents } = trpc.agents.list.useQuery();
  const createWorkflow = trpc.workflows.create.useMutation();
  const executeWorkflow = trpc.workflows.execute.useMutation();

  const handleAddNode = useCallback((agentId: number) => {
    if (!agentId) {
      toast.error('اختر وكيل أولاً');
      return;
    }

    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      agentId: agentId.toString(),
      x: Math.random() * 400,
      y: Math.random() * 400,
      label: agents?.find(a => a.id === agentId)?.name || 'وكيل جديد',
    };

    setNodes([...nodes, newNode]);
    toast.success('تم إضافة الوكيل إلى سير العمل');
  }, [agents]);

  const handleDeleteNode = (nodeId: string) => {
    setNodes(nodes.filter(n => n.id !== nodeId));
    setEdges(edges.filter(e => e.from !== nodeId && e.to !== nodeId));
    setSelectedNode(null);
    toast.success('تم حذف الوكيل من سير العمل');
  };

  const handleConnectNodes = (fromId: string, toId: string) => {
    if (fromId === toId) {
      toast.error('لا يمكن ربط الوكيل بنفسه');
      return;
    }

    const edgeExists = edges.some(e => String(e.from) === fromId && String(e.to) === toId);
    if (edgeExists) {
      toast.error('الاتصال موجود بالفعل');
      return;
    }

    const newEdge: WorkflowEdge = {
      id: `edge-${Date.now()}`,
      from: fromId,
      to: toId,
    };

    setEdges([...edges, newEdge]);
    toast.success('تم ربط الوكلاء بنجاح');
  };

  const handleSaveWorkflow = async () => {
    if (!workflowName.trim()) {
      toast.error('أدخل اسم سير العمل');
      return;
    }

    if (nodes.length === 0) {
      toast.error('أضف وكلاء إلى سير العمل');
      return;
    }

    try {
      await createWorkflow.mutateAsync({
        name: workflowName,
        nodes: nodes.map(n => ({ agentId: Number(n.agentId), position: { x: n.x, y: n.y } })),
        edges: edges.map(e => ({ from: Number(e.from), to: Number(e.to) })),
      });

      toast.success('تم حفظ سير العمل بنجاح');
      setWorkflowName('');
      setNodes([]);
      setEdges([]);
    } catch (error: any) {
      toast.error(`خطأ: ${error.message}`);
    }
  };

  const handleExecuteWorkflow = async () => {
    if (nodes.length === 0) {
      toast.error('لا يوجد وكلاء في سير العمل');
      return;
    }

    try {
      await executeWorkflow.mutateAsync({
        nodes: nodes.map(n => ({ agentId: Number(n.agentId), position: { x: n.x, y: n.y } })),
        edges: edges.map(e => ({ from: Number(e.from), to: Number(e.to) })),
      });

      toast.success('تم بدء تنفيذ سير العمل');
    } catch (error: any) {
      toast.error(`خطأ: ${error.message}`);
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) { // Right click
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      // Pan implementation would go here
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <DashboardLayout title="تنسيق الوكلاء المتعددة">
      <div className="space-y-6">
        {/* Workflow Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>إنشاء سير عمل جديد</CardTitle>
            <CardDescription>رسم وتنسيق عمل عدة وكلاء معاً</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="اسم سير العمل"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
              />
              <select className="border rounded-md px-3 py-2">
                <option value="">اختر وكيل</option>
                {agents?.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
              <Button
              onClick={() => {
                const select = document.querySelector('select') as HTMLSelectElement;
                if (select?.value) {
                  handleAddNode(Number(select.value));
                  select.value = '';
                }
              }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                إضافة وكيل
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Canvas */}
        <Card>
          <CardHeader>
            <CardTitle>لوحة الرسم</CardTitle>
            <CardDescription>اسحب الوكلاء وارسم الاتصالات بينهم</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 relative"
              style={{ height: '500px' }}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onContextMenu={(e) => e.preventDefault()}
            >
              {/* SVG for edges */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ zIndex: 0 }}
              >
                {edges.map(edge => {
                  const fromNode = nodes.find(n => n.id === edge.from);
                  const toNode = nodes.find(n => n.id === edge.to);
                  if (!fromNode || !toNode) return null;

                  return (
                    <line
                      key={edge.id}
                      x1={fromNode.x + 50}
                      y1={fromNode.y + 25}
                      x2={toNode.x + 50}
                      y2={toNode.y + 25}
                      stroke="#3b82f6"
                      strokeWidth="2"
                      markerEnd="url(#arrowhead)"
                    />
                  );
                })}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
                  </marker>
                </defs>
              </svg>

              {/* Nodes */}
              <div className="relative w-full h-full" style={{ zIndex: 1 }}>
                {nodes.map(node => (
                  <div
                    key={node.id}
                    className={`absolute w-24 h-12 rounded-lg border-2 cursor-move flex items-center justify-center text-center text-sm font-semibold transition-all ${
                      selectedNode === node.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-300 bg-white hover:border-blue-400'
                    }`}
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      transform: `scale(${zoom})`,
                      transformOrigin: 'top left',
                    }}
                    onClick={() => setSelectedNode(node.id)}
                    onDoubleClick={() => {
                      const toNodeId = nodes.find(n => n.id !== node.id)?.id;
                      if (toNodeId) handleConnectNodes(node.id, toNodeId);
                    }}
                  >
                    <div className="text-center">
                      <p className="text-xs truncate">{node.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                  <p>أضف وكلاء لبدء الرسم</p>
                </div>
              )}
            </div>

            {/* Canvas Controls */}
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.min(zoom + 0.2, 2))}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.max(zoom - 0.2, 0.5))}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(1)}
              >
                إعادة تعيين
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Summary */}
        {nodes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>ملخص سير العمل</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600">عدد الوكلاء</p>
                  <p className="text-2xl font-bold">{nodes.length}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">عدد الاتصالات</p>
                  <p className="text-2xl font-bold">{edges.length}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-semibold">الوكلاء المستخدمة:</p>
                <div className="flex flex-wrap gap-2">
                  {nodes.map(node => (
                    <Badge key={node.id} variant="secondary" className="gap-2">
                      {node.label}
                      <button
                        onClick={() => handleDeleteNode(node.id)}
                        className="ml-1 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSaveWorkflow}
                  className="gap-2"
                  disabled={createWorkflow.isPending}
                >
                  <Save className="w-4 h-4" />
                  حفظ سير العمل
                </Button>
                <Button
                  onClick={handleExecuteWorkflow}
                  variant="default"
                  className="gap-2"
                  disabled={executeWorkflow.isPending}
                >
                  <Play className="w-4 h-4" />
                  تنفيذ الآن
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  تصدير
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
