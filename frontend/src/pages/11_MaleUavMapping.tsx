import React from 'react';
import { Plane, ArrowRight, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export const MaleUavMappingPage: React.FC = () => {
  const mappingRows = [
    {
      bldcParam: 'Motor RPM (Optical / Hall / ESC)',
      bldcStatus: 'VALIDATED ON RIG' as const,
      aeroEngineParam: 'Engine Crankshaft RPM / Prop Governor RPM',
      aeroStatus: 'FUTURE MALE-UAV' as const,
      mappingLogic: 'Direct 1-to-1 operational speed scaling; feeds rotational vibration harmonic analysis.',
      proxyEquivalence: 'Direct Physical Equivalence'
    },
    {
      bldcParam: 'Stator Winding Temperature (NTC / DS18B20)',
      bldcStatus: 'VALIDATED ON RIG' as const,
      aeroEngineParam: 'Cylinder Head Temperature (CHT) & Exhaust Gas Temperature (EGT)',
      aeroStatus: 'FUTURE MALE-UAV' as const,
      mappingLogic: 'Lumped thermal differential model mapped to combustion chamber thermal capacitance & convective dissipation.',
      proxyEquivalence: 'Thermal Dynamics Analog'
    },
    {
      bldcParam: '3-Axis Vibration RMS (MPU6050 / ADXL345)',
      bldcStatus: 'VALIDATED ON RIG' as const,
      aeroEngineParam: 'Crankcase & Gearbox Vibration (Piston reciprocation)',
      aeroStatus: 'FUTURE MALE-UAV' as const,
      mappingLogic: '1X and 2X rotational harmonics mapped to piston firing frequency and gearbox bearing wear.',
      proxyEquivalence: 'Harmonic Acceleration Analog'
    },
    {
      bldcParam: 'Phase Current & Electrical Power (INA219 / ACS712)',
      bldcStatus: 'VALIDATED ON RIG' as const,
      aeroEngineParam: 'Fuel Mass Flow Rate & Engine Brake Specific Fuel Consumption (BSFC)',
      aeroStatus: 'FUTURE MALE-UAV' as const,
      mappingLogic: 'Power input rate (Watts vs Gallons/Hour energy content) mapped to thermodynamic conversion efficiency.',
      proxyEquivalence: 'Energy Inflow Analog'
    },
    {
      bldcParam: 'Dynamometer Braking Load / Throttle %',
      bldcStatus: 'VALIDATED ON RIG' as const,
      aeroEngineParam: 'Manifold Absolute Pressure (MAP) & Throttle Body Angle',
      aeroStatus: 'FUTURE MALE-UAV' as const,
      mappingLogic: 'Engine torque demand and volumetric airflow filling factor across flight altitude profile.',
      proxyEquivalence: 'Aerodynamic Load Analog'
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Plane className="w-5 h-5 text-sky-600" />
          MALE UAV Aero-Piston Propulsion Migration & Mapping Matrix
        </h2>
        <p className="text-xs text-slate-500">
          Transparent scientific translation matrix mapping current physical BLDC testbed channels to future UAV aero-piston engines
        </p>
      </div>

      {/* Migration Notice */}
      <div className="aerospace-card p-4 bg-sky-50/50 border-sky-200 text-xs text-sky-900">
        <div className="flex items-center gap-2 font-bold mb-1">
          <Info className="w-4 h-4 text-sky-600" />
          <span>Scientific Integrity & Platform Migration Scope</span>
        </div>
        <p className="leading-relaxed">
          The physical BLDC motor rig is the <strong>current laboratory validation testbed</strong>. The predictive algorithms, Digital Twin residual framework, and GCS architecture are architected for seamless migration to MALE-UAV heavy-fuel aero-piston engines (e.g. Rotax 914 / Austro Engine AE300 class) upon sensor plug-in.
        </p>
      </div>

      {/* Mapping Matrix Table */}
      <div className="aerospace-card p-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
          Channel-by-Channel Physical to Future Target Mapping
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold text-[11px]">
                <th className="py-2.5 px-3">CURRENT BLDC RIG CHANNEL</th>
                <th className="py-2.5 px-3">VALIDATION STATUS</th>
                <th className="py-2.5 px-3">FUTURE AERO-PISTON CHANNEL</th>
                <th className="py-2.5 px-3">MIGRATION SCOPE</th>
                <th className="py-2.5 px-3">PHYSICAL ANALOGY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {mappingRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-900 font-sans">{row.bldcParam}</td>
                  <td className="py-3 px-3">
                    <StatusBadge type="VALIDATED" />
                  </td>
                  <td className="py-3 px-3 font-semibold text-purple-900 font-sans">{row.aeroEngineParam}</td>
                  <td className="py-3 px-3">
                    <StatusBadge type="FUTURE" />
                  </td>
                  <td className="py-3 px-3 text-[11px] text-slate-600 font-sans">{row.mappingLogic}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step-by-Step Migration Roadmap */}
      <div className="aerospace-card p-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
          MALE-UAV Engine Integration Roadmap
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-sky-600 font-bold block mb-1">PHASE 1: BLDC LAB RIG</span>
            <p className="text-slate-600">Physical validation of Digital Twin equations, residual dynamics, and AI models on the bench.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-sky-600 font-bold block mb-1">PHASE 2: ENGINE SENSOR HAL</span>
            <p className="text-slate-600">Interface CAN-bus / MAVLink CHT, EGT, oil pressure, and fuel flow sensor DAQ modules.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-sky-600 font-bold block mb-1">PHASE 3: THERMODYNAMIC TWIN</span>
            <p className="text-slate-600">Implement Otto/Diesel cycle thermodynamic state estimation in place of BLDC electro-mechanical twin.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-sky-600 font-bold block mb-1">PHASE 4: FLIGHT TESTBED</span>
            <p className="text-slate-600">Deploy companion edge computer onboard MALE UAV platform for real-time inflight prognostics.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
