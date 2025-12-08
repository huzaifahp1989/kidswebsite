import React, { useState, useRef } from "react";
import { supabase } from '@/api/supabaseClient'
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { 
  Upload, 
  Music, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Plus,
  Headphones,
  Image as ImageIcon,
  Loader2,
  Play,
  Pause
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminAudioContent() {
  // Removed email-only banner; rely on AdminGuard
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAudio, setEditingAudio] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ audio: false, image: false });
  
  const audioFileRef = useRef(null);
  const imageFileRef = useRef(null);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    mp3_url: "",
    youtube_id: "",
    cover_image: "",
    description: "",
    transcript: "",
    moral_lesson: "",
    duration: "",
    age_group: "all",
    category: "story",
    subcategory: "",
    language: "English",
    tags: [],
    license_source: "",
    allow_download: false,
    featured: false
  });

  const { data: audioContent = [], isLoading } = useQuery({
    queryKey: ['audio-content-storage'],
    queryFn: async () => {
      let files = []
      let rows = []
      try {
        const storage = await supabase.storage.from('audio').list('', { limit: 500 })
        files = Array.isArray(storage?.data) ? storage.data : []
      } catch {}
      try {
        const meta = await supabase.from('audio_content').select('*')
        rows = Array.isArray(meta?.data) ? meta.data : []
      } catch {}
      try {
        const raw = localStorage.getItem('audio_content_local')
        const localRows = raw ? JSON.parse(raw) : []
        if (Array.isArray(localRows) && localRows.length) rows = [...rows, ...localRows]
      } catch {}
      const metaMap = new Map(rows.map(m => [m.slug || m.title, m]))
      return files.map(f => {
        const pub = supabase.storage.from('audio').getPublicUrl(f.name)?.data?.publicUrl || ''
        const base = f.name.replace(/\.[^/.]+$/, '')
        const m = metaMap.get(base) || {}
        return {
          id: m.id || `storage_${f.id || f.name}`,
          title: m.title || base,
          slug: base,
          mp3_url: m.mp3_url || pub,
          cover_image: m.cover_image || '',
          description: m.description || '',
          category: m.category || 'nasheed',
          age_group: m.age_group || 'all',
          status: 'active',
          plays_count: m.plays_count || 0,
          language: m.language || 'English',
          duration: m.duration || '',
          featured: !!m.featured,
          subcategory: m.subcategory || '',
        }
      })
    },
    initialData: [],
  });
  
  const createAudioMutation = useMutation({
    mutationFn: async (data) => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        const uid = userData?.user?.id
        if (!uid) throw new Error('Admin login required')
        const row = { ...data, owner_id: uid }
        const { error } = await supabase.from('audio_content').insert(row)
        if (error) throw error
        return true
      } catch (err) {
        try {
          const raw = localStorage.getItem('audio_content_local')
          const arr = raw ? JSON.parse(raw) : []
          const id = `local_${Date.now()}`
          arr.push({ ...data, id })
          localStorage.setItem('audio_content_local', JSON.stringify(arr))
          return true
        } catch {}
        throw err
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audio-content-storage'] });
      setShowCreateDialog(false);
      resetForm();
      alert('Audio content created successfully!');
    },
    onError: (e) => {
      alert(e?.message || 'Failed to create audio content.')
    }
  });
  
  const updateAudioMutation = useMutation({
    mutationFn: async ({ slug, data }) => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        const uid = userData?.user?.id
        if (!uid) throw new Error('Admin login required')
        const patch = { ...data, owner_id: uid, updated_at: new Date().toISOString() }
        const { error } = await supabase.from('audio_content').update(patch).eq('slug', slug)
        if (error) throw error
        return true
      } catch (err) {
        try {
          const raw = localStorage.getItem('audio_content_local')
          const arr = raw ? JSON.parse(raw) : []
          const next = arr.map(it => (it.slug === slug ? { ...it, ...data } : it))
          localStorage.setItem('audio_content_local', JSON.stringify(next))
          return true
        } catch {}
        throw err
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audio-content-storage'] });
      setShowEditDialog(false);
      setEditingAudio(null);
      resetForm();
      alert('Audio content updated successfully!');
    },
    onError: (e) => {
      alert(e?.message || 'Failed to update audio content.')
    }
  });
  
  const deleteAudioMutation = useMutation({
    mutationFn: async (slug) => {
      try {
        const { data: userData } = await supabase.auth.getUser()
        const uid = userData?.user?.id
        if (!uid) throw new Error('Admin login required')
        const { error } = await supabase.from('audio_content').delete().eq('slug', slug)
        if (error) throw error
        return true
      } catch (err) {
        try {
          const raw = localStorage.getItem('audio_content_local')
          const arr = raw ? JSON.parse(raw) : []
          const next = arr.filter(it => it.slug !== slug)
          localStorage.setItem('audio_content_local', JSON.stringify(next))
          return true
        } catch {}
        throw err
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audio-content-storage'] });
      alert('Audio content deleted successfully!');
    },
    onError: (e) => {
      alert(e?.message || 'Failed to delete audio content.')
    }
  });
  
  const handleAudioUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      alert('Please select an audio file');
      return;
    }
    setUploadProgress(prev => ({ ...prev, audio: true }));
    try {
      const base = (formData.slug || formData.title || file.name).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'mp3';
      const path = `${base}.${ext}`;
      const { error: upErr } = await supabase.storage.from('audio').upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) {
        const url = URL.createObjectURL(file);
        setFormData({ ...formData, mp3_url: url });
        alert('Local preview set. Configure Supabase to persist uploads.');
        return;
      }
      const pub = supabase.storage.from('audio').getPublicUrl(path)?.data?.publicUrl || '';
      setFormData({ ...formData, mp3_url: pub, slug: base });
      alert('Audio uploaded');
    } catch {
      const url = URL.createObjectURL(file);
      setFormData({ ...formData, mp3_url: url });
      alert('Local preview set. Configure Supabase to persist uploads.');
    } finally {
      setUploadProgress(prev => ({ ...prev, audio: false }));
    }
  };
  
  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    setUploadProgress(prev => ({ ...prev, image: true }));
    try {
      const base = (formData.slug || formData.title || file.name).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
      const path = `${base}-cover.${ext}`;
      const { error: upErr } = await supabase.storage.from('audio').upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) {
        const url = URL.createObjectURL(file);
        setFormData({ ...formData, cover_image: url });
        alert('Local preview set. Configure Supabase to persist uploads.');
        return;
      }
      const pub = supabase.storage.from('audio').getPublicUrl(path)?.data?.publicUrl || '';
      setFormData({ ...formData, cover_image: pub, slug: base });
      alert('Image uploaded');
    } catch {
      const url = URL.createObjectURL(file);
      setFormData({ ...formData, cover_image: url });
      alert('Local preview set. Configure Supabase to persist uploads.');
    } finally {
      setUploadProgress(prev => ({ ...prev, image: false }));
    }
  };

  const handleCreate = () => {
    if (!formData.title || !formData.category) {
      alert('Please fill in at least the title and category');
      return;
    }

    // Generate slug from title if not provided
    if (!formData.slug) {
      formData.slug = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    // Convert tags string to array
    if (typeof formData.tags === 'string') {
      formData.tags = formData.tags.split(',').map(t => t.trim()).filter(t => t);
    }

    createAudioMutation.mutate(formData);
  };

  const handleEdit = (audio) => {
    setEditingAudio(audio);
    setFormData({
      title: audio.title || "",
      slug: audio.slug || "",
      mp3_url: audio.mp3_url || "",
      youtube_id: audio.youtube_id || "",
      cover_image: audio.cover_image || "",
      description: audio.description || "",
      transcript: audio.transcript || "",
      moral_lesson: audio.moral_lesson || "",
      duration: audio.duration || "",
      age_group: audio.age_group || "all",
      category: audio.category || "story",
      subcategory: audio.subcategory || "",
      language: audio.language || "English",
      tags: audio.tags || [],
      license_source: audio.license_source || "",
      allow_download: audio.allow_download || false,
      featured: audio.featured || false
    });
    setShowEditDialog(true);
  };

  const handleUpdate = () => {
    if (!editingAudio) return;

    // Convert tags string to array if needed
    if (typeof formData.tags === 'string') {
      formData.tags = formData.tags.split(',').map(t => t.trim()).filter(t => t);
    }

    updateAudioMutation.mutate({
      slug: editingAudio.slug,
      data: formData
    });
  };

  const handleDelete = (audio) => {
    if (confirm(`Are you sure you want to delete "${audio.title}"? This action cannot be undone.`)) {
      deleteAudioMutation.mutate(audio.slug);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      mp3_url: "",
      youtube_id: "",
      cover_image: "",
      description: "",
      transcript: "",
      moral_lesson: "",
      duration: "",
      age_group: "all",
      category: "story",
      subcategory: "",
      language: "English",
      tags: [],
      license_source: "",
      allow_download: false,
      featured: false
    });
    setEditingAudio(null);
  };

  const categoryColors = {
    story: "bg-blue-100 text-blue-800",
    hadith: "bg-green-100 text-green-800",
    history: "bg-purple-100 text-purple-800",
    nasheed: "bg-pink-100 text-pink-800",
    tajweed: "bg-amber-100 text-amber-800",
    fiqh: "bg-indigo-100 text-indigo-800",
    quran: "bg-emerald-100 text-emerald-800"
  };

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto">
        <input type="file" accept="audio/*" ref={audioFileRef} onChange={handleAudioUpload} className="hidden" />
        <input type="file" accept="image/*" ref={imageFileRef} onChange={handleImageUpload} className="hidden" />
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="text-6xl mb-4">🎵</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Audio Content Management
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Upload and manage Islamic audio stories, lessons, and nasheeds
          </p>
          <Button
            onClick={() => setShowCreateDialog(true)}
            size="lg"
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Audio
          </Button>
          <div className="mt-4 flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const { data: files, error } = await supabase.storage.from('audio').list('', { limit: 500 })
                  if (error) { alert('Storage list failed'); return }
                  const rows = (files || []).map(f => {
                    const pub = supabase.storage.from('audio').getPublicUrl(f.name)?.data?.publicUrl || ''
                    const base = f.name.replace(/\.[^/.]+$/, '')
                    return { title: base, slug: base, mp3_url: pub, category: 'nasheed', age_group: 'all', language: 'English' }
                  })
                  if (rows.length === 0) { alert('No files found'); return }
                  const { error: upErr } = await supabase.from('audio_content').upsert(rows, { onConflict: 'slug' })
                  if (upErr) { alert('Upsert failed'); return }
                  alert('Synced storage files into audio_content')
                  queryClient.invalidateQueries({ queryKey: ['audio-content-storage'] })
                } catch {
                  alert('Import failed');
                }
              }}
            >
              Sync From Supabase Storage
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-purple-600">{audioContent.length}</div>
              <div className="text-sm text-gray-600">Total Audio</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-600">
                {audioContent.filter(a => a.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-amber-600">
                {audioContent.filter(a => a.featured).length}
              </div>
              <div className="text-sm text-gray-600">Featured</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600">
                {audioContent.reduce((sum, a) => sum + (a.plays_count || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Total Plays</div>
            </CardContent>
          </Card>
        </div>

        {/* Audio Content List */}
        {isLoading ? (
          <div className="text-center py-12">
            <Music className="w-16 h-16 mx-auto mb-4 text-gray-300 animate-pulse" />
            <p className="text-gray-500">Loading audio content...</p>
          </div>
        ) : audioContent.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Headphones className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-4">No audio content yet</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Audio
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {audioContent.map((audio, index) => (
              <motion.div
                key={audio.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Cover Image */}
                      <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 bg-gradient-to-br from-purple-200 to-pink-200 rounded-lg flex-shrink-0 overflow-hidden">
                        {audio.cover_image ? (
                          <img
                            src={audio.cover_image}
                            alt={audio.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Audio Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-bold text-lg text-gray-900 truncate pr-4">
                            {audio.title}
                          </h3>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              onClick={() => handleEdit(audio)}
                              size="sm"
                              variant="outline"
                              className="text-blue-600"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleDelete(audio)}
                              size="sm"
                              variant="outline"
                              className="text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {audio.description && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {audio.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge className={categoryColors[audio.category]}>
                            {audio.category}
                          </Badge>
                          {audio.subcategory && (
                            <Badge variant="outline">{audio.subcategory}</Badge>
                          )}
                          {audio.duration && (
                            <Badge variant="outline">{audio.duration}</Badge>
                          )}
                          {audio.age_group && (
                            <Badge variant="outline">Ages: {audio.age_group}</Badge>
                          )}
                          {audio.featured && (
                            <Badge className="bg-amber-500">⭐ Featured</Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {audio.mp3_url && (
                            <span className="flex items-center gap-1">
                              <Headphones className="w-3 h-3" />
                              Audio uploaded
                            </span>
                          )}
                          {audio.plays_count > 0 && (
                            <span>{audio.plays_count} plays</span>
                          )}
                          <span>{audio.language || 'English'}</span>
                        </div>
                        {audio.mp3_url && (
                          <div className="mt-3">
                            <audio src={audio.mp3_url} controls preload="none" className="w-full" />
                          </div>
                        )}
                        {audio.mp3_url && (
                          <div className="mt-3">
                            <audio src={audio.mp3_url} controls preload="none" className="w-full" />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Add New Audio Content</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Story of Prophet Ibrahim"
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="story">Story</SelectItem>
                      <SelectItem value="hadith">Hadith</SelectItem>
                      <SelectItem value="history">History</SelectItem>
                      <SelectItem value="nasheed">Nasheed</SelectItem>
                      <SelectItem value="tajweed">Tajweed</SelectItem>
                      <SelectItem value="fiqh">Fiqh</SelectItem>
                      <SelectItem value="quran">Quran</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="age_group">Age Group</Label>
                  <Select
                    value={formData.age_group}
                    onValueChange={(value) => setFormData({ ...formData, age_group: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3-6">3-6 years</SelectItem>
                      <SelectItem value="7-10">7-10 years</SelectItem>
                      <SelectItem value="11+">11+ years</SelectItem>
                      <SelectItem value="all">All ages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="mp3_url">Audio URL (MP3)</Label>
                <Input
                  id="mp3_url"
                  value={formData.mp3_url}
                  onChange={(e) => setFormData({ ...formData, mp3_url: e.target.value })}
                  placeholder="https://cdn.example.com/audio/file.mp3"
                />
                <div className="mt-2 flex gap-2">
                  <Button onClick={() => audioFileRef.current && audioFileRef.current.click()} disabled={uploadProgress.audio}>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadProgress.audio ? 'Uploading...' : 'Upload Audio'}
                  </Button>
                  {formData.mp3_url && (
                    <Button variant="outline" asChild>
                      <a href={formData.mp3_url} target="_blank" rel="noreferrer">Preview</a>
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="cover_image">Cover Image URL</Label>
                <Input
                  id="cover_image"
                  value={formData.cover_image}
                  onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                  placeholder="https://cdn.example.com/images/cover.jpg"
                />
                <div className="mt-2 flex gap-2">
                  <Button onClick={() => imageFileRef.current && imageFileRef.current.click()} disabled={uploadProgress.image}>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadProgress.image ? 'Uploading...' : 'Upload Image'}
                  </Button>
                </div>
                {formData.cover_image && (
                  <div className="mt-2">
                    <img
                      src={formData.cover_image}
                      alt="Cover preview"
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Additional Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subcategory">Subcategory</Label>
                  <Input
                    id="subcategory"
                    value={formData.subcategory}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    placeholder="e.g., Prophets, Sahabah"
                  />
                </div>

                <div>
                  <Label htmlFor="duration">Duration</Label>
                  <Input
                    id="duration"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="e.g., 05:30"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the audio content"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="moral_lesson">Moral Lesson</Label>
                <Textarea
                  id="moral_lesson"
                  value={formData.moral_lesson}
                  onChange={(e) => setFormData({ ...formData, moral_lesson: e.target.value })}
                  placeholder="Key lesson or takeaway"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={Array.isArray(formData.tags) ? formData.tags.join(', ') : formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g., prophets, kindness, patience"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Featured</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allow_download}
                    onChange={(e) => setFormData({ ...formData, allow_download: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Allow Download</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleCreate}
                  disabled={createAudioMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Create Audio
                </Button>
                <Button
                  onClick={() => {
                    setShowCreateDialog(false);
                    resetForm();
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog - Similar structure to Create Dialog */}
        <Dialog open={showEditDialog} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Edit Audio Content</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Same form fields as Create Dialog */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="edit-title">Title *</Label>
                  <Input
                    id="edit-title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Story of Prophet Ibrahim"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="story">Story</SelectItem>
                      <SelectItem value="hadith">Hadith</SelectItem>
                      <SelectItem value="history">History</SelectItem>
                      <SelectItem value="nasheed">Nasheed</SelectItem>
                      <SelectItem value="tajweed">Tajweed</SelectItem>
                      <SelectItem value="fiqh">Fiqh</SelectItem>
                      <SelectItem value="quran">Quran</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit-age">Age Group</Label>
                  <Select
                    value={formData.age_group}
                    onValueChange={(value) => setFormData({ ...formData, age_group: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3-6">3-6 years</SelectItem>
                      <SelectItem value="7-10">7-10 years</SelectItem>
                      <SelectItem value="11+">11+ years</SelectItem>
                      <SelectItem value="all">All ages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-mp3_url">Audio URL (MP3)</Label>
                <Input
                  id="edit-mp3_url"
                  value={formData.mp3_url}
                  onChange={(e) => setFormData({ ...formData, mp3_url: e.target.value })}
                  placeholder="https://cdn.example.com/audio/file.mp3"
                />
              </div>

              <div>
                <Label htmlFor="edit-cover_image">Cover Image URL</Label>
                <Input
                  id="edit-cover_image"
                  value={formData.cover_image}
                  onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                  placeholder="https://cdn.example.com/images/cover.jpg"
                />
                {formData.cover_image && (
                  <div className="mt-2">
                    <img
                      src={formData.cover_image}
                      alt="Cover preview"
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-subcategory">Subcategory</Label>
                  <Input
                    id="edit-subcategory"
                    value={formData.subcategory}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    placeholder="e.g., Prophets, Sahabah"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-duration">Duration</Label>
                  <Input
                    id="edit-duration"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="e.g., 05:30"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the audio content"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="edit-moral">Moral Lesson</Label>
                <Textarea
                  id="edit-moral"
                  value={formData.moral_lesson}
                  onChange={(e) => setFormData({ ...formData, moral_lesson: e.target.value })}
                  placeholder="Key lesson or takeaway"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
                <Input
                  id="edit-tags"
                  value={Array.isArray(formData.tags) ? formData.tags.join(', ') : formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g., prophets, kindness, patience"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Featured</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allow_download}
                    onChange={(e) => setFormData({ ...formData, allow_download: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Allow Download</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleUpdate}
                  disabled={updateAudioMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Update Audio
                </Button>
                <Button
                  onClick={() => {
                    setShowEditDialog(false);
                    resetForm();
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
