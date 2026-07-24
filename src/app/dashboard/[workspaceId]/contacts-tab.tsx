"use client";

import { useState } from "react";
import {
  Plus,
  X,
  Search,
  Mail,
  Link2,
  Building2,
  Pencil,
  Trash2,
  MessageSquare,
  Send,
  Clock,
} from "lucide-react";
import { api } from "@/trpc/react";

type Contact = {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  linkedinUrl: string | null;
  relationship: string | null;
  notes: string | null;
  nextAction: string | null;
  lastInteraction: Date | null;
  company: { id: string; name: string } | null;
  outreach: { id: string; subject: string | null; sentAt: Date | null }[];
};

export function ContactsTab({ workspaceId }: { workspaceId: string }) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [showOutreach, setShowOutreach] = useState<string | null>(null);
  const utils = api.useUtils();

  const { data: contacts, isLoading } = api.contact.list.useQuery({
    workspaceId,
    search: search || undefined,
  });

  const { data: companies } = api.company.list.useQuery({ workspaceId });

  const deleteMutation = api.contact.delete.useMutation({
    onSuccess: () => utils.contact.list.invalidate({ workspaceId }),
  });

  function handleDelete(id: string) {
    if (confirm("Delete this contact?")) {
      deleteMutation.mutate({ workspaceId, contactId: id });
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm transition focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>
        <button
          onClick={() => { setEditing(null); setShowAdd(true); }}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Add Contact
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center text-sm text-slate-400">Loading contacts...</div>
      ) : contacts && contacts.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((contact: Contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onEdit={() => { setEditing(contact); setShowAdd(true); }}
              onDelete={() => handleDelete(contact.id)}
              onOutreach={() => setShowOutreach(contact.id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm text-slate-500">
            {search ? "No contacts match your search." : "No contacts yet. Add recruiters, hiring managers, and referrals to track your network."}
          </p>
        </div>
      )}

      {showAdd && (
        <ContactModal
          workspaceId={workspaceId}
          contact={editing}
          companies={companies as never}
          onClose={() => { setShowAdd(false); setEditing(null); }}
        />
      )}

      {showOutreach && (
        <OutreachModal
          workspaceId={workspaceId}
          contactId={showOutreach}
          onClose={() => setShowOutreach(null)}
        />
      )}
    </div>
  );
}

function ContactCard({
  contact,
  onEdit,
  onDelete,
  onOutreach,
}: {
  contact: Contact;
  onEdit: () => void;
  onDelete: () => void;
  onOutreach: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{contact.name}</p>
          {contact.role && (
            <p className="mt-0.5 text-xs text-slate-500">{contact.role}</p>
          )}
          {contact.company && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
              <Building2 className="h-3 w-3" />
              {contact.company.name}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-slate-600 hover:underline">
            <Mail className="h-3 w-3" />
            {contact.email}
          </a>
        )}
        {contact.linkedinUrl && (
          <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-slate-600 hover:underline">
            <Link2 className="h-3 w-3" />
            LinkedIn
          </a>
        )}
      </div>

      {contact.nextAction && (
        <div className="mt-3 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
          <span className="font-medium">Next: </span>{contact.nextAction}
        </div>
      )}

      {contact.notes && (
        <p className="mt-2 line-clamp-2 text-xs text-slate-400">{contact.notes}</p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
        <span className="text-xs text-slate-400">
          {contact.outreach.length} message{contact.outreach.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={onOutreach}
          className="flex items-center gap-1 text-xs font-medium text-slate-600 transition hover:text-slate-900"
        >
          <MessageSquare className="h-3 w-3" />
          Outreach
        </button>
      </div>
    </div>
  );
}

function ContactModal({
  workspaceId,
  contact,
  companies,
  onClose,
}: {
  workspaceId: string;
  contact: Contact | null;
  companies: { id: string; name: string }[];
  onClose: () => void;
}) {
  const utils = api.useUtils();
  const [name, setName] = useState(contact?.name ?? "");
  const [role, setRole] = useState(contact?.role ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(contact?.linkedinUrl ?? "");
  const [companyId, setCompanyId] = useState(contact?.company?.id ?? "");
  const [relationship, setRelationship] = useState(contact?.relationship ?? "");
  const [notes, setNotes] = useState(contact?.notes ?? "");
  const [nextAction, setNextAction] = useState(contact?.nextAction ?? "");
  const [error, setError] = useState<string | null>(null);

  const createMutation = api.contact.create.useMutation({
    onSuccess: () => {
      utils.contact.list.invalidate({ workspaceId });
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  const updateMutation = api.contact.update.useMutation({
    onSuccess: () => {
      utils.contact.list.invalidate({ workspaceId });
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      workspaceId,
      name: name.trim(),
      role: role.trim() || null,
      email: email.trim() || null,
      linkedinUrl: linkedinUrl.trim() || null,
      companyId: companyId || null,
      relationship: relationship.trim() || null,
      notes: notes.trim() || null,
      nextAction: nextAction.trim() || null,
    };

    if (contact) {
      updateMutation.mutate({ ...payload, contactId: contact.id });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {contact ? "Edit Contact" : "Add Contact"}
          </h2>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600">Name *</label>
              <input required type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Role / Title</label>
              <input type="text" value={role} onChange={(e) => setRole(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">LinkedIn URL</label>
              <input type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Company</label>
              <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900">
                <option value="">None</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Relationship</label>
              <input type="text" placeholder="e.g. Recruiter, Referral, Hiring Manager" value={relationship} onChange={(e) => setRelationship(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Next Action</label>
            <input type="text" placeholder="e.g. Follow up next week" value={nextAction} onChange={(e) => setNextAction(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">Notes</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900" />
          </div>

          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50">
              {isPending ? "Saving..." : contact ? "Save Changes" : "Add Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OutreachModal({
  workspaceId,
  contactId,
  onClose,
}: {
  workspaceId: string;
  contactId: string;
  onClose: () => void;
}) {
  const utils = api.useUtils();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: messages, isLoading } = api.contact.listOutreach.useQuery({
    workspaceId,
    contactId,
  });

  const createMutation = api.contact.createOutreach.useMutation({
    onSuccess: () => {
      utils.contact.listOutreach.invalidate({ workspaceId, contactId });
      utils.contact.list.invalidate({ workspaceId });
      setSubject("");
      setBody("");
      setError(null);
    },
    onError: (err) => setError(err.message),
  });

  const markSentMutation = api.contact.markSent.useMutation({
    onSuccess: () => {
      utils.contact.listOutreach.invalidate({ workspaceId, contactId });
      utils.contact.list.invalidate({ workspaceId });
    },
  });

  const deleteMutation = api.contact.deleteOutreach.useMutation({
    onSuccess: () => {
      utils.contact.listOutreach.invalidate({ workspaceId, contactId });
      utils.contact.list.invalidate({ workspaceId });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    createMutation.mutate({
      workspaceId,
      contactId,
      subject: subject.trim() || null,
      body: body.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Outreach Messages</h2>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Existing messages */}
        <div className="mt-4 space-y-2">
          {isLoading ? (
            <p className="text-xs text-slate-400">Loading messages...</p>
          ) : messages && messages.length > 0 ? (
            messages.map((msg: { id: string; subject: string | null; body: string; sentAt: Date | null; createdAt: string | Date }) => (
              <div key={msg.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {msg.subject && (
                      <p className="text-sm font-medium text-slate-900">{msg.subject}</p>
                    )}
                    <p className="mt-1 line-clamp-3 text-xs text-slate-600">{msg.body}</p>
                  </div>
                  <div className="flex gap-1">
                    {msg.sentAt ? (
                      <span className="flex items-center gap-1 rounded bg-green-50 px-1.5 py-0.5 text-xs text-green-600">
                        <Send className="h-3 w-3" />
                        Sent
                      </span>
                    ) : (
                      <button
                        onClick={() => markSentMutation.mutate({ workspaceId, outreachId: msg.id })}
                        disabled={markSentMutation.isPending}
                        className="flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 transition hover:bg-slate-200"
                      >
                        <Send className="h-3 w-3" />
                        Mark sent
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate({ workspaceId, outreachId: msg.id })}
                      className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="h-3 w-3" />
                  {new Date(msg.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400">No messages yet. Draft one below.</p>
          )}
        </div>

        {/* New message form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <div>
            <label className="block text-xs font-medium text-slate-600">Subject</label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Message *</label>
            <textarea required rows={4} value={body} onChange={(e) => setBody(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900" />
          </div>
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="flex justify-end">
            <button type="submit" disabled={createMutation.isPending}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50">
              {createMutation.isPending ? "Saving..." : "Save Draft"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
