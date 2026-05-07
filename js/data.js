calcKwh(rows) {
  if (!rows.length) return 0;

  const kwhVals = rows.map(r => r.kwh).filter(v => v !== null);
  if (!kwhVals.length) {
    // fallback ประมาณจาก watt
    const ws = rows.map(r => r.w).filter(v => v !== null);
    if (!ws.length) return 0;
    return (ws.reduce((s, v) => s + v, 0) / ws.length / 1000) * (rows.length / 60);
  }

  // ตรวจสอบว่าเป็น delta หรือ absolute
  const isAbsolute = kwhVals[kwhVals.length - 1] > kwhVals[0] + 1;

  if (isAbsolute) {
    // absolute mode — last - first
    return Math.max(0, kwhVals[kwhVals.length - 1] - kwhVals[0]);
  } else {
    // delta mode — sum ทั้งหมด
    return kwhVals.reduce((s, v) => s + v, 0);
  }
},