
export async function savePlaylist(items: any[]) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ManelflixDB', 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('playlist')) {
        db.createObjectStore('playlist', { keyPath: 'id' });
      }
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const transaction = db.transaction('playlist', 'readwrite');
      const store = transaction.objectStore('playlist');
      store.clear();
      items.forEach(item => store.add(item));
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject('Erro ao salvar no banco');
    };
  });
}

export async function getPlaylist(): Promise<any[]> {
  return new Promise((resolve) => {
    const request = indexedDB.open('ManelflixDB', 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      db.createObjectStore('playlist', { keyPath: 'id' });
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const transaction = db.transaction('playlist', 'readonly');
      const store = transaction.objectStore('playlist');
      const getAll = store.getAll();
      getAll.onsuccess = () => resolve(getAll.result || []);
      getAll.onerror = () => resolve([]);
    };
    request.onerror = () => resolve([]);
  });
}
