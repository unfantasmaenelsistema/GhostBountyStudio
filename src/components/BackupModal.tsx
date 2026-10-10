import React, { useState } from 'react';
import { exportFullBackup, importFullBackup, resetToSeedData } from '../utils/storage';
import { Download, Upload, RotateCcw, Check, AlertCircle, X, Shield } from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataReloaded: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  onDataReloaded,
}) => {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadBackup = () => {
    const backup = exportFullBackup();
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ghostbounty_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setImportStatus('Copia de seguridad exportada correctamente en JSON.');
    setTimeout(() => setImportStatus(null), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorStatus(null);
    setImportStatus(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const success = importFullBackup(parsed);
        if (success) {
          setImportStatus('¡Datos restaurados con éxito desde la copia de seguridad!');
          onDataReloaded();
          setTimeout(() => {
            onClose();
          }, 1500);
        } else {
          setErrorStatus('El archivo JSON no cumple la estructura de GhostBountyStudio.');
        }
      } catch (err: any) {
        setErrorStatus(`Error al parsear el archivo JSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (confirm('¿Restablecer el estudio a los datos iniciales de demostración de Ghost Academy? Se sobrescribirán los cambios no exportados.')) {
      resetToSeedData();
      onDataReloaded();
      setImportStatus('Datos de muestra restablecidos.');
      setTimeout(() => onClose(), 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-200 text-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Copia de Seguridad & Portabilidad</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-slate-400 text-xs">
          Todos tus programas, objetivos de recon, hallazgos y reportes se almacenan exclusivamente en el almacenamiento local de tu navegador (localStorage). Exporta un archivo JSON de respaldo para guardarlo de forma segura o migrarlo a otra máquina.
        </p>

        {importStatus && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{importStatus}</span>
          </div>
        )}

        {errorStatus && (
          <div className="p-3 bg-rose-950/60 border border-rose-500/40 text-rose-300 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorStatus}</span>
          </div>
        )}

        <div className="space-y-3 pt-2">
          {/* Export JSON */}
          <button
            onClick={handleDownloadBackup}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 font-semibold transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Exportar Cuaderno Completo (.JSON)
          </button>

          {/* Import JSON */}
          <label className="w-full py-2.5 px-4 bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 rounded-xl border border-purple-500/40 font-semibold transition flex items-center justify-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4 text-purple-400" />
            Importar Archivo de Respaldo (.JSON)
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Reset to defaults */}
          <button
            onClick={handleResetData}
            className="w-full py-2 px-4 bg-slate-950 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 rounded-xl border border-slate-800 hover:border-rose-500/40 font-mono text-[11px] transition flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restablecer a Datos de Muestra
          </button>
        </div>

        <div className="pt-2 text-[11px] text-slate-500 text-center font-mono">
          Formato estándar Ghost Academy v1.0 • Seguro & Offline
        </div>
      </div>
    </div>
  );
};
