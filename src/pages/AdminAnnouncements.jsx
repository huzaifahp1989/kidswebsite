import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { announcementsApi, getFirebase } from "@/api/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Bell,
  Edit,
  Eye,
  EyeOff,
  Megaphone,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

const defaultForm = {
  title: "",
  text: "",
  imageUrl: "",
  linkUrl: "",
  linkLabel: "Learn more",
  active: true,
  showOnHome: true,
  showAsPopup: false,
  order: 0,
  popupDelaySeconds: 3,
  popupCooldownHours: 24,
};

export default function AdminAnnouncements() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await announcementsApi.list();
      setItems(
        (list || [])
          .filter(Boolean)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      );
    } catch (e) {
      setError(e?.message || "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const { app } = getFirebase();
    setConfigured(Boolean(app));
    load();
  }, []);

  const resetForm = () => {
    setForm({ ...defaultForm, order: items.length });
    setEditing(null);
    setError("");
  };

  const startEdit = (item) => {
    setEditing(item.id);
    setForm({
      title: item.title || "",
      text: item.text || "",
      imageUrl: item.imageUrl || "",
      linkUrl: item.linkUrl || "",
      linkLabel: item.linkLabel || "Learn more",
      active: item.active ?? true,
      showOnHome: item.showOnHome ?? true,
      showAsPopup: item.showAsPopup ?? false,
      order: item.order ?? 0,
      popupDelaySeconds: item.popupDelaySeconds ?? 3,
      popupCooldownHours: item.popupCooldownHours ?? 24,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = {
        title: form.title.trim(),
        text: form.text.trim(),
        imageUrl: form.imageUrl.trim(),
        linkUrl: form.linkUrl.trim(),
        linkLabel: form.linkLabel.trim() || "Learn more",
        active: Boolean(form.active),
        showOnHome: Boolean(form.showOnHome),
        showAsPopup: Boolean(form.showAsPopup),
        order: Number(form.order) || 0,
        popupDelaySeconds: Number(form.popupDelaySeconds) || 3,
        popupCooldownHours: Number(form.popupCooldownHours) || 24,
        updatedAt: new Date().toISOString(),
      };

      if (!payload.title && !payload.text) {
        throw new Error("Add a title or message text.");
      }

      if (editing) {
        await announcementsApi.update(editing, payload);
      } else {
        await announcementsApi.add({ ...payload, createdAt: new Date().toISOString() });
      }

      resetForm();
      await load();
    } catch (err) {
      setError(err?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    setLoading(true);
    try {
      await announcementsApi.remove(id);
      if (editing === id) resetForm();
      await load();
    } catch (err) {
      setError(err?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleField = async (id, field) => {
    const item = items.find((it) => it.id === id);
    if (!item) return;
    await announcementsApi.update(id, { [field]: !(item[field] ?? false) });
    await load();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            to={createPageUrl("AdminDashboard")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          {!configured && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              Saved locally in this browser
            </span>
          )}
        </div>

        <Card className="mb-6 border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Megaphone className="h-6 w-6" />
              Announcements
            </CardTitle>
            <p className="text-sm text-blue-100">
              Create image + text announcements for the home page banner and optional popup.
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Announcement title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="text">Message</Label>
                <Textarea
                  id="text"
                  value={form.text}
                  onChange={(e) => setForm({ ...form, text: e.target.value })}
                  placeholder="Write your announcement message..."
                  rows={4}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="linkUrl">Link URL (optional)</Label>
                  <Input
                    id="linkUrl"
                    value={form.linkUrl}
                    onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkLabel">Link button text</Label>
                  <Input
                    id="linkLabel"
                    value={form.linkLabel}
                    onChange={(e) => setForm({ ...form, linkLabel: e.target.value })}
                    placeholder="Learn more"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="order">Display order</Label>
                  <Input
                    id="order"
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="popupDelaySeconds">Popup delay (seconds)</Label>
                  <Input
                    id="popupDelaySeconds"
                    type="number"
                    min={0}
                    value={form.popupDelaySeconds}
                    onChange={(e) => setForm({ ...form, popupDelaySeconds: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="popupCooldownHours">Popup cooldown (hours)</Label>
                  <Input
                    id="popupCooldownHours"
                    type="number"
                    min={1}
                    value={form.popupCooldownHours}
                    onChange={(e) => setForm({ ...form, popupCooldownHours: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-6 rounded-xl border bg-white p-4">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Switch checked={form.showOnHome} onCheckedChange={(v) => setForm({ ...form, showOnHome: v })} />
                  Show on home page
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Switch checked={form.showAsPopup} onCheckedChange={(v) => setForm({ ...form, showAsPopup: v })} />
                  Show as popup
                </label>
              </div>

              {form.imageUrl && (
                <div className="overflow-hidden rounded-xl border bg-white p-3">
                  <img
                    src={form.imageUrl}
                    alt="Preview"
                    className="mx-auto max-h-48 rounded-lg object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              )}

              {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  {editing ? "Update announcement" : "Add announcement"}
                </Button>
                {editing && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel edit
                  </Button>
                )}
                {!editing && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    <Plus className="mr-2 h-4 w-4" />
                    Clear form
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600" />
              Current announcements ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && items.length === 0 ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-gray-500">No announcements yet. Create one above.</p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm md:flex-row md:items-start"
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title || "Announcement"}
                      className="h-24 w-full rounded-lg object-cover md:w-32"
                    />
                  ) : (
                    <div className="flex h-24 w-full items-center justify-center rounded-lg bg-blue-50 text-blue-400 md:w-32">
                      <Megaphone className="h-8 w-8" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-gray-900">{item.title || "Untitled"}</h3>
                      {!item.active && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                          Inactive
                        </span>
                      )}
                      {item.showOnHome && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          Home
                        </span>
                      )}
                      {item.showAsPopup && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
                          Popup
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-3 text-sm text-gray-600">{item.text}</p>
                    {item.linkUrl && (
                      <p className="mt-1 truncate text-xs text-blue-600">{item.linkUrl}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => startEdit(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => toggleField(item.id, "active")}
                    >
                      {item.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button type="button" size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
