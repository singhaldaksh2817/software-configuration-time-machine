import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Download, Copy, Check, FileText, CheckCircle2, AlertTriangle, Printer } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function ComplianceModal({ isOpen, onClose, projectId, projectName }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen && projectId) {
      loadReport();
    }
  }, [isOpen, projectId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await api.getComplianceReport(projectId);
      setReport(data);
    } catch (err) {
      addToast(err.message, 'error', 'Failed to generate compliance report');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!report?.markdown) return;
    navigator.clipboard.writeText(report.markdown);
    setCopied(true);
    addToast('Compliance certificate copied to clipboard', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!report?.markdown) return;
    const blob = new Blob([report.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.project.slug || 'project'}-compliance-certificate.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('Certificate downloaded (.md)', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in-50">
      <div className="w-full max-w-4xl rounded-2xl bg-archival-surface border border-archival-border shadow-2xl p-6 relative max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-archival-muted hover:text-archival-text hover:bg-archival-elevated transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-archival-border shrink-0">
          <div className="w-11 h-11 rounded-xl bg-archival-teal/15 border border-archival-teal/40 flex items-center justify-center text-archival-teal shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-archival-text">
                SCM Configuration Integrity & Compliance Certificate
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-archival-teal/20 text-archival-teal border border-archival-teal/30">
                ISO 27001 / SOC 2
              </span>
            </div>
            <p className="text-xs text-archival-muted mt-0.5">
              Auditable verification of version control immutability, baselines, and change request traceability
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-5 text-xs">
          {loading ? (
            <div className="py-20 text-center text-archival-muted">
              <div className="inline-block animate-spin w-6 h-6 border-2 border-archival-accent border-t-transparent rounded-full mb-3" />
              <p>Compiling cryptographic audit records and repository signatures...</p>
            </div>
          ) : report ? (
            <>
              {/* Certificate Seal Banner */}
              <div className="p-4 rounded-xl bg-archival-elevated/80 border border-archival-border grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
                <div>
                  <span className="text-[10px] uppercase text-archival-muted block">Certificate ID</span>
                  <span className="text-xs font-bold text-archival-accent truncate block">{report.certificateId}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-archival-muted block">Integrity State</span>
                  <span className={`text-xs font-bold flex items-center gap-1 ${
                    report.integrityStatus === 'VERIFIED_SECURE' ? 'text-archival-teal' : 'text-archival-warning'
                  }`}>
                    {report.integrityStatus === 'VERIFIED_SECURE' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                    {report.integrityStatus}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-archival-muted block">Active Baseline</span>
                  <span className="text-xs font-semibold text-archival-text">{report.project.activeBaseline}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-archival-muted block">SCM Check-in Hash</span>
                  <span className="text-xs text-archival-accent font-mono truncate block">
                    [{report.project.currentRevision?.substring(0, 10) || 'HEAD'}]
                  </span>
                </div>
              </div>

              {/* Statistics Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-lg bg-archival-surface border border-archival-border/80">
                  <div className="text-lg font-bold text-archival-text">{report.metrics.totalConfigurationItems}</div>
                  <div className="text-[10px] text-archival-muted uppercase tracking-wider font-mono">Tracked Artifacts</div>
                </div>
                <div className="p-3 rounded-lg bg-archival-surface border border-archival-border/80">
                  <div className="text-lg font-bold text-archival-teal">{report.metrics.totalBaselines}</div>
                  <div className="text-[10px] text-archival-muted uppercase tracking-wider font-mono">Approved Baselines</div>
                </div>
                <div className="p-3 rounded-lg bg-archival-surface border border-archival-border/80">
                  <div className="text-lg font-bold text-archival-warning">{report.metrics.totalChangeRequests}</div>
                  <div className="text-[10px] text-archival-muted uppercase tracking-wider font-mono">Linked Changes</div>
                </div>
                <div className="p-3 rounded-lg bg-archival-surface border border-archival-border/80">
                  <div className="text-lg font-bold text-archival-accent">{report.metrics.totalAuditEvents}</div>
                  <div className="text-[10px] text-archival-muted uppercase tracking-wider font-mono">Audited Check-ins</div>
                </div>
              </div>

              {/* Markdown Preview Area */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-archival-muted">
                    Generated Compliance Document Preview
                  </span>
                  <span className="text-[10px] text-archival-muted font-mono">
                    Markdown Format • Portable for Auditors
                  </span>
                </div>
                <pre className="p-4 rounded-xl bg-archival-bg border border-archival-border text-archival-text font-mono text-[11px] leading-relaxed overflow-x-auto max-h-72 select-all whitespace-pre-wrap">
                  {report.markdown}
                </pre>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-archival-muted">
              Unable to generate report data.
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="mt-5 pt-4 border-t border-archival-border flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-archival-muted font-mono hidden sm:block">
            Attestation powered by Fossil SCM Distributed DAG Engine
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopy}
              disabled={loading || !report}
              className="px-3 py-2 rounded-lg bg-archival-surface hover:bg-archival-elevated border border-archival-border text-archival-text font-medium text-xs transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-archival-teal" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={loading || !report}
              className="px-4 py-2 rounded-lg bg-archival-teal hover:bg-archival-teal/80 text-archival-bg font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-archival-teal/20"
            >
              <Download className="w-4 h-4" />
              <span>Download Certificate (.md)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
