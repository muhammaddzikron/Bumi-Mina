import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { Chapter, Review, Bookmark } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Add Google Sheets read/write scope
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

const STORAGE_TOKEN_KEY = 'bumimina_google_token_v1';
const STORAGE_TOKEN_EXPIRY_KEY = 'bumimina_google_token_expiry_v1';

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Try to restore token from localStorage on module load
try {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  const expiry = localStorage.getItem(STORAGE_TOKEN_EXPIRY_KEY);
  if (token && expiry && Date.now() < parseInt(expiry)) {
    cachedAccessToken = token;
  }
} catch (e) {
  console.error("Gagal memuat token Google dari localStorage:", e);
}

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const token = cachedAccessToken || localStorage.getItem(STORAGE_TOKEN_KEY);
      const expiry = localStorage.getItem(STORAGE_TOKEN_EXPIRY_KEY);
      const isValid = token && expiry && Date.now() < parseInt(expiry);

      if (isValid) {
        cachedAccessToken = token;
        if (onAuthSuccess) onAuthSuccess(user, token!);
      } else {
        // Token expired or not found, but we still have a user.
        // We will call onAuthFailure to prompt the user to re-link when they try to sync
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_TOKEN_EXPIRY_KEY);
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google Sign-In to obtain access token with Sheets permission
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses dari Google Auth.');
    }
    cachedAccessToken = credential.accessToken;
    
    // Save to localStorage with 55-minute expiration (Google tokens last 60 mins)
    const expiryTime = Date.now() + 55 * 60 * 1000;
    localStorage.setItem(STORAGE_TOKEN_KEY, cachedAccessToken);
    localStorage.setItem(STORAGE_TOKEN_EXPIRY_KEY, expiryTime.toString());

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  localStorage.removeItem(STORAGE_TOKEN_KEY);
  localStorage.removeItem(STORAGE_TOKEN_EXPIRY_KEY);
};

export const getAccessToken = () => cachedAccessToken;

const SPREADSHEET_ID = '1SexURj6gODO80-qzj9Uv4FG2s9ZzlS1G3SgNJ_MB9IM';

// Helper to check if required sheets exist, if not create them
async function ensureSheetsExist(accessToken: string): Promise<void> {
  // 1. Fetch spreadsheet details
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal memuat metadata spreadsheet: ${errText}`);
  }

  const metadata = await res.json();
  const existingTitles = metadata.sheets?.map((s: any) => s.properties?.title) || [];

  const requiredSheets = ['Bab Novel', 'Ulasan Pembaca', 'Bookmark'];
  const sheetsToAdd = requiredSheets.filter(title => !existingTitles.includes(title));

  if (sheetsToAdd.length > 0) {
    // Create missing sheets using batchUpdate
    const body = {
      requests: sheetsToAdd.map(title => ({
        addSheet: {
          properties: { title }
        }
      }))
    };

    const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(`Gagal membuat tab baru di spreadsheet: ${errText}`);
    }
  }
}

// Export Chapters, Reviews, and Bookmarks to Google Sheets
export async function exportToGoogleSheets(
  accessToken: string,
  chapters: Chapter[],
  reviews: Review[],
  bookmarks: Bookmark[]
): Promise<void> {
  // Ensure the tabs exist
  await ensureSheetsExist(accessToken);

  // 1. Export Chapters
  const chapterRows = [
    ['ID', 'Nomor', 'Judul', 'Subjudul', 'Ringkasan', 'Gambar URL', 'Status Kunci', 'Jumlah Halaman', 'Isi Cerita (Gabungan Halaman)']
  ];
  chapters.forEach(ch => {
    chapterRows.push([
      ch.id,
      ch.number.toString(),
      ch.title,
      ch.subtitle || '',
      ch.summary || '',
      ch.imageUrl || '',
      ch.isLocked ? '🔒 EKSKLUSIF' : '🔓 BEBAS',
      ch.pages.length.toString(),
      ch.pages.join('\n--- HALAMAN BARU ---\n')
    ]);
  });

  // 2. Export Reviews
  const reviewRows = [
    ['ID Ulasan', 'ID Bab', 'Nama Pembaca', 'Rating (1-5)', 'Komentar', 'Tanggal']
  ];
  reviews.forEach(rev => {
    reviewRows.push([
      rev.id,
      rev.chapterId,
      rev.name,
      rev.rating.toString(),
      rev.comment,
      rev.timestamp
    ]);
  });

  // 3. Export Bookmarks
  const bookmarkRows = [
    ['ID Bab', 'Halaman Terakhir (1-Indexed)']
  ];
  bookmarks.forEach(bm => {
    bookmarkRows.push([
      bm.chapterId,
      (bm.pageIndex + 1).toString()
    ]);
  });

  // We will perform a batch update values to overwrite sheets
  const body = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: "'Bab Novel'!A1:I1000",
        values: chapterRows
      },
      {
        range: "'Ulasan Pembaca'!A1:F1000",
        values: reviewRows
      },
      {
        range: "'Bookmark'!A1:B1000",
        values: bookmarkRows
      }
    ]
  };

  // Clear existing ranges first to prevent leftover rows
  for (const sheetName of ['Bab Novel', 'Ulasan Pembaca', 'Bookmark']) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/'${sheetName}'!A1:I1000:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  // Write new values
  const writeRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!writeRes.ok) {
    const errText = await writeRes.text();
    throw new Error(`Gagal mengunggah data ke Google Sheets: ${errText}`);
  }
}

// Import data from Google Sheets (Two-way sync)
export async function importFromGoogleSheets(accessToken: string): Promise<{
  chapters: Chapter[];
  reviews: Review[];
  bookmarks: Bookmark[];
}> {
  // Ensure the tabs exist (creates them if they don't, returning empty headers)
  await ensureSheetsExist(accessToken);

  // Fetch all sheets in parallel
  const ranges = ["'Bab Novel'!A2:I1000", "'Ulasan Pembaca'!A2:F1000", "'Bookmark'!A2:B1000"];
  const fetchPromises = ranges.map(range =>
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then(res => res.json())
  );

  const [chaptersData, reviewsData, bookmarksData] = await Promise.all(fetchPromises);

  // Parse Chapters
  const importedChapters: Chapter[] = [];
  if (chaptersData.values && chaptersData.values.length > 0) {
    chaptersData.values.forEach((row: any) => {
      if (!row[0]) return; // Skip empty rows
      const id = row[0];
      const number = parseInt(row[1]) || 1;
      const title = row[2] || 'Bab Tanpa Judul';
      const subtitle = row[3] || '';
      const summary = row[4] || '';
      const imageUrl = row[5] || '';
      const isLocked = row[6] ? row[6].includes('🔒') : true;
      const content = row[8] || '';

      // Split back pages using our delimiter
      const pages = content.split('\n--- HALAMAN BARU ---\n');

      importedChapters.push({
        id,
        number,
        title,
        subtitle,
        summary,
        imageUrl,
        isLocked,
        pages: pages.length > 0 && pages[0] !== '' ? pages : ['Teks kosong.']
      });
    });
  }

  // Parse Reviews
  const importedReviews: Review[] = [];
  if (reviewsData.values && reviewsData.values.length > 0) {
    reviewsData.values.forEach((row: any) => {
      if (!row[0]) return;
      importedReviews.push({
        id: row[0],
        chapterId: row[1],
        name: row[2] || 'Anonim',
        rating: parseInt(row[3]) || 5,
        comment: row[4] || '',
        timestamp: row[5] || new Date().toISOString()
      });
    });
  }

  // Parse Bookmarks
  const importedBookmarks: Bookmark[] = [];
  if (bookmarksData.values && bookmarksData.values.length > 0) {
    bookmarksData.values.forEach((row: any) => {
      if (!row[0]) return;
      importedBookmarks.push({
        chapterId: row[0],
        pageIndex: (parseInt(row[1]) || 1) - 1 // 1-indexed to 0-indexed
      });
    });
  }

  return {
    chapters: importedChapters,
    reviews: importedReviews,
    bookmarks: importedBookmarks
  };
}
