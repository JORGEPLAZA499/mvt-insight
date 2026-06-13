import { generatePdfReport } from '/dev-server/src/lib/pdf-report.ts';
// Stub localStorage / window for the module
globalThis.window = undefined;
const fakeAnalysis = {
  id: '397fa9df-c2fb-49e6-8b60-5239107ff2f2',
  fileName: '1797e4d5-c2fb-49e6-8b60-5239107ff2f2.zip',
  fileSize: 1371237683,
  uploadedAt: new Date('2026-06-12T18:45:21Z').toISOString(),
  status: 'completed',
  progress: 100,
  result: {
    platform: 'android',
    totalEntries: 737458,
    totalDetections: 0,
    risk: 'low',
    parsedAt: new Date().toISOString(),
    sourceName: 'test',
    detections: [],
    timeline: [],
    modules: [
      { key: 'dumpsys', label: 'dumpsys', fileName:'', entries: 447272, detected: 0, description:'' },
      { key: 'files', label: 'Files', fileName:'', entries: 252294, detected: 0, description:'' },
      { key: 'logcat', label: 'logcat', fileName:'', entries: 34533, detected: 0, description:'' },
      { key: 'getprop', label: 'getprop', fileName:'', entries: 1220, detected: 0, description:'' },
      { key: 'processes', label: 'Procesos', fileName:'', entries: 613, detected: 0, description:'' },
      { key: 'services', label: 'services', fileName:'', entries: 359, detected: 0, description:'' },
      { key: 'packages', label: 'Paquetes instalados', fileName:'', entries: 345, detected: 0, description:'' },
      { key: 'mounts', label: 'Particiones montadas', fileName:'', entries: 281, detected: 0, description:'' },
      { key: 'settings_global', label: 'settings_global', fileName:'', entries: 266, detected: 0, description:'' },
      { key: 'settings_secure', label: 'settings_secure', fileName:'', entries: 171, detected: 0, description:'' },
      { key: 'settings_system', label: 'settings_system', fileName:'', entries: 65, detected: 0, description:'' },
      { key: 'env', label: 'env', fileName:'', entries: 28, detected: 0, description:'' },
      { key: 'acquisition', label: 'acquisition', fileName:'', entries: 10, detected: 0, description:'' },
      { key: 'selinux', label: 'selinux', fileName:'', entries: 1, detected: 0, description:'' },
    ],
    deviceInfo: {
      brand: 'motorola', manufacturer: 'motorola', model: 'moto g35 5G',
      osVersion: '15', securityPatch: '2026-04-05', buildId: 'VUOA35.116-128',
      deviceName: 'manila', locale: 'español · Argentina', timezone: 'America/Sao_Paulo',
      carrier: ',Carrier', bootloaderState: 'green',
      debuggable: false, serialLast4: 'GC2K',
    },
  },
};
// Patch jspdf.save to write to disk
const { default: jsPDF } = await import('jspdf');
const origSave = jsPDF.prototype.save;
jsPDF.prototype.save = function(name){
  const data = this.output('arraybuffer');
  const fs = require('fs');
  fs.writeFileSync('/tmp/pdfqa/'+name, Buffer.from(data));
  console.log('wrote /tmp/pdfqa/'+name);
};
await generatePdfReport(fakeAnalysis);
