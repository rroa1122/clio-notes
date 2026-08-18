import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Edit3,
  Save,
  X,
  Layout as LayoutIcon,
  Globe,
  Lock,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  Eye,
  CheckCircle2,
  Copy,
  Search,
  Layers,
  Sparkles,
  Code2,
  FileText,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { ClinicalLoader } from '../../components/ui/ClinicalLoader';
import { storage } from '../lib/storage';
import type { Template } from '../lib/storage';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../../components/ui/dialog';

const PROTECTED_SYSTEM_TEMPLATE_IDS = [
  'psych-eval',
  'tcm_progress_note',
  'tcm_case_assignment_note',
  'tcm_assessment_note',
  'tcm_adult_certification_note',
  'tcm_service_plan_note',
  'tcm_initial_home_visit_note',
  'tcm_collateral_note',
  'tcm_gather_pcp_note',
  'tcm_gather_psy_note',
  'tcm_pc_emergency_contact_note',
  'tcm_service_plan_discussion',
  'tcm_hurricane_addendum_note',
  'tcm_hurricane_update_note',
  'tcm_sts_complete_note',
  'tcm_sts_collect_note',
  'tcm_sts_submit_note',
  'tcm_dpp_obtain_note',
  'tcm_dpp_complete_note',
  'tcm_dpp_submit_pcp_note',
  'tcm_donation_obtain_note',
  'tcm_cleaning_donation_gather_note',
  'tcm_cleaning_donation_obtain_note',
  'tcm_clothing_donation_gather_note',
  'tcm_clothing_donation_obtain_note',
  'tcm_food_donation_gather_note',
  'tcm_food_donation_obtain_note',
  'tcm_vaccination_assistance_note',
  'tcm_provider_appt_coord_note',
  'tcm_uscis_assistance_note',
  'tcm_housing_assistance_note',
  'tcm_snap_recertification_note',
  'tcm_mhv_note',
  'tcm_ltc_phase1_note',
  'tcm_ltc_phase2_note',
  'tcm_ltc_phase3_note',
  'tcm_ltc_phase4_note'
];

const Templates = () => {
  const { user, loading } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string>(storage.getActiveTemplateId());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'content' | 'definition'>('content');
  const [editBuffer, setEditBuffer] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Preview Modal State
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [previewTab, setPreviewTab] = useState<'prompt' | 'definition'>('prompt');
  const [hasCopied, setHasCopied] = useState(false);

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
  }, [user, loading]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      setError(null);
      const fetched = await storage.getTemplates();
      setTemplates(fetched);
      toast.success('Blueprints refreshed from cloud');
    } catch (err: any) {
      toast.error('Failed to refresh blueprints');
    } finally {
      setIsRefreshing(false);
    }
  };

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
    if (confirmDeleteId !== template.id) {
      setConfirmDeleteId(template.id);
      setTimeout(() => setConfirmDeleteId(prev => (prev === template.id ? null : prev)), 3000);
      return;
    }

    try {
      await storage.deleteTemplate(template.id);
      setTemplates(prev => {
        const filtered = prev.filter(t => t.id !== template.id);
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

  // Categories extracted dynamically
  const categories = useMemo(() => {
    const set = new Set<string>();
    templates.forEach(t => {
      if (t.category) set.add(t.category);
    });
    return ['All', ...Array.from(set).sort()];
  }, [templates]);

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchesSearch =
        searchQuery === '' ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'All' ||
        t.category?.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [templates, searchQuery, selectedCategory]);

  const handleCopyContent = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setHasCopied(true);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setHasCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const formatJson = (str?: string) => {
    if (!str) return '[]';
    try {
      return JSON.stringify(JSON.parse(str), null, 2);
    } catch (e) {
      return str;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] w-full px-4">
        <ClinicalLoader
          size="lg"
          message="Synchronizing Blueprints..."
          subtext="Loading clinical reasoning logic and extraction schemas"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="size-16 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500 shadow-sm border border-red-500/20">
          <AlertCircle size={32} />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-foreground">Blueprint Sync Failed</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">{error}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setIsLoading(true);
            setError(null);
            storage
              .getTemplates()
              .then(setTemplates)
              .catch(err => setError(err.message))
              .finally(() => setIsLoading(false));
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
    <div className="flex flex-col space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto w-full pb-16">
      {/* Header & Main Actions */}
      <PageHeader
        title="Analysis Blueprints"
        subtitle="Manage clinical reasoning logic, structured note schemas, and extraction blueprints used by the CLIO AI engine."
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              disabled={isRefreshing}
              onClick={handleRefresh}
              className="rounded-xl border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Refresh Blueprints"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={handleCreate}
              className="rounded-xl font-bold gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              Create Blueprint
            </Button>
          </div>
        }
      />

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-card/60 backdrop-blur border border-border/60 rounded-2xl p-3 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search blueprints by name, category, or prompt..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9.5 pr-8 h-10 rounded-xl bg-background/80 border-border/70 text-sm focus-visible:ring-primary/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((category) => {
            const isSelected = selectedCategory === category;
            const count = category === 'All'
              ? templates.length
              : templates.filter(t => t.category?.toLowerCase() === category.toLowerCase()).length;

            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span>{category}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background/80 text-muted-foreground'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.length === 0 ? (
          <Card className="col-span-full border border-dashed border-border/80 bg-muted/20 rounded-3xl py-16 flex flex-col items-center justify-center text-center px-4">
            <div className="size-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground shadow-sm mb-4">
              {searchQuery || selectedCategory !== 'All' ? <FilterIcon className="size-6 text-muted-foreground" /> : <LayoutIcon size={28} />}
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">
              {searchQuery || selectedCategory !== 'All' ? 'No Blueprints Matched' : 'No Blueprints Found'}
            </h3>
            <p className="text-xs text-muted-foreground mb-6 max-w-sm">
              {searchQuery || selectedCategory !== 'All'
                ? 'Try adjusting your search query or category filter.'
                : 'Start by creating your first clinical reasoning template or sync with the cloud.'}
            </p>
            {searchQuery || selectedCategory !== 'All' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="rounded-xl text-xs font-semibold"
              >
                Clear Filters
              </Button>
            ) : (
              <Button
                onClick={handleCreate}
                size="sm"
                className="rounded-xl font-bold gap-2"
              >
                <Plus className="h-4 w-4" />
                Create First Blueprint
              </Button>
            )}
          </Card>
        ) : (
          filteredTemplates.map((template) => {
            const isActive = activeId === template.id;
            const isEditing = editingId === template.id;
            const isProtected = PROTECTED_SYSTEM_TEMPLATE_IDS.includes(template.id);
            const isConfirmingDelete = confirmDeleteId === template.id;

            return (
              <Card
                key={template.id}
                className={`group relative flex flex-col transition-all duration-300 rounded-2xl overflow-hidden border ${
                  isActive
                    ? 'border-primary/60 bg-gradient-to-b from-primary/[0.04] to-card ring-2 ring-primary/20 shadow-md shadow-primary/5'
                    : 'border-border/70 hover:border-primary/30 hover:shadow-md bg-card/80 backdrop-blur-sm'
                }`}
                onClick={() => {
                  if (!editingId && !isActive) {
                    handleSelect(template.id);
                  }
                }}
              >
                {/* Active Blueprint Top Accent Bar */}
                {isActive && (
                  <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/80 to-primary/40" />
                )}

                {/* Card Header */}
                <CardHeader className="pb-4 pt-5 px-6 border-b border-border/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`size-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border transition-colors ${
                          isActive
                            ? 'bg-primary text-primary-foreground border-primary/30 shadow-primary/20'
                            : 'bg-muted/80 text-foreground border-border/60 group-hover:bg-primary/10 group-hover:text-primary'
                        }`}
                      >
                        <LayoutIcon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-sm font-bold text-foreground truncate tracking-tight">
                            {template.name}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-semibold px-2 py-0 h-4.5 rounded-md bg-muted text-muted-foreground border-border/40"
                          >
                            v{template.version}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground truncate">
                            {template.category || 'General'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Header Controls */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {isEditing ? (
                        <div className="flex gap-1.5">
                          <Button
                            size="icon"
                            variant="default"
                            className="size-7.5 rounded-lg shadow-sm shadow-primary/20"
                            onClick={() => handleSave(template.id)}
                            title="Save Changes"
                          >
                            <Save size={13} />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-7.5 rounded-lg"
                            onClick={() => setEditingId(null)}
                            title="Cancel Edit"
                          >
                            <X size={13} />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          {/* Quick Preview Button */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            onClick={() => {
                              setPreviewTemplate(template);
                              setPreviewTab('prompt');
                            }}
                            title="Preview Blueprint"
                          >
                            <Eye size={13} />
                          </Button>

                          {/* Quick Edit Button */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            onClick={() => startEditing(template, 'content')}
                            title="Edit Blueprint"
                          >
                            <Edit3 size={13} />
                          </Button>

                          {/* Public / Private Toggle */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className={`size-7.5 rounded-lg transition-colors ${
                              template.is_public
                                ? 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}
                            onClick={() => togglePublic(template)}
                            title={template.is_public ? 'Public Blueprint (Click to make Private)' : 'Private Blueprint (Click to make Public)'}
                          >
                            {template.is_public ? <Globe size={13} /> : <Lock size={13} />}
                          </Button>

                          {/* Delete Button (Only for custom/non-system blueprints) */}
                          {!isProtected && (
                            <Button
                              size={isConfirmingDelete ? 'sm' : 'icon'}
                              variant={isConfirmingDelete ? 'destructive' : 'ghost'}
                              className={`h-7.5 rounded-lg transition-all ${
                                isConfirmingDelete
                                  ? 'px-2 text-[10px] font-bold uppercase animate-pulse'
                                  : 'size-7.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                              }`}
                              onClick={() => handleDelete(template)}
                              title={isConfirmingDelete ? 'Click again to permanently delete' : 'Delete Blueprint'}
                            >
                              {isConfirmingDelete ? 'Confirm?' : <Trash2 size={13} />}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Card Content & Editor */}
                <CardContent className="p-5 flex-1 flex flex-col justify-between">
                  {isEditing ? (
                    <div className="flex-1 flex flex-col space-y-3" onClick={(e) => e.stopPropagation()}>
                      {/* Editor Sub-tabs */}
                      <div className="flex items-center justify-between border-b border-border/40 pb-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (editMode === 'definition') {
                                setEditMode('content');
                                setEditBuffer(template.content);
                              }
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors ${
                              editMode === 'content'
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}
                          >
                            <FileText className="w-3 h-3" />
                            Prompt
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (editMode === 'content') {
                                setEditMode('definition');
                                setEditBuffer(template.definition || '[]');
                              }
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors ${
                              editMode === 'definition'
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}
                          >
                            <Code2 className="w-3 h-3" />
                            Layout JSON
                          </button>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {editBuffer.length} chars
                        </span>
                      </div>

                      <Textarea
                        className="w-full bg-background border border-border/70 focus-visible:ring-1 focus-visible:ring-primary/40 rounded-xl p-3 text-xs font-mono leading-relaxed min-h-[190px] flex-1 resize-none shadow-inner"
                        value={editBuffer}
                        onChange={(e) => setEditBuffer(e.target.value)}
                        placeholder={editMode === 'content' ? 'Enter clinical reasoning prompt...' : 'Enter layout JSON definition...'}
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            e.preventDefault();
                            handleSave(template.id);
                          }
                        }}
                      />
                      <p className="text-[10px] text-muted-foreground text-right italic">
                        Tip: Press Ctrl+Enter to save
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 flex-1 flex flex-col justify-between">
                      {/* Code / Content Snippet */}
                      <div
                        className="bg-muted/30 hover:bg-muted/50 transition-colors rounded-xl p-3.5 border border-border/40 flex-1 relative overflow-hidden group/content cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewTemplate(template);
                          setPreviewTab('prompt');
                        }}
                        title="Click to view full preview"
                      >
                        <div className="text-[11px] text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap line-clamp-6">
                          {template.content}
                        </div>
                        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background/90 via-background/40 to-transparent pointer-events-none" />
                      </div>

                      {/* Schema Tag & Meta info */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5">
                          {template.definition && template.definition !== '[]' && (
                            <Badge
                              variant="outline"
                              className="text-[9px] font-mono font-medium px-1.5 py-0 rounded border-border/60 text-muted-foreground"
                            >
                              <Code2 className="w-2.5 h-2.5 mr-1" />
                              JSON Schema
                            </Badge>
                          )}
                          {isProtected && (
                            <Badge
                              variant="outline"
                              className="text-[9px] font-semibold px-1.5 py-0 rounded border-primary/20 text-primary/80 bg-primary/5"
                            >
                              System
                            </Badge>
                          )}
                        </div>

                        {/* Activation Indicator / Button */}
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isActive) handleSelect(template.id);
                          }}
                        >
                          {isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/30 shadow-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                              Active Engine
                            </span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg"
                            >
                              Set as Active
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Modern Preview Modal */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
            <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-muted/20">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                      {previewTemplate.name}
                    </DialogTitle>
                    {activeId === previewTemplate.id && (
                      <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px] font-bold uppercase">
                        Active
                      </Badge>
                    )}
                  </div>
                  <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>Category: {previewTemplate.category || 'General'}</span>
                    <span>•</span>
                    <span>Version: {previewTemplate.version}</span>
                    <span>•</span>
                    <span>{previewTemplate.is_public ? 'Public' : 'Private'}</span>
                  </DialogDescription>
                </div>
              </div>

              {/* Modal Tabs */}
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewTab('prompt')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      previewTab === 'prompt'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Reasoning Prompt
                  </button>
                  <button
                    onClick={() => setPreviewTab('definition')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      previewTab === 'definition'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    Layout Schema (JSON)
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleCopyContent(
                      previewTab === 'prompt'
                        ? previewTemplate.content
                        : formatJson(previewTemplate.definition),
                      previewTab === 'prompt' ? 'Prompt' : 'Layout Schema'
                    )
                  }
                  className="h-8 rounded-lg text-xs font-semibold gap-1.5"
                >
                  {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {hasCopied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </DialogHeader>

            <div className="p-6 flex-1 overflow-y-auto max-h-[50vh]">
              {previewTab === 'prompt' ? (
                <div className="bg-muted/30 border border-border/60 rounded-xl p-4 font-mono text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {previewTemplate.content}
                </div>
              ) : (
                <div className="bg-muted/30 border border-border/60 rounded-xl p-4 font-mono text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {formatJson(previewTemplate.definition)}
                </div>
              )}
            </div>

            <DialogFooter className="p-4 border-t border-border/50 bg-muted/10 flex items-center justify-between sm:justify-between">
              <div className="flex items-center gap-2">
                {activeId !== previewTemplate.id ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleSelect(previewTemplate.id);
                    }}
                    className="rounded-xl text-xs font-bold gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Set as Active Blueprint
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Currently Active Engine
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const t = previewTemplate;
                    setPreviewTemplate(null);
                    startEditing(t, previewTab === 'prompt' ? 'content' : 'definition');
                  }}
                  className="rounded-xl text-xs font-bold gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Blueprint
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setPreviewTemplate(null)}
                  className="rounded-xl text-xs font-bold"
                >
                  Close
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

function FilterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

export default Templates;
