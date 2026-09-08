import React from 'react';
import { Wrench, AlertTriangle, CheckCircle2, ShieldAlert, Clock } from 'lucide-react';
import { useAppStore } from '../state/store';
import { StatusBadge } from '../components/StatusBadge';

export const MaintenanceAdvisoryPage: React.FC = () => {
  const { systemState } = useAppStore();

  if (!systemState) return null;

  const intel = systemState.intelligence;

  const urgencyColors: Record<string, string> = {
    NONE: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    ROUTINE: 'bg-sky-100 text-sky-800 border-sky-300',
    SOON: 'bg-amber-100 text-amber-800 border-amber-300',
    IMMEDIATE: 'bg-rose-100 text-rose-800 border-rose-300',
    CRITICAL: 'bg-rose-600 text-white'
  };

  const inspectionChecklist = [
    { item: 'Motor Phase Resistance Balance Check', spec: '< 5% delta across U-V-W phases', tool: 'Digital Milli-Ohmmeter', required: intel.affected_subsystem.includes('Winding') || intel.affected_subsystem.includes('Phase') },
    { item: 'Rotor Radial & Axial Play / Dial Runout', spec: '< 0.05 mm total indicator reading', tool: 'Magnetic Base Dial Gauge', required: intel.affected_subsystem.includes('Bearing') || intel.affected_subsystem.includes('Rotor') },
    { item: 'Optical / Hall Pickup Lens Cleanliness', spec: 'Zero dust occlusion, 1.2mm air gap', tool: 'Optical Inspection Loupe', required: intel.affected_subsystem.includes('Sensor') },
    { item: 'Propeller Dynamic Balancing (1X Harmonic)', spec: '< 0.15g RMS unbalance at 6000 RPM', tool: 'Dynamic Balancer / Accelerometer', required: true },
    { item: 'ESC Inverter MOSFET Thermal Pad Inspection', spec: 'Uniform contact, no thermal discolouration', tool: 'FLIR Thermal Camera / Visual', required: intel.affected_subsystem.includes('ESC') || intel.affected_subsystem.includes('Thermal') },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Wrench className="w-5 h-5 text-sky-600" />
          Predictive Maintenance Advisory & Ground Support Checklists
        </h2>
        <p className="text-xs text-slate-500">
          Condition-based maintenance work orders synthesized from AI fault classification and physics residual drivers
        </p>
      </div>

      {/* Primary Work Order Banner */}
      <div className="aerospace-card p-5 border-l-4 border-l-sky-600 bg-gradient-to-r from-sky-50/50 via-white to-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              CURRENT ACTIVE MAINTENANCE ACTION
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              {intel.maintenance_action}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-md text-xs font-bold border ${urgencyColors[intel.maintenance_urgency] || urgencyColors.NONE}`}>
              URGENCY: {intel.maintenance_urgency}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-400 block mb-0.5 text-[10px] font-bold">AFFECTED SUBSYSTEM</span>
            <strong className="text-slate-900">{intel.affected_subsystem}</strong>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-400 block mb-0.5 text-[10px] font-bold">ESTIMATED RISK LEVEL</span>
            <strong className="text-slate-900">{intel.maintenance_risk_level} Risk</strong>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-400 block mb-0.5 text-[10px] font-bold">REMAINING LIFE TO OVERHAUL</span>
            <strong className="text-purple-700 font-mono font-bold">
              {intel.rul_hours !== null && intel.rul_hours !== undefined
                ? `${intel.rul_hours.toFixed(1)} Operating Hours`
                : 'PENDING SUFFICIENT DATA'}
            </strong>
          </div>
        </div>
      </div>

      {/* Ground Support Inspection Checklist */}
      <div className="aerospace-card p-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
          Prescribed Ground Support Workshop Inspection Checklist
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold text-[11px]">
                <th className="py-2.5 px-3">INSPECTION ITEM</th>
                <th className="py-2.5 px-3">ACCEPTANCE CRITERIA</th>
                <th className="py-2.5 px-3">RECOMMENDED TOOL</th>
                <th className="py-2.5 px-3">PRIORITY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {inspectionChecklist.map((chk, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-900 font-sans">{chk.item}</td>
                  <td className="py-2.5 px-3 text-slate-600">{chk.spec}</td>
                  <td className="py-2.5 px-3 text-sky-700 font-semibold">{chk.tool}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      chk.required
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {chk.required ? 'MANDATORY' : 'ROUTINE'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advisory Disclaimer */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500">
        <strong>Aviation Decision Support Notice:</strong> Recommendations are prototype engineering health advisories designed for laboratory testbed decision support and academic demonstration, not certified civil aviation maintenance manuals (AMM).
      </div>
    </div>
  );
};
