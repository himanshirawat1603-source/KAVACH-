import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  ArrowLeft,
  ArrowRight,
  Info,
  AlertCircle,
  HardDrive,
} from 'lucide-react';
import {
  EvidenceItem,
  EvidenceRecordKind,
  EvidenceStorageIndicator,
  EvidenceUploadStatus,
  IncidentRecord,
} from '../types/incident';
import { formatBytes } from '../utils/pdfGenerator';

interface EvidenceOrganizerProps {
  incident: IncidentRecord;
  onUpdateEvidence: (evidence: EvidenceItem[]) => void;
  onBack: () => void;
  onNext: () => void;
}

const SUPPORTED_EXTENSIONS =
  '.png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.csv,.json,.eml,.mp4,.mp3,.wav';

const RECORD_KINDS: EvidenceRecordKind[] = [
  'Screenshot / Image',
  'Message / Chat Export',
  'URL / Webpage Link',
  'Document / PDF',
  'Transaction / Ticket Reference',
  'Other Record',
];

function inferRecordKind(fileName: string, mime: string): EvidenceRecordKind {
  if (mime.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(fileName)) {
    return 'Screenshot / Image';
  }
  if (/\.(eml|json|csv|txt)$/i.test(fileName)) {
    return 'Message / Chat Export';
  }
  if (mime === 'application/pdf' || /\.pdf$/i.test(fileName)) {
    return 'Document / PDF';
  }
  return 'Other Record';
}

export const EvidenceOrganizer: React.FC<EvidenceOrganizerProps> = ({
  incident,
  onUpdateEvidence,
  onBack,
  onNext,
}) => {
  const [mode, setMode] = useState<'upload' | 'manual'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadNote, setUploadNote] = useState('');
  const [uploadSourceUrl, setUploadSourceUrl] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Manual / URL / Message inventory form state
  const [manualTitle, setManualTitle] = useState('');
  const [manualKind, setManualKind] = useState<EvidenceRecordKind>('URL / Webpage Link');
  const [manualCapturedAt, setManualCapturedAt] = useState(
    `${incident.date || ''} ${incident.time || ''}`.trim()
  );
  const [manualSourceUrl, setManualSourceUrl] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editSourceUrl, setEditSourceUrl] = useState('');
  const [editCapturedAt, setEditCapturedAt] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);

    const newItems: EvidenceItem[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const mimeOrExt =
        file.type ||
        (file.name.includes('.')
          ? `file/${file.name.split('.').pop()?.toLowerCase()}`
          : 'application/octet-stream');

      let status: EvidenceUploadStatus = 'Recorded Locally in Browser';
      let storageIndicator: EvidenceStorageIndicator =
        'Filename & Size Recorded Only (File Stays on Device)';
      let textExcerpt: string | undefined;
      let previewDataUrl: string | undefined;

      if (file.size > 250 * 1024) {
        status = 'Metadata Only (Large File)';
        storageIndicator = 'Filename & Size Recorded Only (File Stays on Device)';
      } else if (
        file.type.startsWith('text/') ||
        /\.(txt|csv|json|eml)$/i.test(file.name)
      ) {
        try {
          const text = await file.text();
          textExcerpt = text.slice(0, 280);
          storageIndicator = 'Preview / Excerpt Stored Locally in Browser';
        } catch {
          storageIndicator = 'Filename & Size Recorded Only (File Stays on Device)';
        }
      } else if (file.type.startsWith('image/') && file.size <= 180 * 1024) {
        try {
          previewDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error('Read error'));
            reader.readAsDataURL(file);
          });
          storageIndicator = 'Preview / Excerpt Stored Locally in Browser';
        } catch {
          previewDataUrl = undefined;
          storageIndicator = 'Filename & Size Recorded Only (File Stays on Device)';
        }
      }

      const lastModDate = file.lastModified
        ? new Date(file.lastModified).toISOString().slice(0, 16).replace('T', ' ')
        : `${incident.date || ''} ${incident.time || ''}`.trim();

      newItems.push({
        id: `ev-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        fileName: file.name,
        fileType: mimeOrExt,
        recordKind: inferRecordKind(file.name, mimeOrExt),
        fileSizeBytes: file.size,
        uploadStatus: status,
        storageIndicator,
        entryMethod: 'file-upload',
        capturedAt: lastModDate,
        sourceUrl: uploadSourceUrl.trim(),
        description:
          uploadNote.trim() ||
          `User-selected file (${file.name}). Edit to add specific context describing what this record shows.`,
        textExcerpt,
        previewDataUrl,
        createdAt: new Date().toISOString(),
      });
    }

    onUpdateEvidence([...incident.evidence, ...newItems]);
    setUploadNote('');
    setUploadSourceUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddManualEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) {
      setManualError('Please provide a reference label, filename, or URL title.');
      return;
    }
    if (!manualDesc.trim()) {
      setManualError('Please describe what this evidence item or URL shows.');
      return;
    }
    setManualError(null);

    const item: EvidenceItem = {
      id: `ev-manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fileName: manualTitle.trim(),
      fileType: manualKind,
      recordKind: manualKind,
      uploadStatus: 'Manual Entry',
      storageIndicator: 'Manual Description / URL Recorded Only',
      entryMethod: 'manual-entry',
      capturedAt: manualCapturedAt.trim() || 'Unspecified',
      sourceUrl: manualSourceUrl.trim(),
      description: manualDesc.trim(),
      createdAt: new Date().toISOString(),
    };

    onUpdateEvidence([...incident.evidence, item]);
    setManualTitle('');
    setManualSourceUrl('');
    setManualDesc('');
  };

  const startEdit = (item: EvidenceItem) => {
    setEditingId(item.id);
    setEditDesc(item.description);
    setEditSourceUrl(item.sourceUrl);
    setEditCapturedAt(item.capturedAt);
  };

  const saveEdit = (id: string) => {
    const updated = incident.evidence.map((ev) =>
      ev.id === id
        ? {
            ...ev,
            description: editDesc.trim() || ev.description,
            sourceUrl: editSourceUrl.trim(),
            capturedAt: editCapturedAt.trim(),
          }
        : ev
    );
    onUpdateEvidence(updated);
    setEditingId(null);
  };

  const removeEvidence = (id: string) => {
    onUpdateEvidence(incident.evidence.filter((ev) => ev.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-[#2563EB] tabular-nums">
            Evidence Organizer · Case {incident.caseCode}
          </p>
          <h1 className="font-display text-2xl font-bold text-[#0B1220] tracking-tight mt-0.5">
            Evidence Inventory &amp; Attachments
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Catalog screenshots, messages, URLs, documents, and ticket IDs. Clearly shows whether a
            local preview or only filename/description is stored.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mode === 'upload'
                ? 'bg-white text-[#0B1220] shadow-xs'
                : 'text-slate-600 hover:text-[#0B1220]'
            }`}
          >
            Attach File Metadata
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mode === 'manual'
                ? 'bg-white text-[#0B1220] shadow-xs'
                : 'text-slate-600 hover:text-[#0B1220]'
            }`}
          >
            Log URL / Message / Manual Entry
          </button>
        </div>
      </div>

      {/* Explicit File Storage & Non-Verification Notice */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 leading-relaxed space-y-1">
          <p>
            <strong className="font-semibold text-[#0B1220]">
              How Evidence Storage Works in KAVACH:
            </strong>{' '}
            No cloud file bucket is connected in this environment. Small images (&le;180 KB) and
            short text files store a local preview/excerpt in your browser’s{' '}
            <code className="font-mono">localStorage</code>; larger files record{' '}
            <strong>only the filename, MIME type, byte size, and your description</strong> while the
            original file stays untouched on your device.
          </p>
          <p className="text-slate-600">
            Neither KAVACH nor AI verifies digital evidence authenticity, EXIF integrity, or legal
            validity. Preserve original unedited files on your device for official portal upload.
          </p>
        </div>
      </div>

      {/* Entry Area */}
      {mode === 'upload' ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="ev-upload-note"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Description for Next Attachment (Optional)
              </label>
              <input
                id="ev-upload-note"
                type="text"
                value={uploadNote}
                onChange={(e) => setUploadNote(e.target.value)}
                placeholder="e.g., Full-window capture showing sender handle and timestamp"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-[#0B1220] placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label
                htmlFor="ev-upload-url"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Associated URL or Handle (Optional)
              </label>
              <input
                id="ev-upload-url"
                type="text"
                value={uploadSourceUrl}
                onChange={(e) => setUploadSourceUrl(e.target.value)}
                placeholder="e.g., https://instagram.com/... or @username"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-[#0B1220] placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              processFiles(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              isDragging
                ? 'border-[#2563EB] bg-blue-50/50'
                : 'border-slate-300 bg-[#F8FAFC] hover:border-slate-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={SUPPORTED_EXTENSIONS}
              onChange={(e) => processFiles(e.target.files)}
              className="hidden"
              id="kavach-file-input"
            />
            <Upload className="w-8 h-8 text-[#2563EB] mx-auto mb-3" />
            <p className="font-display text-sm font-semibold text-[#0B1220]">
              Select screenshots, chat exports, or documents from your device
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Supported: PNG, JPG, WEBP, PDF, TXT, CSV, JSON, EML, MP4, MP3. Files are never
              transmitted externally.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
              >
                Select Supported Files
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                Log URL, Message Snippet, or Ticket ID Instead
              </button>
            </div>
          </div>

          {uploadError && (
            <div className="flex items-center gap-2 text-xs text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      ) : (
        <form
          onSubmit={handleAddManualEntry}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="pb-3 border-b border-slate-100">
            <h2 className="font-display text-base font-semibold text-[#0B1220]">
              Log URL, Message Record, or Manual Evidence Description
            </h2>
            <p className="text-xs text-slate-500">
              Record suspicious webpage links, vanished messages, transaction UTR numbers, or
              in-app complaint references.
            </p>
          </div>

          {manualError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{manualError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="manual-title"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Item Title / Identifier <span className="text-red-600">*</span>
              </label>
              <input
                id="manual-title"
                type="text"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="e.g., Phishing Domain Link or UPI Ref #4291003812"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div>
              <label
                htmlFor="manual-kind"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Evidence Category
              </label>
              <select
                id="manual-kind"
                value={manualKind}
                onChange={(e) => setManualKind(e.target.value as EvidenceRecordKind)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
              >
                {RECORD_KINDS.map((rk) => (
                  <option key={rk} value={rk}>
                    {rk}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="manual-captured"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Date &amp; Time Observed
              </label>
              <input
                id="manual-captured"
                type="text"
                value={manualCapturedAt}
                onChange={(e) => setManualCapturedAt(e.target.value)}
                placeholder="e.g., 2026-10-25 21:15"
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div>
              <label
                htmlFor="manual-url"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Exact URL, Account Handle, or Reference (Optional)
              </label>
              <input
                id="manual-url"
                type="text"
                value={manualSourceUrl}
                onChange={(e) => setManualSourceUrl(e.target.value)}
                placeholder="e.g., https://... or @sender_handle"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="manual-desc"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Factual Description <span className="text-red-600">*</span>
            </label>
            <textarea
              id="manual-desc"
              rows={3}
              value={manualDesc}
              onChange={(e) => setManualDesc(e.target.value)}
              placeholder="Describe what was displayed, exact message text, or where the original copy is kept."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-[#0B1220] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0B1220] hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add to Evidence Inventory</span>
            </button>
          </div>
        </form>
      )}

      {/* Cataloged Evidence Inventory List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-base font-semibold text-[#0B1220]">
            Evidence Inventory ({incident.evidence.length})
          </h2>
          <span className="text-xs text-slate-500 tabular-nums">
            {
              incident.evidence.filter(
                (e) => e.storageIndicator === 'Preview / Excerpt Stored Locally in Browser'
              ).length
            }{' '}
            with local preview ·{' '}
            {
              incident.evidence.filter(
                (e) => e.storageIndicator !== 'Preview / Excerpt Stored Locally in Browser'
              ).length
            }{' '}
            name/description only
          </span>
        </div>

        {incident.evidence.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-800">No evidence records logged yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Attach screenshots/documents above or log URLs, chat messages, and ticket numbers
              manually.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {incident.evidence.map((ev, idx) => {
              const isEditing = editingId === ev.id;
              const storageScope =
                ev.storageIndicator ||
                (ev.entryMethod === 'manual-entry'
                  ? 'Manual Description / URL Recorded Only'
                  : 'Filename & Size Recorded Only (File Stays on Device)');
              const hasActualPreview =
                storageScope === 'Preview / Excerpt Stored Locally in Browser';

              return (
                <div key={ev.id} className="p-5 hover:bg-slate-50/60 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      {ev.previewDataUrl ? (
                        <img
                          src={ev.previewDataUrl}
                          alt={`Local preview of ${ev.fileName}`}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 font-mono text-xs font-semibold text-slate-600 tabular-nums">
                          #{String(idx + 1).padStart(2, '0')}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        {/* Unboxed Metadata + Explicit Storage Scope Indicator */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mb-1 tabular-nums">
                          <span className="font-semibold text-slate-700">
                            {ev.recordKind || ev.fileType}
                          </span>
                          {ev.fileSizeBytes !== undefined && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono">{formatBytes(ev.fileSizeBytes)}</span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${
                              hasActualPreview ? 'text-emerald-800' : 'text-[#2563EB]'
                            }`}
                          >
                            <HardDrive className="w-3 h-3" />
                            {storageScope}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>Captured: {ev.capturedAt || 'Unspecified'}</span>
                        </div>

                        <p className="font-display text-sm font-semibold text-[#0B1220] break-all">
                          {ev.fileName}
                        </p>

                        {isEditing ? (
                          <div className="mt-3 space-y-3 bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                  Captured Timestamp
                                </label>
                                <input
                                  type="text"
                                  value={editCapturedAt}
                                  onChange={(e) => setEditCapturedAt(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                  Source URL / Handle
                                </label>
                                <input
                                  type="text"
                                  value={editSourceUrl}
                                  onChange={(e) => setEditSourceUrl(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                Evidence Description
                              </label>
                              <textarea
                                rows={2}
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => saveEdit(ev.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] rounded-md cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Save</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-md cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Cancel</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                              {ev.description}
                            </p>
                            {ev.sourceUrl && (
                              <p className="text-xs text-slate-500 mt-1 break-all">
                                URL / Handle: <span className="font-mono">{ev.sourceUrl}</span>
                              </p>
                            )}
                            {ev.textExcerpt && (
                              <pre className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono text-slate-600 overflow-x-auto whitespace-pre-wrap">
                                Stored Excerpt: {ev.textExcerpt}
                              </pre>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEdit(ev)}
                          aria-label={`Edit notes for ${ev.fileName}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeEvidence(ev.id)}
                          aria-label={`Remove ${ev.fileName}`}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Step Footer Navigation */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Incident Details</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
        >
          <span>Continue to Chronological Timeline</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
