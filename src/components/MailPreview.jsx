import { useState } from 'react';
import { Mail, Send, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

export default function MailPreview({ mails, onSend, isSending }) {
  const [expandedMails, setExpandedMails] = useState(new Set([0]));
  const [copiedIndex, setCopiedIndex] = useState(null);

  const toggleMail = (index) => {
    const newExpanded = new Set(expandedMails);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedMails(newExpanded);
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!mails || mails.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">
            Generated Emails ({mails.length})
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Review and verify emails before sending
          </p>
        </div>
        <button
          onClick={() => onSend(mails)}
          disabled={isSending || mails.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <Send className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
          {isSending ? 'Sending...' : `Send All (${mails.length})`}
        </button>
      </div>

      <div className="grid gap-4">
        {mails.map((mail, index) => (
          <div
            key={index}
            className="border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow bg-white"
          >
            {/* Mail header */}
            <button
              onClick={() => toggleMail(index)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4 text-left flex-1">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-primary-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-slate-900 truncate">
                    {mail.recipient || `Email ${index + 1}`}
                  </h4>
                  <p className="text-sm text-slate-500 truncate">
                    {mail.subject || 'No subject'}
                  </p>
                </div>
              </div>
              {expandedMails.has(index) ? (
                <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
              )}
            </button>

            {/* Mail content */}
            {expandedMails.has(index) && (
              <div className="border-t border-slate-200 p-6 space-y-4 bg-slate-50">
                {/* To */}
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    To
                  </label>
                  <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-slate-200">
                    <input
                      type="email"
                      defaultValue={mail.recipient || ''}
                      className="flex-1 outline-none text-slate-900"
                      readOnly
                    />
                    <button
                      onClick={() =>
                        copyToClipboard(mail.recipient || '', index)
                      }
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Subject
                  </label>
                  <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-slate-200">
                    <input
                      type="text"
                      defaultValue={mail.subject || ''}
                      className="flex-1 outline-none text-slate-900"
                      readOnly
                    />
                    <button
                      onClick={() => copyToClipboard(mail.subject || '', index)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Message
                  </label>
                  <div className="relative">
                    <textarea
                      defaultValue={mail.body || ''}
                      className="w-full outline-none text-slate-900 bg-white p-4 rounded-lg border border-slate-200 font-mono text-sm min-h-[300px] resize-none"
                      readOnly
                    />
                    <button
                      onClick={() => copyToClipboard(mail.body || '', index)}
                      className="absolute top-4 right-4 p-2 hover:bg-slate-200 rounded-lg transition-colors bg-white border border-slate-200"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-600" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">Subject Length</p>
                    <p className="text-lg font-bold text-slate-900">
                      {mail.subject?.length || 0}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">Body Length</p>
                    <p className="text-lg font-bold text-slate-900">
                      {mail.body?.length || 0}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">Estimated Read Time</p>
                    <p className="text-lg font-bold text-slate-900">
                      {Math.ceil((mail.body?.length || 0) / 200)} min
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}