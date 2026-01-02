
export async function saveIPTVData(items: any[], categories: any[]) {
  return new Promise((resolve, reject) => {
    // Incrementamos para v3 para garantir nova estrutura se necessário
    const request = indexedDB.open('ManelflixDB', 3);
    
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('playlist')) {
        db.createObjectStore('playlist', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }
    };

    request.onsuccess = (e: any) => {
      const db = e.target.result;
      try {
        const tx = db.transaction(['playlist', 'categories'], 'readwrite');
        
        const pStore = tx.objectStore('playlist');
        pStore.clear();
        items.forEach(item => pStore.add(item));
        
        const cStore = tx.objectStore('categories');
        cStore.clear();
        categories.forEach(cat => cStore.add(cat));
        
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject('Erro na transação do banco');
      } catch (err) {
        reject(err);
      }
    };
    
    request.onerror = () => reject('Erro ao abrir IndexedDB');
  });
}

export async function getIPTVData(): Promise<{ items: any[], categories: any[] }> {
  return new Promise((resolve) => {
    const request = indexedDB.open('ManelflixDB', 3);
    
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('playlist')) db.createObjectStore('playlist', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('categories')) db.createObjectStore('categories', { keyPath: 'id' });
    };

    request.onsuccess = (e: any) => {
      const db = e.target.result;
      try {
        const tx = db.transaction(['playlist', 'categories'], 'readonly');
        const pReq = tx.objectStore('playlist').getAll();
        const cReq = tx.objectStore('categories').getAll();
        
        tx.oncomplete = () => {
          resolve({ 
            items: pReq.result || [], 
            categories: cReq.result || [] 
          });
        };
      } catch (err) {
        resolve({ items: [], categories: [] });
      }
    };
    request.onerror = () => resolve({ items: [], categories: [] });
  });
}
