import React, { useRef, useState } from 'react';
import { X, Download, FileText, Shield, AlertTriangle, Printer, Loader2 } from 'lucide-react';

export default function ReportModal({ result, previewUrl, currentUser, onClose }) {
  const reportRef = useRef();
  const [downloading, setDownloading] = useState(false);

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`SKINOVA_Report_${(result?.prediction || 'Diagnosis').replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('PDF export failed, falling back to print:', err);
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const confPct = Math.round((result?.confidence || 0) * 100);
  const date    = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });

  return (
    <div className="modal-backdrop" onClick={e => { if(e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box max-w-2xl w-full">
        <div className="p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{borderColor:'#E2E8F0'}}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-teal-600 flex-shrink-0"/>
              <h2 className="font-bold text-slate-900 text-sm sm:text-base">Skin Analysis Report</h2>
            </div>
            <button className="btn btn-icon btn-sm btn-ghost sm:hidden" onClick={onClose}><X size={18}/></button>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button className="btn btn-sm btn-primary flex-1 sm:flex-initial text-xs" onClick={handleDownloadPDF} disabled={downloading}>
              {downloading ? <Loader2 size={13} className="animate-spin"/> : <Download size={13}/>}
              <span>{downloading ? 'Exporting...' : 'Download PDF'}</span>
            </button>
            <button className="btn btn-sm btn-secondary flex-1 sm:flex-initial text-xs" onClick={handlePrint}>
              <Printer size={13}/> Print
            </button>
            <button className="btn btn-icon btn-sm btn-ghost hidden sm:inline-flex" onClick={onClose}><X size={18}/></button>
          </div>
        </div>

        <div ref={reportRef} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Report Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                   style={{background:'linear-gradient(135deg,#14B8A6,#0F766E)'}}>
                <Shield size={18} className="text-white"/>
              </div>
              <div>
                <h3 className="font-bold text-slate-900" style={{fontFamily:'Outfit,sans-serif'}}>SKINOVA AI</h3>
                <p className="text-xs text-slate-500">Dermatological Analysis Report</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Report Date</p>
              <p className="text-sm font-semibold text-slate-700">{date}</p>
            </div>
          </div>

          <div className="divider"/>

          {/* Patient */}
          {currentUser && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="label">Patient Name</p>
                <p className="text-sm font-semibold text-slate-800 truncate">{currentUser.name}</p>
              </div>
              <div>
                <p className="label">Patient Email</p>
                <p className="text-sm font-semibold text-slate-800 break-all">{currentUser.email}</p>
              </div>
            </div>
          )}

          <div className="divider"/>

          {/* Results */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {previewUrl && (
              <div>
                <p className="label">Analyzed Image</p>
                <img src={previewUrl} alt="Analyzed" className="rounded-2xl w-full object-cover max-h-48"/>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <p className="label">Primary Diagnosis</p>
                <p className="text-xl font-bold text-slate-900">{result?.prediction}</p>
                {result?.icd_code && <p className="text-xs text-slate-400 mt-0.5">ICD-10: {result.icd_code}</p>}
              </div>
              <div>
                <p className="label">Confidence Level</p>
                <p className="text-2xl font-extrabold gradient-text">{confPct}%</p>
                <div className="progress-track mt-2">
                  <div className="progress-fill" style={{width:`${confPct}%`}}/>
                </div>
              </div>
              <div>
                <p className="label">Risk Assessment</p>
                <span className={`badge ${result?.risk_level === 'high' ? 'badge-danger' : result?.risk_level === 'low' ? 'badge-success' : 'badge-warning'} text-sm py-1`}>
                  {(result?.risk_level || 'N/A').toUpperCase()} RISK
                </span>
              </div>
            </div>
          </div>

          {/* AI Summary */}
          {result?.llm_summary && (
            <div className="p-4 rounded-2xl" style={{background:'#F0FDFA', border:'1px solid #CCFBF1'}}>
              <p className="label">AI Clinical Summary</p>
              <p className="text-sm text-slate-700 leading-relaxed">{result.llm_summary}</p>
            </div>
          )}

          {/* Top Classes */}
          {result?.top_classes?.length > 0 && (
            <div>
              <p className="label">Differential Diagnosis</p>
              <div className="space-y-2">
                {result.top_classes.map(([cls, prob]) => (
                  <div key={cls}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700">{cls}</span>
                      <span className="text-slate-500">{Math.round(prob * 100)}%</span>
                    </div>
                    <div className="progress-track" style={{height:'5px'}}>
                      <div className="progress-fill" style={{width:`${Math.round(prob*100)}%`}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="divider"/>

          {/* Disclaimer */}
          <div className="flex items-start gap-3 p-4 rounded-2xl" style={{background:'#FFFBEB', border:'1px solid #FDE68A'}}>
            <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5"/>
            <p className="text-xs text-amber-700 leading-relaxed">
              <strong>Medical Disclaimer:</strong> This AI-generated report is for informational purposes only and does not constitute medical advice. Always consult a licensed dermatologist for proper diagnosis and treatment. SKINOVA AI uses EfficientNet-B0 trained on ISIC dataset with INT8 precision.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
