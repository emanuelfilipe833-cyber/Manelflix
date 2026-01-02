
export async function saveIPTVData(items: any[], categories: any[]) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ManelflixDB', 2);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('playlist')) db.createObjectStore('playlist', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('categories')) db.createObjectStore('categories', { keyPath: 'id' });
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction(['playlist', 'categories'], 'readwrite');
      
      const pStore = tx.objectStore('playlist');
      pStore.clear();
      items.forEach(item => pStore.add(item));
      
      const cStore = tx.objectStore('categories');
      cStore.clear();
      categories.forEach(cat => cStore.add(cat));
      
      tx.oncomplete = () => resolve(true);
    };
  });
}

export async function getIPTVData(): Promise<{ items: any[], categories: any[] }> {
  return new Promise((resolve) => {
    const request = indexedDB.open('ManelflixDB', 2);
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction(['playlist', 'categories'], 'readonly');
      const pReq = tx.objectStore('playlist').getAll();
      const cReq = tx.objectStore('categories').getAll();
      
      tx.oncomplete = () => {
        resolve({ items: pReq.result || [], categories: cReq.result || [] });
      };
    };
    request.onerror = () => resolve({ items: [], categories: [] });
  });
}
