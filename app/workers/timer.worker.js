self.onmessage = (e) => {
  const { command, interval } = e.data;

  if (command === 'START') {
    // Bersihkan interval lama jika ada
    if (self.intervalId) clearInterval(self.intervalId);
    
    // Kirim 'TICK' setiap 100ms (0.1 detik)
    self.intervalId = setInterval(() => {
      self.postMessage({ type: 'TICK' });
    }, interval || 100);
  } 
  else if (command === 'STOP') {
    if (self.intervalId) {
      clearInterval(self.intervalId);
      self.intervalId = null;
    }
  }
};