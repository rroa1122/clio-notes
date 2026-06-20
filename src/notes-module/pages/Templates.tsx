import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Edit2, FileText, Save, X, Layout as LayoutIcon, Loader2, Globe, Lock, Plus, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { storage } from '../lib/storage';
import type { Template } from '../lib/storage';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';

const Templates = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string>(storage.getActiveTemplateId());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'content' | 'definition'>('content');
  const [editBuffer, setEditBuffer] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const loadTemplates = async () => {
      // Wait for auth to be ready
      if (loading) return;

      try {
        setError(null);
        const fetched = await storage.getTemplates();
        setTemplates(fetched);
      } catch (err: any) {
        setError(err.message || 'Failed to sync blueprints. Please verify your connection.');
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplates();
  }, [user, loading]); // Dependencies ensure re-run when auth settles

  const handleSave = async (id: string) => {
    const templateToUpdate = templates.find(t => t.id === id);
    if (!templateToUpdate) return;

    const updatedTemplate = {
      ...templateToUpdate,
      ...(editMode === 'content' ? { content: editBuffer } : { definition: editBuffer })
    };

    try {
      await storage.saveTemplate(updatedTemplate);
      setEditingId(null);
      // Re-fetch to ensure single source of truth and clear buffers
      const refreshed = await storage.getTemplates();
      setTemplates(refreshed);
      toast.success('Blueprint updated');
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save changes');
    }
  };

  const startEditing = (template: Template, mode: 'content' | 'definition') => {
    setEditingId(template.id);
    setEditMode(mode);
    setEditBuffer(mode === 'content' ? template.content : (template.definition || '[]'));
  };

  const handleSelect = (id: string) => {
    setActiveId(id);
    storage.setActiveTemplateId(id);
    toast.success('Active blueprint set');
  };

  const togglePublic = async (template: Template) => {
    const updatedStatus = !template.is_public;
    const updated = templates.map(t =>
      t.id === template.id ? { ...t, is_public: updatedStatus } : t
    );
    setTemplates(updated);
    try {
      await storage.saveTemplates(updated);
      toast.success(updatedStatus ? 'Template is now Public' : 'Template is now Private');
    } catch (error) {
      toast.error('Failed to update visibility');
    }
  };

  const handleDelete = async (template: Template) => {
    console.log('handleDelete called for:', template.id, template.name);

    // If not already in confirmation state, set it
    if (confirmDeleteId !== template.id) {
      console.log('Setting confirmation state for:', template.id);
      setConfirmDeleteId(template.id);
      // Optional: reset after 3 seconds
      setTimeout(() => setConfirmDeleteId(prev => prev === template.id ? null : prev), 3000);
      return;
    }

    try {
      console.log('Attempting to delete from storage...');
      await storage.deleteTemplate(template.id);
      console.log('Delete successful in storage');
      setTemplates(prev => {
        const filtered = prev.filter(t => t.id !== template.id);
        console.log('Templates state updated, remaining:', filtered.length);
        return filtered;
      });
      if (activeId === template.id) {
        const remaining = templates.filter(t => t.id !== template.id);
        if (remaining.length > 0) {
          handleSelect(remaining[0].id);
        }
      }
      setConfirmDeleteId(null);
      toast.success('Blueprint deleted');
    } catch (error) {
      console.error('Delete failed in handleDelete:', error);
      toast.error('Failed to delete blueprint');
    }
  };

  const handleCreate = async () => {
    const newTemplate: Template = {
      id: crypto.randomUUID(),
      name: 'New Blueprint',
      version: '1.0.0',
      category: 'General',
      content: 'Enter extraction prompt...',
      definition: '[]',
      is_public: false
    };

    const updated = [...templates, newTemplate];
    setTemplates(updated);
    try {
      await storage.saveTemplates(updated);
      setEditingId(newTemplate.id);
      setEditMode('content');
      setEditBuffer(newTemplate.content);
      toast.success('New blueprint created');
    } catch (error) {
      toast.error('Failed to create blueprint');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="size-12 text-primary animate-spin" />
        <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Synchronizing Blueprints...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="size-16 rounded-3xl bg-red-50 flex items-center justify-center text-red-500 shadow-sm border border-red-100">
          <AlertCircle size={32} />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-slate-900">Blueprint Sync Failed</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">{error}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setIsLoading(true);
            setError(null);
            storage.getTemplates().then(setTemplates).catch(err => setError(err.message)).finally(() => setIsLoading(false));
          }}
          className="rounded-xl gap-2 font-bold px-8"
        >
          <RefreshCw size={16} />
          Retry Connection
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-500 max-w-7xl mx-auto w-full">
      <PageHeader
        title="Analysis Blueprints"
        subtitle="Manage the clinical reasoning logic and extraction templates used by the CLIO engine."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setIsLoading(true);
                storage.getTemplates().then(setTemplates).finally(() => setIsLoading(false));
              }}
              className="rounded-xl border-dashed border-primary/20 text-primary/60 hover:text-primary hover:bg-primary/5"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleCreate}
              className="rounded-xl font-bold uppercase tracking-tighter gap-2 shadow-lg shadow-primary/20"
            >
              <Plus className="h-4 w-4" />
              Create Blueprint
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {templates.length === 0 ? (
          <Card className="col-span-full border-none shadow-none bg-slate-50/50 rounded-3xl py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-200">
            <div className="size-16 rounded-3xl bg-white flex items-center justify-center text-slate-300 shadow-sm border border-slate-100 mb-6">
              <LayoutIcon size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No Blueprints Found</h3>
            <p className="text-sm text-slate-500 mb-8 max-w-xs text-center">Start by creating your first clinical reasoning template or sync with the cloud.</p>
            <Button
              onClick={handleCreate}
              className="rounded-xl font-bold uppercase tracking-tighter gap-2"
            >
              <Plus className="h-4 w-4" />
              Create First Blueprint
            </Button>
          </Card>
        ) : templates.map((template) => {
          const isActive = activeId === template.id;
          const isEditing = editingId === template.id;

          return (
            <Card
              key={template.id}
              className={`group border border-border/60 shadow-soft flex flex-col transition-all cursor-pointer rounded-3xl overflow-hidden ${isActive ? 'ring-1 ring-primary/40 bg-primary/[0.02]' : 'hover:border-primary/20'}`}
              onClick={() => !editingId && handleSelect(template.id)}
            >
              <CardHeader className={`pb-6 pt-7 px-8 border-b border-border/50 ${isActive ? 'bg-primary/5' : 'bg-slate-50/50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`size-10 rounded-xl flex items-center justify-center shadow-sm border ${isActive ? 'bg-primary text-white border-primary/20' : 'bg-background text-primary border-border/50'}`}>
                      <LayoutIcon size={18} />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-black uppercase tracking-tight">{template.name}</CardTitle>
                      <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Version {template.version}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="default"
                          className="size-8 rounded-lg shadow-lg shadow-primary/20"
                          onClick={(e) => { e.stopPropagation(); handleSave(template.id); }}
                        >
                          <Save size={14} />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="size-8 rounded-lg"
                          onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1.5 grayscale group-hover:grayscale-0 transition-all opacity-40 group-hover:opacity-100">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                          onClick={(e) => { e.stopPropagation(); startEditing(template, 'content'); }}
                        >
                          <Edit2 size={12} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                          onClick={(e) => { e.stopPropagation(); togglePublic(template); }}
                        >
                          {template.is_public ? <Globe size={12} className="text-emerald-500" /> : <Lock size={12} />}
                        </Button>
                        {!['psych-eval', 'tcm_progress_note'].includes(template.id) && (
                          <Button
                            size={confirmDeleteId === template.id ? "default" : "icon"}
                            variant={confirmDeleteId === template.id ? "destructive" : "ghost"}
                            className={`h-8 rounded-lg transition-all duration-200 ${confirmDeleteId === template.id ? 'px-2 animate-pulse' : 'w-8 hover:bg-red-50/80 hover:text-red-600'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(template);
                            }}
                          >
                            {confirmDeleteId === template.id ? (
                              <span className="text-[9px] font-black uppercase">Delete?</span>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-8 flex-1 flex flex-col">
                {isEditing ? (
                  <div className="flex-1 flex flex-col space-y-4">
                    <div className="flex items-center gap-4 pb-2">
                      <Badge
                        variant={editMode === 'content' ? "default" : "outline"}
                        className="text-[9px] font-black uppercase tracking-widest px-2 py-0 border-none cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (editMode === 'definition') {
                            setEditMode('content');
                            setEditBuffer(template.content);
                          }
                        }}
                      >
                        Prompt
                      </Badge>
                      <Badge
                        variant={editMode === 'definition' ? "default" : "outline"}
                        className="text-[9px] font-black uppercase tracking-widest px-2 py-0 border-none cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (editMode === 'content') {
                            setEditMode('definition');
                            setEditBuffer(template.definition || '[]');
                          }
                        }}
                      >
                        Layout
                      </Badge>
                    </div>
                    <Textarea
                      className="w-full bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/20 rounded-2xl p-4 text-[12px] font-mono leading-relaxed min-h-[220px] flex-1 resize-none shadow-inner"
                      value={editBuffer}
                      onChange={(e) => setEditBuffer(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="bg-muted/10 rounded-2xl p-5 border border-border/50 flex-1 relative overflow-hidden group/content">
                    <div className="text-[11px] text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap line-clamp-[10]">
                      {template.content}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/80 to-transparent pointer-events-none"></div>
                  </div>
                )}

                <div className="mt-6 flex items-center justify-between">
                  <Badge variant="secondary" className="bg-primary/5 text-primary text-[9px] font-black uppercase tracking-widest border-none px-2 rounded-lg">{template.category}</Badge>
                  <div className={`flex items-center gap-2 transition-all ${isActive ? 'opacity-100' : 'opacity-20 group-hover:opacity-100'}`}>
                    <div className={`size-1.5 rounded-full ${isActive ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`}></div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      {isActive ? 'Primary Agent' : 'Select'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Templates;
