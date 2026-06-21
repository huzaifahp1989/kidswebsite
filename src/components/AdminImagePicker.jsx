import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { searchMediaAssets, uploadMediaFile } from "@/api/mediaLibrary";
import { Image as ImageIcon, Search, Upload, Check, Plus } from "lucide-react";

export default function AdminImagePicker({
  value,
  onChange,
  onAdd,
  multi = false,
  folder = "announcements",
  label = "Image",
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [draftUrl, setDraftUrl] = useState("");

  const emitUrl = (url) => {
    if (!url) return;
    if (multi) {
      onAdd?.(url);
      return;
    }
    onChange?.(url);
  };

  const addDraftUrl = () => {
    const url = draftUrl.trim();
    if (!url) return;
    emitUrl(url);
    setDraftUrl("");
  };

  const load = async (searchQuery = query) => {
    setLoading(true);
    setError("");
    try {
      const list = await searchMediaAssets({ query: searchQuery, folder: "" });
      setItems(list);
    } catch (err) {
      setError(err?.message || "Could not load images");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load("");
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    load(query);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const asset = await uploadMediaFile(file, { folder, name: file.name });
      emitUrl(asset.url);
      await load(query);
    } catch (err) {
      setError(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-3 rounded-xl border bg-gray-50 p-4">
      <Label>{label}</Label>

      <Input
        value={multi ? draftUrl : value}
        onChange={(e) => {
          if (multi) {
            setDraftUrl(e.target.value);
            return;
          }
          onChange(e.target.value);
        }}
        onKeyDown={(e) => {
          if (multi && e.key === "Enter") {
            e.preventDefault();
            addDraftUrl();
          }
        }}
        placeholder="https://... or pick from library below"
      />

      {multi && (
        <Button type="button" variant="outline" size="sm" onClick={addDraftUrl} disabled={!draftUrl.trim()}>
          <Plus className="mr-2 h-4 w-4" />
          Add image URL
        </Button>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search uploaded images..."
          />
          <Button type="submit" variant="outline" disabled={loading}>
            <Search className="h-4 w-4" />
          </Button>
        </form>
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium hover:bg-gray-100">
          <Upload className="h-4 w-4" />
          {uploading ? "Uploading..." : "Browse & upload"}
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {!multi && value && (
        <div className="overflow-hidden rounded-lg border bg-white p-2">
          <img src={value} alt="Selected" className="mx-auto max-h-40 object-contain" />
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Image library {loading ? "(loading...)" : `(${items.length})`}
        </p>
        {items.length === 0 && !loading ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed bg-white p-4 text-sm text-gray-500">
            <ImageIcon className="h-5 w-5" />
            No images yet. Upload one to start your library.
          </div>
        ) : (
          <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
            {items.map((item) => {
              const selected = !multi && value === item.url;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => emitUrl(item.url)}
                  className={`relative overflow-hidden rounded-lg border bg-white text-left transition hover:ring-2 hover:ring-blue-400 ${
                    selected ? "ring-2 ring-blue-600" : ""
                  }`}
                >
                  <img src={item.url} alt={item.name} className="h-24 w-full object-cover" loading="lazy" />
                  <div className="truncate px-2 py-1 text-[11px] text-gray-600">{item.name}</div>
                  {selected && (
                    <span className="absolute right-1 top-1 rounded-full bg-blue-600 p-1 text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

AdminImagePicker.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  onAdd: PropTypes.func,
  multi: PropTypes.bool,
  folder: PropTypes.string,
  label: PropTypes.string,
};
