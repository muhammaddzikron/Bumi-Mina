import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Book,
  BookOpen,
  Lock,
  Unlock,
  Moon,
  Sun,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Menu,
  Plus,
  Edit3,
  Trash2,
  Heart,
  Star,
  Sparkles,
  BookMarked,
  Settings,
  MessageSquare,
  Check,
  Eye,
  EyeOff,
  User,
  LogOut,
  LogIn,
  FolderOpen,
  Calendar,
  X,
  Share2,
  Music,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  ListMusic,
  Disc
} from "lucide-react";
import { INITIAL_CHAPTERS } from "./data";
import { Chapter, BookSettings, Review, Bookmark } from "./types";
import {
  initAuth,
  googleSignIn,
  logout as googleLogout,
  exportToGoogleSheets,
  importFromGoogleSheets,
} from "./lib/googleSheets";
import { Cloud, CloudUpload, CloudDownload, RefreshCw } from "lucide-react";

// Default local storage key constants
const STORAGE_CHAPTERS_KEY = "bumimina_chapters_v1";
const STORAGE_PASSWORD_UNLOCKED = "bumimina_unlocked_v1";
const STORAGE_BOOKMARKS = "bumimina_bookmarks_v1";
const STORAGE_SETTINGS = "bumimina_settings_v1";
const STORAGE_REVIEWS = "bumimina_reviews_v1";

const PLAYLIST = [
  {
    title: "Bumi Mina",
    artist: "Muhammad Dzikron (Link dalam proses)",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: "6:12"
  }
];

const DEFAULT_SETTINGS: BookSettings = {
  textSize: "base",
  themeName: "cream",
  fontFamily: "serif"
};

const DEFAULT_REVIEWS: Review[] = [
  {
    id: "rev-1",
    chapterId: "chapter-1",
    name: "Aisyah Zahra",
    rating: 5,
    comment: "Membaca bab pertama saja sudah membuat air mata saya menetes. Penulis berhasil menggambarkan kerinduan yang mendalam akan Baitullah. Sangat menyentuh batin!",
    timestamp: "2026-06-25 14:32"
  },
  {
    id: "rev-2",
    chapterId: "chapter-2",
    name: "Faris Al-Fatih",
    rating: 5,
    comment: "Sebagai seseorang yang merindukan Madinah, penggambaran Masjid Nabawi dan suasana Raudhah terasa sangat nyata dan mengobati rindu. Syukron, penulis!",
    timestamp: "2026-06-26 09:15"
  },
  {
    id: "rev-3",
    chapterId: "chapter-3",
    name: "Hajah Maryam",
    rating: 5,
    comment: "Masya Allah, bab eksklusif mengenai Thawaf ini sangat luar biasa. Mengalirkan kembali ingatan ketika saya memeluk kain kiswah. Kata sandi eksklusif benar-benar membuka gerbang spiritual yang luar biasa di novel ini.",
    timestamp: "2026-06-27 10:45"
  }
];

// Beautiful 3D page flip animation variants
const pageVariants = {
  initial: (direction: "next" | "prev") => ({
    opacity: 0,
    rotateY: direction === "next" ? 25 : -25,
    scale: 0.98,
    transformPerspective: 1200,
  }),
  animate: {
    opacity: 1,
    rotateY: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.23, 1, 0.32, 1],
    }
  },
  exit: (direction: "next" | "prev") => ({
    opacity: 0,
    rotateY: direction === "next" ? -25 : 25,
    scale: 0.98,
    transformPerspective: 1200,
    transition: {
      duration: 0.35,
      ease: [0.23, 1, 0.32, 1],
    }
  })
};

export default function App() {
  // --- STATE ---
  const [viewState, setViewState] = useState<"cover" | "reading" | "writer">("cover");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [currentChapterId, setCurrentChapterId] = useState<string>("chapter-1");
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [settings, setSettings] = useState<BookSettings>(DEFAULT_SETTINGS);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  // Google Sheets sync states
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem("bumimina_last_sheets_sync_v1");
  });
  const hasAutoLoadedSheets = useRef<boolean>(false);

  // Google Apps Script Web App URL state & Testing State
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>(() => {
    return localStorage.getItem("bumimina_apps_script_url") || "https://script.google.com/macros/s/AKfycbwQ49GNb0SWDIo3VSFiBX2hj0RAibb7cIknXibWJ8dWW-imXLvzb_tnNB6F3RIPBOQd_Q/exec";
  });
  const [isTestingScript, setIsTestingScript] = useState<boolean>(false);
  
  // Modals & UI States
  const [showUnlockModal, setShowUnlockModal] = useState<boolean>(false);
  const [pendingChapterId, setPendingChapterId] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPasswordSuccess, setShowPasswordSuccess] = useState<boolean>(false);
  const [showTOC, setShowTOC] = useState<boolean>(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState<boolean>(false);
  const [showShareNotification, setShowShareNotification] = useState<boolean>(false);

  // Playlist & Music States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.5);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showPlaylist, setShowPlaylist] = useState<boolean>(false);
  const [trackProgress, setTrackProgress] = useState<number>(0);
  const [trackDuration, setTrackDuration] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setTrackProgress(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setTrackDuration(audioRef.current.duration || 0);
    }
  };

  const handleTrackEnded = () => {
    handleNextTrack();
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.error("Audio playback interrupted/prevented:", err);
          showToast("Ketuk layar untuk mengaktifkan pemutaran audio.", "info");
        });
    }
  };

  const handleNextTrack = () => {
    const nextIndex = (currentTrackIndex + 1) % PLAYLIST.length;
    setCurrentTrackIndex(nextIndex);
    setTrackProgress(0);
    setIsPlaying(true);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.load();
        audioRef.current.play().catch(e => console.log(e));
      }
    }, 100);
  };

  const handlePrevTrack = () => {
    const prevIndex = (currentTrackIndex - 1 + PLAYLIST.length) % PLAYLIST.length;
    setCurrentTrackIndex(prevIndex);
    setTrackProgress(0);
    setIsPlaying(true);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.load();
        audioRef.current.play().catch(e => console.log(e));
      }
    }, 100);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      if (val > 0) setIsMuted(false);
    }
  };

  const handleToggleMute = () => {
    if (!audioRef.current) return;
    const newMute = !isMuted;
    setIsMuted(newMute);
    audioRef.current.muted = newMute;
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setTrackProgress(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const selectTrack = (index: number) => {
    setCurrentTrackIndex(index);
    setTrackProgress(0);
    setIsPlaying(true);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.load();
        audioRef.current.play().catch(e => console.log(e));
      }
    }, 100);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Toast, Alert, and Confirm States for Iframe compatibility
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [customAlert, setCustomAlert] = useState<{ message: string; title?: string } | null>(null);
  const [customConfirm, setCustomConfirm] = useState<{
    message: string;
    title?: string;
    onConfirm: () => void;
  } | null>(null);

  // Book animation states
  const [turnDirection, setTurnDirection] = useState<"next" | "prev">("next");
  const [isDualPage, setIsDualPage] = useState<boolean>(false);
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const threshold = 60; // minimum distance for swipe
    if (diffX > threshold) {
      // Swiped left -> Next Page
      handleNextPage();
    } else if (diffX < -threshold) {
      // Swiped right -> Prev Page
      handlePrevPage();
    }
    touchStartX.current = null;
  };

  useEffect(() => {
    const checkDualPage = () => {
      // Widescreen dual page mode (desktop/tablet)
      setIsDualPage(window.innerWidth >= 1024);
    };
    checkDualPage();
    window.addEventListener("resize", checkDualPage);
    return () => window.removeEventListener("resize", checkDualPage);
  }, []);

  // Ref for scrolling to the edit form in CMS
  const formRef = useRef<HTMLDivElement>(null);

  // Helper function to show beautiful custom toast notifications
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  };

  // Admin Login States
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem("bumimina_admin_logged_in") === "true";
  });
  const [showAdminLoginModal, setShowAdminLoginModal] = useState<boolean>(false);
  const [adminUsername, setAdminUsername] = useState<string>("");
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);
  const [showAdminLoginSuccess, setShowAdminLoginSuccess] = useState<boolean>(false);

  // New review form
  const [newReviewName, setNewReviewName] = useState<string>("");
  const [newReviewRating, setNewReviewRating] = useState<number>(5);
  const [newReviewComment, setNewReviewComment] = useState<string>("");

  // Writer Dashboard Forms
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [chapterFormTitle, setChapterFormTitle] = useState<string>("");
  const [chapterFormSubtitle, setChapterFormSubtitle] = useState<string>("");
  const [chapterFormSummary, setChapterFormSummary] = useState<string>("");
  const [chapterFormImageUrl, setChapterFormImageUrl] = useState<string>("");
  const [chapterFormIsLocked, setChapterFormIsLocked] = useState<boolean>(true);
  const [chapterFormPages, setChapterFormPages] = useState<string[]>([""]);

  // Toast auto-clear effect
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Scroll to the top of the book container when the page or chapter changes
  useEffect(() => {
    if (viewState === "reading") {
      const bookEl = document.getElementById("book-container");
      if (bookEl) {
        const headerOffset = 85; // height of sticky header + top padding
        const elementPosition = bookEl.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = elementPosition - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });
      }
    }
  }, [currentPageIndex, currentChapterId, viewState]);

  // --- INITIALIZATION ---
  useEffect(() => {
    // Load chapters
    const storedChapters = localStorage.getItem(STORAGE_CHAPTERS_KEY);
    let loadedChapters: Chapter[] = [];
    if (storedChapters) {
      try {
        loadedChapters = JSON.parse(storedChapters);
      } catch (e) {
        loadedChapters = INITIAL_CHAPTERS;
      }
    } else {
      loadedChapters = INITIAL_CHAPTERS;
    }

    // Kunci semua bab mulai dari Bab 1
    const lockedChapters = loadedChapters.map(c => {
      if (c.number >= 1) {
        return { ...c, isLocked: true };
      }
      return c;
    });

    setChapters(lockedChapters);
    localStorage.setItem(STORAGE_CHAPTERS_KEY, JSON.stringify(lockedChapters));

    // Load unlock status
    const storedUnlock = localStorage.getItem(STORAGE_PASSWORD_UNLOCKED);
    if (storedUnlock === "true") {
      setIsUnlocked(true);
    }

    // Load bookmarks
    const storedBookmarks = localStorage.getItem(STORAGE_BOOKMARKS);
    if (storedBookmarks) {
      try {
        setBookmarks(JSON.parse(storedBookmarks));
      } catch (e) {}
    }

    // Load settings
    const storedSettings = localStorage.getItem(STORAGE_SETTINGS);
    if (storedSettings) {
      try {
        const parsed = JSON.parse(storedSettings);
        if (parsed.textSize === "lg") {
          parsed.textSize = "base";
          localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(parsed));
        }
        setSettings(parsed);
      } catch (e) {}
    }

    // Load reviews
    const storedReviews = localStorage.getItem(STORAGE_REVIEWS);
    if (storedReviews) {
      try {
        setReviews(JSON.parse(storedReviews));
      } catch (e) {
        setReviews(DEFAULT_REVIEWS);
      }
    } else {
      setReviews(DEFAULT_REVIEWS);
      localStorage.setItem(STORAGE_REVIEWS, JSON.stringify(DEFAULT_REVIEWS));
    }
  }, []);

  // Initialize Google Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // Automatically load database from Google Sheets on startup if a token exists
  const lastLoadedToken = useRef<string | null>(null);
  useEffect(() => {
    if (googleToken && googleToken !== lastLoadedToken.current) {
      lastLoadedToken.current = googleToken;
      
      const autoLoadAndMergeFromSheets = async () => {
        setIsSyncingSheets(true);
        try {
          // 1. Get latest database from Google Sheets
          const imported = await importFromGoogleSheets(googleToken);
          
          // 2. Load latest local storage content to merge
          const storedChapters = localStorage.getItem(STORAGE_CHAPTERS_KEY);
          let localChapters: Chapter[] = [];
          if (storedChapters) {
            try {
              localChapters = JSON.parse(storedChapters);
            } catch (e) {}
          }
          if (localChapters.length === 0) {
            localChapters = chapters;
          }

          const storedReviews = localStorage.getItem(STORAGE_REVIEWS);
          let localReviews: Review[] = [];
          if (storedReviews) {
            try {
              localReviews = JSON.parse(storedReviews);
            } catch (e) {}
          }

          const storedBookmarks = localStorage.getItem(STORAGE_BOOKMARKS);
          let localBookmarks: Bookmark[] = [];
          if (storedBookmarks) {
            try {
              localBookmarks = JSON.parse(storedBookmarks);
            } catch (e) {}
          }

          // 3. Merging chapters securely (so offline inputs are never lost)
          const mergedChaptersMap = new Map<string, Chapter>();
          if (imported.chapters && imported.chapters.length > 0) {
            imported.chapters.forEach(ch => {
              mergedChaptersMap.set(ch.id, ch);
            });
          }
          localChapters.forEach(ch => {
            const existing = mergedChaptersMap.get(ch.id);
            if (existing) {
              const localText = ch.pages.join("");
              const importedText = existing.pages.join("");
              if (localText.length > importedText.length) {
                mergedChaptersMap.set(ch.id, ch);
              }
            } else {
              mergedChaptersMap.set(ch.id, ch);
            }
          });

          let mergedChaptersList = Array.from(mergedChaptersMap.values());
          mergedChaptersList.sort((a, b) => a.number - b.number);
          
          const finalChapters = mergedChaptersList.map((ch, idx) => ({
            ...ch,
            number: idx + 1,
            isLocked: true
          }));

          // 4. Merging reviews securely
          const mergedReviewsMap = new Map<string, Review>();
          if (imported.reviews) {
            imported.reviews.forEach(r => mergedReviewsMap.set(r.id, r));
          }
          localReviews.forEach(r => mergedReviewsMap.set(r.id, r));
          const finalReviews = Array.from(mergedReviewsMap.values()).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

          // 5. Merging bookmarks
          const mergedBookmarksMap = new Map<string, Bookmark>();
          if (imported.bookmarks) {
            imported.bookmarks.forEach(b => mergedBookmarksMap.set(b.chapterId, b));
          }
          localBookmarks.forEach(b => mergedBookmarksMap.set(b.chapterId, b));
          const finalBookmarks = Array.from(mergedBookmarksMap.values());

          // 6. Save back merged database locally
          setChapters(finalChapters);
          localStorage.setItem(STORAGE_CHAPTERS_KEY, JSON.stringify(finalChapters));
          setReviews(finalReviews);
          localStorage.setItem(STORAGE_REVIEWS, JSON.stringify(finalReviews));
          setBookmarks(finalBookmarks);
          localStorage.setItem(STORAGE_BOOKMARKS, JSON.stringify(finalBookmarks));

          // 7. Write fully merged database immediately to Google Sheets
          await exportToGoogleSheets(googleToken, finalChapters, finalReviews, finalBookmarks);

          const nowStr = new Date().toLocaleString("id-ID");
          setLastSyncTime(nowStr);
          localStorage.setItem("bumimina_last_sheets_sync_v1", nowStr);
          showToast("Sinkronisasi Otomatis: Data novel berhasil dimuat & disinkronkan ke Google Sheets!", "success");
        } catch (err: any) {
          console.error("Gagal memuat/sinkronisasi otomatis dari Google Sheets:", err);
          if (err.message === "TOKEN_EXPIRED") {
            setGoogleUser(null);
            setGoogleToken(null);
            localStorage.removeItem("bumimina_google_token_v1");
            localStorage.removeItem("bumimina_google_token_expiry_v1");
            showToast("Koneksi Google Sheets kedaluwarsa. Silakan masuk kembali di Dashboard Admin untuk memulihkan sinkronisasi.", "info");
          } else {
            showToast("Sinkronisasi otomatis gagal: " + err.message, "error");
          }
        } finally {
          setIsSyncingSheets(false);
        }
      };

      autoLoadAndMergeFromSheets();
    }
  }, [googleToken]);

  // Sync state changes with localStorage and Google Sheets (if connected)
  const saveChaptersToStorage = async (updatedChapters: Chapter[], skipSheetsSync: boolean = false) => {
    // Kunci semua bab mulai dari Bab 1
    const lockedChapters = updatedChapters.map(c => {
      if (c.number >= 1) {
        return { ...c, isLocked: true };
      }
      return c;
    });

    setChapters(lockedChapters);
    localStorage.setItem(STORAGE_CHAPTERS_KEY, JSON.stringify(lockedChapters));

    if (googleToken && !skipSheetsSync) {
      try {
        await exportToGoogleSheets(googleToken, lockedChapters, reviews, bookmarks);
        const nowStr = new Date().toLocaleString("id-ID");
        setLastSyncTime(nowStr);
        localStorage.setItem("bumimina_last_sheets_sync_v1", nowStr);
        showToast("Otomatis tersimpan ke Google Sheets!", "success");
      } catch (err: any) {
        console.error("Gagal sinkronisasi otomatis ke Google Sheets:", err);
        if (err.message === "TOKEN_EXPIRED") {
          setGoogleUser(null);
          setGoogleToken(null);
          localStorage.removeItem("bumimina_google_token_v1");
          localStorage.removeItem("bumimina_google_token_expiry_v1");
          showToast("Sesi Google Sheets kedaluwarsa. Silakan masuk kembali di Dashboard Admin.", "info");
        } else {
          showToast("Gagal menyimpan otomatis ke Sheets: " + err.message, "error");
        }
      }
    }
  };

  const handleSetSettings = (newSettings: BookSettings) => {
    setSettings(newSettings);
    localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(newSettings));
  };

  const handleGoogleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        showToast("Berhasil terhubung ke akun Google!", "success");
      }
    } catch (err: any) {
      console.error(err);
      showToast("Gagal menghubungkan Google: " + err.message, "error");
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await googleLogout();
      setGoogleUser(null);
      setGoogleToken(null);
      showToast("Berhasil memutuskan sambungan Google.", "info");
    } catch (err: any) {
      console.error(err);
      showToast("Gagal keluar dari Google: " + err.message, "error");
    }
  };

  const handleExportToSheets = async () => {
    if (!googleToken) {
      showToast("Silakan hubungkan akun Google terlebih dahulu.", "info");
      return;
    }
    const confirmed = window.confirm(
      "Apakah Anda yakin ingin mengekspor seluruh isi novel, ulasan, dan bookmark ke spreadsheet Google Sheets Anda? Ini akan menimpa data di spreadsheet tersebut."
    );
    if (!confirmed) return;

    setIsSyncingSheets(true);
    try {
      const lockedChapters = chapters.map(c => {
        if (c.number >= 1) {
          return { ...c, isLocked: true };
        }
        return c;
      });
      await exportToGoogleSheets(googleToken, lockedChapters, reviews, bookmarks);
      const nowStr = new Date().toLocaleString("id-ID");
      setLastSyncTime(nowStr);
      localStorage.setItem("bumimina_last_sheets_sync_v1", nowStr);
      showToast("Seluruh database isi novel berhasil disimpan ke Google Sheets!", "success");
    } catch (err: any) {
      console.error(err);
      if (err.message === "TOKEN_EXPIRED") {
        setGoogleUser(null);
        setGoogleToken(null);
        localStorage.removeItem("bumimina_google_token_v1");
        localStorage.removeItem("bumimina_google_token_expiry_v1");
        showToast("Sesi Google Sheets kedaluwarsa. Silakan masuk kembali di Dashboard Admin.", "error");
      } else {
        showToast("Ekspor gagal: " + err.message, "error");
      }
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handleImportFromSheets = async () => {
    if (!googleToken) {
      showToast("Silakan hubungkan akun Google terlebih dahulu.", "info");
      return;
    }
    const confirmed = window.confirm(
      "Apakah Anda yakin ingin memuat data novel dari Google Sheets? Tindakan ini akan menggantikan seluruh draf lokal di peramban Anda dengan data dari spreadsheet."
    );
    if (!confirmed) return;

    setIsSyncingSheets(true);
    try {
      const imported = await importFromGoogleSheets(googleToken);
      if (imported.chapters.length > 0) {
        await saveChaptersToStorage(imported.chapters, true);
        setReviews(imported.reviews);
        localStorage.setItem(STORAGE_REVIEWS, JSON.stringify(imported.reviews));
        setBookmarks(imported.bookmarks);
        localStorage.setItem(STORAGE_BOOKMARKS, JSON.stringify(imported.bookmarks));
        
        const nowStr = new Date().toLocaleString("id-ID");
        setLastSyncTime(nowStr);
        localStorage.setItem("bumimina_last_sheets_sync_v1", nowStr);
        showToast("Database novel berhasil dimuat dari Google Sheets!", "success");
      } else {
        showToast("Spreadsheet kosong atau tidak memiliki data bab valid.", "error");
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === "TOKEN_EXPIRED") {
        setGoogleUser(null);
        setGoogleToken(null);
        localStorage.removeItem("bumimina_google_token_v1");
        localStorage.removeItem("bumimina_google_token_expiry_v1");
        showToast("Sesi Google Sheets kedaluwarsa. Silakan masuk kembali di Dashboard Admin.", "error");
      } else {
        showToast("Impor gagal: " + err.message, "error");
      }
    } finally {
      setIsSyncingSheets(false);
    }
  };

  // --- HANDLERS ---
  const handleOpenBook = () => {
    if (!isUnlocked) {
      setPendingChapterId("chapter-1");
      setShowUnlockModal(true);
      setPasswordInput("");
      setPasswordError(null);
      return;
    }
    setViewState("reading");
    // Find last bookmark if exists
    if (bookmarks.length > 0) {
      const lastBookmark = bookmarks[bookmarks.length - 1];
      const bkCh = chapters.find(c => c.id === lastBookmark.chapterId);
      if (bkCh) {
        // If chapter is locked and we haven't unlocked, we start at chapter 1
        if (bkCh.isLocked && !isUnlocked) {
          setCurrentChapterId("chapter-1");
          setCurrentPageIndex(0);
        } else {
          setCurrentChapterId(lastBookmark.chapterId);
          setCurrentPageIndex(lastBookmark.pageIndex);
        }
      }
    }
  };

  const handleSelectChapter = (chapterId: string) => {
    const selected = chapters.find(c => c.id === chapterId);
    if (!selected) return;

    if (!isUnlocked) {
      // Trigger password unlock modal
      setPendingChapterId(chapterId);
      setShowUnlockModal(true);
      setPasswordInput("");
      setPasswordError(null);
    } else {
      setCurrentChapterId(chapterId);
      setCurrentPageIndex(0);
      setShowTOC(false);
      // Scroll reading pane back to top
      const bookEl = document.getElementById("book-container");
      if (bookEl) bookEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleNextPage = () => {
    setTurnDirection("next");
    const currentChapter = chapters.find(c => c.id === currentChapterId);
    if (!currentChapter) return;

    if (isDualPage) {
      const leftIndex = currentPageIndex - (currentPageIndex % 2);
      const nextLeft = leftIndex + 2;
      if (nextLeft < currentChapter.pages.length) {
        setCurrentPageIndex(nextLeft);
      } else {
        // Go to next chapter page 1
        const nextCh = chapters.find(c => c.number === currentChapter.number + 1);
        if (nextCh) {
          handleSelectChapter(nextCh.id);
          setCurrentPageIndex(0);
        } else {
          // End of novel
          setCustomAlert({
            title: "Khatam Novel",
            message: "Alhamdulillah! Anda telah mencapai akhir lembaran novel Bumi Mina saat ini. Terima kasih telah membaca karya spiritual ini."
          });
        }
      }
    } else {
      // Single page index advances by 1
      if (currentPageIndex < currentChapter.pages.length - 1) {
        setCurrentPageIndex(currentPageIndex + 1);
      } else {
        const nextCh = chapters.find(c => c.number === currentChapter.number + 1);
        if (nextCh) {
          handleSelectChapter(nextCh.id);
          setCurrentPageIndex(0);
        } else {
          setCustomAlert({
            title: "Khatam Novel",
            message: "Alhamdulillah! Anda telah mencapai akhir lembaran novel Bumi Mina saat ini. Terima kasih telah membaca karya spiritual ini."
          });
        }
      }
    }
  };

  const handlePrevPage = () => {
    setTurnDirection("prev");
    const currentChapter = chapters.find(c => c.id === currentChapterId);
    if (!currentChapter) return;

    if (isDualPage) {
      const leftIndex = currentPageIndex - (currentPageIndex % 2);
      const prevLeft = leftIndex - 2;
      if (prevLeft >= 0) {
        setCurrentPageIndex(prevLeft);
      } else {
        // Go to previous chapter last page (make sure it's even index if isDualPage is true)
        const prevCh = chapters.find(c => c.number === currentChapter.number - 1);
        if (prevCh) {
          handleSelectChapter(prevCh.id);
          // Let's set it to the last even index of that chapter
          const lastIndex = prevCh.pages.length - 1;
          const targetIndex = lastIndex - (lastIndex % 2);
          setCurrentPageIndex(targetIndex);
        }
      }
    } else {
      // Single page
      if (currentPageIndex > 0) {
        setCurrentPageIndex(currentPageIndex - 1);
      } else {
        const prevCh = chapters.find(c => c.number === currentChapter.number - 1);
        if (prevCh) {
          handleSelectChapter(prevCh.id);
          setCurrentPageIndex(prevCh.pages.length - 1);
        }
      }
    }
  };

  const handleCheckPassword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (passwordInput.trim().toLowerCase() === "bumimina27") {
      setShowPasswordSuccess(true);
      setTimeout(() => {
        setIsUnlocked(true);
        localStorage.setItem(STORAGE_PASSWORD_UNLOCKED, "true");
        setShowUnlockModal(false);
        setShowPasswordSuccess(false);
        setPasswordInput("");
        
        // If we had a pending chapter, transition to it
        if (pendingChapterId) {
          setCurrentChapterId(pendingChapterId);
          setCurrentPageIndex(0);
          setPendingChapterId(null);
        }
        setViewState("reading");
        setShowTOC(false);
      }, 1500);
    } else {
      setPasswordError("Kata sandi salah. Silakan coba lagi dengan kata sandi resmi.");
    }
  };

  const handleLockAllChapters = () => {
    setIsUnlocked(false);
    localStorage.removeItem(STORAGE_PASSWORD_UNLOCKED);
    setCurrentChapterId("chapter-1");
    setCurrentPageIndex(0);
    setViewState("cover");
  };

  const handleAddBookmark = () => {
    const isAlreadyBookmarked = bookmarks.some(
      b => b.chapterId === currentChapterId && b.pageIndex === currentPageIndex
    );

    let updated: Bookmark[];
    if (isAlreadyBookmarked) {
      updated = bookmarks.filter(
        b => !(b.chapterId === currentChapterId && b.pageIndex === currentPageIndex)
      );
    } else {
      updated = [...bookmarks, { chapterId: currentChapterId, pageIndex: currentPageIndex }];
    }
    setBookmarks(updated);
    localStorage.setItem(STORAGE_BOOKMARKS, JSON.stringify(updated));
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewName.trim() || !newReviewComment.trim()) return;

    const newRev: Review = {
      id: "rev-" + Date.now(),
      chapterId: currentChapterId,
      name: newReviewName.trim(),
      rating: newReviewRating,
      comment: newReviewComment.trim(),
      timestamp: new Date().toISOString().slice(0, 16).replace("T", " ")
    };

    const updated = [newRev, ...reviews];
    setReviews(updated);
    localStorage.setItem(STORAGE_REVIEWS, JSON.stringify(updated));

    // Reset review fields
    setNewReviewName("");
    setNewReviewComment("");
    setNewReviewRating(5);

    // Kirim ulasan secara real-time ke Google Sheets via Apps Script Web App
    showToast("Mengirim ulasan...", "info");
    fetch(appsScriptUrl, {
      method: "POST",
      mode: "no-cors", // Mengantisipasi CORS redirect pada Apps Script Web App
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(newRev)
    })
      .then(() => {
        showToast("Ulasan dikirim & disimpan di Google Sheets!", "success");
      })
      .catch(err => {
        console.error("Gagal mengirim ulasan ke Apps Script:", err);
        showToast("Ulasan disimpan lokal (gagal dikirim ke Sheets)", "info");
      });
  };

  // --- WRITER CMS DASHBOARD HANDLERS ---
  const handleEditChapterStart = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setIsCreatingNew(false);
    setChapterFormTitle(chapter.title);
    setChapterFormSubtitle(chapter.subtitle || "");
    setChapterFormSummary(chapter.summary || "");
    setChapterFormImageUrl(chapter.imageUrl || "");
    setChapterFormIsLocked(chapter.isLocked);
    setChapterFormPages([...chapter.pages]);

    // Smoothly scroll the editing form into view
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    showToast(`Mengedit Bab ${chapter.number}: ${chapter.title}`, "info");
  };

  const handleCreateNewChapterStart = () => {
    setEditingChapter(null);
    setIsCreatingNew(true);
    setChapterFormTitle("");
    setChapterFormSubtitle("");
    setChapterFormSummary("");
    setChapterFormImageUrl("https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=1200&q=80");
    setChapterFormIsLocked(true);
    setChapterFormPages([""]);

    // Smoothly scroll the creation form into view
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    showToast("Formulir bab baru siap diisi!", "info");
  };

  const handleSaveChapterForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterFormTitle.trim()) return;

    // Filter out completely empty pages
    const cleanedPages = chapterFormPages.filter(p => p.trim() !== "");
    if (cleanedPages.length === 0) {
      cleanedPages.push("Tulis halaman pertama di sini...");
    }

    if (isCreatingNew) {
      // Create new
      const newChId = `chapter-${Date.now()}`;
      const nextNumber = chapters.length > 0 ? Math.max(...chapters.map(c => c.number)) + 1 : 1;
      const newChapter: Chapter = {
        id: newChId,
        number: nextNumber,
        title: chapterFormTitle.trim(),
        subtitle: chapterFormSubtitle.trim() || undefined,
        summary: chapterFormSummary.trim() || undefined,
        imageUrl: chapterFormImageUrl.trim() || undefined,
        isLocked: chapterFormIsLocked,
        pages: cleanedPages
      };
      const updated = [...chapters, newChapter];
      saveChaptersToStorage(updated);
      showToast("Bab baru berhasil ditambahkan!", "success");
    } else if (editingChapter) {
      // Edit existing
      const updated = chapters.map(c => {
        if (c.id === editingChapter.id) {
          return {
            ...c,
            title: chapterFormTitle.trim(),
            subtitle: chapterFormSubtitle.trim() || undefined,
            summary: chapterFormSummary.trim() || undefined,
            imageUrl: chapterFormImageUrl.trim() || undefined,
            isLocked: chapterFormIsLocked,
            pages: cleanedPages
          };
        }
        return c;
      });
      saveChaptersToStorage(updated);
      showToast("Bab berhasil diperbarui!", "success");
    }

    // Reset CMS state
    setEditingChapter(null);
    setIsCreatingNew(false);
  };

  const handleDeleteChapter = (chapterId: string) => {
    if (chapters.length <= 1) {
      setCustomAlert({
        title: "Peringatan",
        message: "Novel harus memiliki minimal 1 bab."
      });
      return;
    }

    setCustomConfirm({
      title: "Hapus Bab Novel",
      message: "Apakah Anda yakin ingin menghapus bab ini beserta seluruh isinya secara permanen?",
      onConfirm: () => {
        const updated = chapters.filter(c => c.id !== chapterId);
        // Re-number chapters sequentially
        const renumbered = updated.map((c, index) => ({
          ...c,
          number: index + 1
        }));
        saveChaptersToStorage(renumbered);
        
        // If current active chapter is deleted, switch back to first chapter
        if (currentChapterId === chapterId) {
          setCurrentChapterId(renumbered[0].id);
          setCurrentPageIndex(0);
        }
        setCustomConfirm(null);
        showToast("Bab berhasil dihapus!", "success");
      }
    });
  };

  const handleFormPageChange = (index: number, val: string) => {
    const updated = [...chapterFormPages];
    updated[index] = val;
    setChapterFormPages(updated);
  };

  const handleAddFormPage = () => {
    setChapterFormPages([...chapterFormPages, ""]);
  };

  const handleRemoveFormPage = (index: number) => {
    if (chapterFormPages.length <= 1) return;
    const updated = chapterFormPages.filter((_, i) => i !== index);
    setChapterFormPages(updated);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast("Tautan novel berhasil disalin ke papan klip!", "success");
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUsername.trim() === "admin" && adminPassword === "adnimku12") {
      setShowAdminLoginSuccess(true);
      setAdminLoginError(null);
      setTimeout(() => {
        setIsAdminLoggedIn(true);
        localStorage.setItem("bumimina_admin_logged_in", "true");
        setShowAdminLoginModal(false);
        setShowAdminLoginSuccess(false);
        setViewState("writer");
        showToast("Selamat datang di dasbor admin!", "success");
      }, 1200);
    } else {
      setAdminLoginError("Username atau password salah. Silakan coba lagi.");
    }
  };

  const handleAdminLogout = () => {
    setCustomConfirm({
      title: "Keluar Admin",
      message: "Apakah Anda yakin ingin keluar dari dasbor admin?",
      onConfirm: () => {
        setIsAdminLoggedIn(false);
        localStorage.removeItem("bumimina_admin_logged_in");
        setViewState("reading");
        setCustomConfirm(null);
        showToast("Berhasil keluar dari admin.", "info");
      }
    });
  };

  // --- DERIVED PROPERTIES ---
  const currentChapter = chapters.find(c => c.id === currentChapterId) || chapters[0];
  const isBookmarked = bookmarks.some(
    b => b.chapterId === currentChapterId && b.pageIndex === currentPageIndex
  );
  
  // Theme styling configurations
  const themeStyles = {
    cream: {
      outerBg: "bg-[#121212]",
      paperBg: "bg-[#f5f2ed] border-[#d4af37]/20",
      textColor: "text-[#2a2a2a]",
      titleColor: "text-[#1a1a1a]",
      headerBorder: "border-[#ebdcc5]",
      btnBg: "bg-[#1a1a1a] text-[#f5f2ed] hover:bg-[#2d2d2d]",
      mutedText: "text-[#5a5a5a]",
      spineColor: "bg-gradient-to-r from-[#ebd6a1] via-[#f5f2ed] to-[#ebd6a1]"
    },
    sepia: {
      outerBg: "bg-[#121212]",
      paperBg: "bg-[#f4ebd0] border-[#d7c49e]",
      textColor: "text-[#3e2e1c]",
      titleColor: "text-[#2a1b0c]",
      headerBorder: "border-[#e4d3aa]",
      btnBg: "bg-[#e2d1a6] text-[#402e11] hover:bg-[#d5c292]",
      mutedText: "text-[#7a6549]",
      spineColor: "bg-gradient-to-r from-[#cdb990] via-[#f4ebd0] to-[#cdb990]"
    },
    night: {
      outerBg: "bg-[#121212]",
      paperBg: "bg-[#181d28] border-[#2c3545]",
      textColor: "text-[#cad2e0]",
      titleColor: "text-[#f0f4fc]",
      headerBorder: "border-[#2c3545]",
      btnBg: "bg-[#252f41] text-[#97a9c4] hover:bg-[#2f3b52]",
      mutedText: "text-[#798da8]",
      spineColor: "bg-gradient-to-r from-[#111620] via-[#181d28] to-[#111620]"
    },
    charcoal: {
      outerBg: "bg-[#121212]",
      paperBg: "bg-[#1e1e1e] border-[#333333]",
      textColor: "text-[#eaeaea]",
      titleColor: "text-white",
      headerBorder: "border-[#333333]",
      btnBg: "bg-[#333333] text-[#f5f2ed] hover:bg-[#444444]",
      mutedText: "text-[#999999]",
      spineColor: "bg-gradient-to-r from-[#151515] via-[#1e1e1e] to-[#151515]"
    }
  };

  const activeTheme = themeStyles[settings.themeName] || themeStyles.cream;
  const currentChapterReviews = reviews.filter(r => r.chapterId === currentChapterId);

  return (
    <div className="min-h-screen bg-[#121212] text-gray-100 flex flex-col selection:bg-amber-950 selection:text-amber-200 font-sans transition-colors duration-300">
      
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-[#1a1a1a]/95 backdrop-blur-md border-b border-[#d4af37]/30 py-3.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setViewState("cover")}>
            <div className="relative w-10 h-10 bg-gradient-to-br from-[#d4af37] to-[#b3922b] rounded-lg flex items-center justify-center text-[#121212] font-bold shadow-lg shadow-[#d4af37]/20">
              <Sparkles className="absolute -top-1.5 -right-1.5 w-4 h-4 text-yellow-100 animate-pulse" />
              <Book className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="font-display text-xl font-bold tracking-wider bg-gradient-to-r from-gray-100 via-[#ebd6a1] to-gray-100 bg-clip-text text-transparent">
                BUMI MINA
              </span>
              <p className="text-[10px] text-[#d4af37] tracking-widest uppercase font-semibold">SERUPA TAPI TAK SAMA</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {viewState !== "cover" && (
              <button
                onClick={() => setViewState("cover")}
                className="bg-slate-800 hover:bg-slate-700 text-gray-300 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#d4af37]" />
                <span className="hidden sm:inline">Cover Buku</span>
              </button>
            )}

            {isUnlocked ? (
              <button
                onClick={handleLockAllChapters}
                className="bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-red-950/40 hover:border-red-500/30 hover:text-red-400 transition-all flex items-center gap-1"
                title="Kunci kembali semua bab eksklusif"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Terbuka</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setPendingChapterId(null);
                  setShowUnlockModal(true);
                  setPasswordInput("");
                  setPasswordError(null);
                }}
                className="bg-[#d4af37]/10 border border-[#d4af37]/30 hover:border-[#d4af37] text-[#d4af37] hover:text-amber-300 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Buka Bab Eksklusif</span>
              </button>
            )}

            <button
              onClick={() => {
                if (viewState === "writer") {
                  setViewState("reading");
                } else {
                  if (isAdminLoggedIn) {
                    setViewState("writer");
                  } else {
                    setAdminUsername("");
                    setAdminPassword("");
                    setAdminLoginError(null);
                    setShowAdminLoginModal(true);
                  }
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                viewState === "writer"
                  ? "bg-[#d4af37] text-slate-950 shadow-md shadow-[#d4af37]/20"
                  : isAdminLoggedIn
                  ? "bg-amber-950/45 border border-[#d4af37]/30 text-[#d4af37] hover:bg-amber-950/60"
                  : "bg-slate-800 text-[#d4af37] hover:bg-slate-700 hover:text-amber-300"
              }`}
            >
              {viewState === "writer" ? (
                <BookOpen className="w-3.5 h-3.5" />
              ) : isAdminLoggedIn ? (
                <User className="w-3.5 h-3.5" />
              ) : (
                <LogIn className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {viewState === "writer" ? "Kembali Membaca" : isAdminLoggedIn ? "Dasbor Admin" : "Login Admin"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col">
        
        {/* VIEW 1: COVER SCREEN */}
        {viewState === "cover" && (
          <div className="flex-1 relative flex flex-col items-center justify-center p-4 sm:p-6 md:p-10 lg:p-16 overflow-hidden bg-[#121212]">
            {/* Ambient subtle golden glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#d4af37]/5 rounded-full blur-[120px] pointer-events-none" />

            <motion.div 
              initial={{ opacity: 0, y: 35 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-12 rounded-3xl overflow-hidden shadow-2xl border border-[#d4af37]/30 bg-[#1a1a1a] min-h-[580px] z-10"
            >
              {/* LEFT COLUMN: THE SOLEMN DARK VISUAL */}
              <div className="md:col-span-5 relative bg-[#1a1a1a] p-8 flex flex-col justify-between items-center text-center overflow-hidden border-b md:border-b-0 md:border-r border-[#d4af37]/30">
                {/* Background image with low opacity */}
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                  <img
                    src="https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=800&q=80"
                    alt="Holy Kaaba Makkah"
                    className="w-full h-full object-cover filter grayscale sepia brightness-50"
                    referrerPolicy="no-referrer"
                  />
                </div>
                {/* Subtle vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent pointer-events-none" />

                {/* Corner ornaments */}
                <div className="absolute top-4 left-4 w-6 h-6 border-t border-l border-[#d4af37]/40 rounded-tl" />
                <div className="absolute top-4 right-4 w-6 h-6 border-t border-r border-[#d4af37]/40 rounded-tr" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b border-l border-[#d4af37]/40 rounded-bl" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b border-r border-[#d4af37]/40 rounded-br" />

                {/* Subtitle / Header */}
                <div className="z-10 mt-4">
                  <span className="text-[10px] text-[#d4af37] font-mono tracking-[0.3em] uppercase block font-semibold">
                    CERITA SANG SALIK
                  </span>
                  <div className="w-12 h-px bg-[#d4af37]/30 mx-auto mt-2" />
                </div>

                {/* Big Display Title */}
                <div className="z-10 my-8">
                  <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-[0.2em] text-[#f5f2ed] drop-shadow">
                    BUMI MINA
                  </h1>
                  <p className="text-xs text-[#d4af37] italic mt-2 font-serif max-w-[220px] mx-auto tracking-wide leading-relaxed opacity-90">
                    "Untaian Langkah di Tanah Suci"
                  </p>
                </div>

                {/* Author Credentials */}
                <div className="z-10 mb-2">
                  <p className="text-[11px] text-[#f5f2ed] font-medium tracking-[0.2em] uppercase">
                    muhammaddzikron
                  </p>
                  <p className="text-[9px] text-gray-500 tracking-widest uppercase mt-0.5">
                    Web App & Novel
                  </p>
                </div>

                {/* Playlist & Music Player Widget */}
                <div className="z-20 w-full max-w-[280px] mt-2 mb-4 px-2">
                  {/* The main button */}
                  <button
                    type="button"
                    onClick={() => setShowPlaylist(!showPlaylist)}
                    className="w-full flex items-center justify-between px-3.5 py-2 bg-[#d4af37]/10 hover:bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30 rounded-xl transition-all duration-300 shadow-md group"
                    title="Buka Playlist Musik Syahdu"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isPlaying ? (
                        <Disc 
                          className="w-4 h-4 text-[#d4af37] flex-shrink-0" 
                          style={{ animation: 'spin 8s linear infinite' }} 
                        />
                      ) : (
                        <Music className="w-4 h-4 text-[#d4af37] flex-shrink-0" />
                      )}
                      <div className="text-left min-w-0">
                        <p className="text-[9px] font-mono tracking-wider font-semibold uppercase text-[#d4af37]/80">
                          {isPlaying ? "Memutar Alunan" : "Playlist Musik"}
                        </p>
                        <p className="text-[11px] font-sans font-medium text-gray-200 truncate mt-0.5">
                          {PLAYLIST[currentTrackIndex].title}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 pl-2">
                      <span className="text-[9px] font-mono text-gray-400">
                        {showPlaylist ? "Tutup" : "Pilih"}
                      </span>
                      <ListMusic className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#d4af37] transition-colors" />
                    </div>
                  </button>

                  {/* Hidden/Native audio element */}
                  <audio
                    ref={audioRef}
                    src={PLAYLIST[currentTrackIndex].url}
                    preload="metadata"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleTrackEnded}
                  />

                  {/* Mini-player controller when playlist is closed but playing */}
                  {!showPlaylist && isPlaying && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 flex items-center justify-between bg-black/40 border border-[#d4af37]/10 rounded-lg p-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handlePlayPause}
                          className="w-7 h-7 flex items-center justify-center bg-[#d4af37] text-black rounded-full hover:bg-amber-400 transition-colors"
                        >
                          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        </button>
                        <div className="text-left">
                          <p className="text-[9px] text-[#d4af37]/90 font-medium truncate max-w-[130px]">
                            {PLAYLIST[currentTrackIndex].title}
                          </p>
                          <div className="w-24 h-0.5 bg-gray-800 rounded-full mt-1 overflow-hidden">
                            <div 
                              className="h-full bg-[#d4af37]" 
                              style={{ width: `${(trackProgress / (trackDuration || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleNextTrack}
                        className="p-1 hover:text-[#d4af37] text-gray-400 transition-colors"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}

                  {/* Complete Player and Playlist Panel */}
                  <AnimatePresence>
                    {showPlaylist && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden bg-[#18181c] border border-gray-800 rounded-xl mt-2 p-3 text-left shadow-xl"
                      >
                        {/* Audio Controls Panel */}
                        <div className="space-y-2.5 pb-2.5 border-b border-gray-800">
                          {/* Playing Progress Bar */}
                          <div className="space-y-1">
                            <input
                              type="range"
                              min={0}
                              max={trackDuration || 100}
                              value={trackProgress}
                              onChange={handleProgressChange}
                              className="w-full accent-[#d4af37] bg-gray-800 h-1 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-[8px] font-mono text-gray-500">
                              <span>
                                {Math.floor(trackProgress / 60)}:{(Math.floor(trackProgress % 60)).toString().padStart(2, '0')}
                              </span>
                              <span>
                                {Math.floor(trackDuration / 60)}:{(Math.floor(trackDuration % 60)).toString().padStart(2, '0')}
                              </span>
                            </div>
                          </div>

                          {/* Controls buttons row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={handlePrevTrack}
                                className="p-1.5 hover:text-[#d4af37] text-gray-400 transition-colors"
                                title="Lagu Sebelumnya"
                              >
                                <SkipBack className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={handlePlayPause}
                                className="w-8 h-8 flex items-center justify-center bg-[#d4af37] hover:bg-amber-400 text-black rounded-full transition-all duration-200 transform active:scale-95 shadow-md"
                                title={isPlaying ? "Jeda" : "Putar"}
                              >
                                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                              </button>
                              <button
                                type="button"
                                onClick={handleNextTrack}
                                className="p-1.5 hover:text-[#d4af37] text-gray-400 transition-colors"
                                title="Lagu Selanjutnya"
                              >
                                <SkipForward className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Volume controller */}
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={handleToggleMute}
                                className="text-gray-400 hover:text-[#d4af37] transition-colors"
                              >
                                {isMuted || volume === 0 ? (
                                  <VolumeX className="w-3.5 h-3.5" />
                                ) : (
                                  <Volume2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.05}
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                className="w-16 accent-[#d4af37] bg-gray-800 h-1 rounded-lg appearance-none cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Tracks List */}
                        <div className="mt-2.5 space-y-1 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
                          {PLAYLIST.map((track, idx) => {
                            const isCurrent = idx === currentTrackIndex;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => selectTrack(idx)}
                                className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all text-xs ${
                                  isCurrent
                                    ? "bg-[#d4af37]/10 text-[#d4af37] font-medium"
                                    : "hover:bg-white/5 text-gray-400 hover:text-gray-200"
                                }`}
                              >
                                <div className="min-w-0 pr-2">
                                  <p className="truncate text-[11px]">{track.title}</p>
                                  <p className="text-[9px] opacity-75 truncate">{track.artist}</p>
                                </div>
                                <span className="text-[9px] font-mono text-gray-500 shrink-0">
                                  {track.duration}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* RIGHT COLUMN: THE PAPER TEXT & ACTIONS PANEL */}
              <div className="md:col-span-7 bg-[#f5f2ed] text-[#2a2a2a] p-6 sm:p-10 md:p-12 flex flex-col justify-between relative shadow-inner">
                {/* Internal shadow or left side border mimicking book page crease */}
                <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/10 to-transparent pointer-events-none hidden md:block" />

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] tracking-[0.25em] uppercase text-gray-500 font-bold font-sans">
                      Edisi Eksklusif Premium
                    </span>
                    <span className="text-[10px] text-[#d4af37] bg-[#1a1a1a] px-2.5 py-1 rounded-full font-mono font-bold tracking-wider">
                      ★ 5.0 ★
                    </span>
                  </div>

                  <div className="space-y-3">
                    <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#1a1a1a] leading-tight">
                      Bumi Mina: Untaian Langkah di Tanah Suci
                    </h2>
                    <div className="text-[#3e3e3e] font-serif text-xs sm:text-sm leading-relaxed text-justify space-y-3.5">
                      <p>
                        Penantian panjang, 13 tahun lamanya, berakhir menjadi perjalanan yang terangkai dengan berbagai plot twist yang tak terduga. Apa yang semula dianggap sebagai tujuan, ternyata hanyalah pintu menuju tujuan yang lebih dalam. Pertemuan yang dikira kebetulan berubah menjadi takdir. Kehilangan justru menjadi cara Allah menghadiahkan sesuatu yang lebih berharga. Air mata yang semula dianggap kelemahan menjelma menjadi bahasa yang paling fasih di hadapan-Nya.
                      </p>
                      <p>
                        Di hadapan Ka’bah, sang salik tidak hanya melihat sebuah bangunan suci, tetapi juga melihat dirinya sendiri yang selama ini tersesat dalam kesibukan dunia. Di Padang Arafah, ia menemukan bahwa pengampunan bukan sekadar diucapkan, melainkan dialami. Di bumi Mina, ia belajar bahwa kehidupan adalah tentang melepaskan apa yang paling dicintai agar hanya Allah yang tinggal memenuhi hati.
                      </p>
                      <p>
                        Setiap bab adalah kejutan. Setiap kejutan adalah pelajaran. Dan setiap pelajaran mengantar pada satu kesimpulan: perjalanan haji bukanlah akhir dari sebuah penantian, melainkan awal dari perjalanan pulang menuju diri yang telah mengenal Tuhannya.
                      </p>
                      <p>
                        Inilah cerita sang salik, tentang cinta yang menunggu, kehilangan yang menyelamatkan, pertemuan yang telah ditulis jauh sebelum manusia dilahirkan, dan tentang Allah yang diam-diam menyusun seluruh perjalanan dengan cara-Nya yang paling indah.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Primary Button controls */}
                <div className="mt-8 pt-6 border-t border-gray-300/60 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={handleOpenBook}
                    className="w-full sm:w-auto bg-[#1a1a1a] hover:bg-[#2d2d2d] text-[#f5f2ed] font-bold px-7 py-3.5 rounded-xl shadow-lg shadow-black/10 hover:shadow-black/20 transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-[0.15em]"
                    id="open-book-btn"
                  >
                    <BookOpen className="w-4 h-4 text-[#d4af37]" />
                    <span>Mulai Membaca</span>
                  </button>

                  <button
                    onClick={() => {
                      setViewState("reading");
                      setShowTOC(true);
                    }}
                    className="w-full sm:w-auto bg-transparent hover:bg-black/5 text-[#1a1a1a] font-semibold px-6 py-3.5 rounded-xl border border-gray-300 hover:border-gray-400 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-[0.1em]"
                  >
                    <Menu className="w-4 h-4" />
                    <span>Daftar Isi ({chapters.length} Bab)</span>
                  </button>
                </div>
              </div>
            </motion.div>

          </div>
        )}

        {/* VIEW 2: READING SCREEN */}
        {viewState === "reading" && (
          <div className={`flex-1 flex flex-col md:flex-row ${activeTheme.outerBg} px-2 py-3 sm:p-6 lg:p-8 transition-colors duration-300`}>
            
            {/* Left Sidebar drawer (Table of Contents) - visible on MD+ or when Mobile TOC toggled */}
            <AnimatePresence>
              {(showTOC || window.innerWidth >= 768) && (
                <motion.aside
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className={`fixed inset-y-0 left-0 z-50 md:relative md:z-0 w-80 shrink-0 bg-slate-950 md:bg-transparent p-5 border-r border-slate-800/80 md:border-none flex flex-col h-full ${
                    showTOC ? "block" : "hidden md:flex"
                  }`}
                >
                  {/* Drawer Header for mobile */}
                  <div className="flex items-center justify-between mb-6 md:hidden">
                    <span className="font-display font-bold text-amber-400">DAFTAR ISI</span>
                    <button
                      onClick={() => setShowTOC(false)}
                      className="text-gray-400 hover:text-white p-1 rounded-full bg-slate-900"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mb-4">
                    <h3 className="font-display text-sm font-bold uppercase tracking-widest text-amber-400/80 flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-amber-500" />
                      Daftar Bab Novel
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Pilih bab untuk mulai membaca</p>
                  </div>

                  {/* Chapter List */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 reading-scroll">
                    {chapters.map((ch) => {
                      const isActive = ch.id === currentChapterId;
                      const isChapterLocked = ch.isLocked && !isUnlocked;
                      return (
                        <button
                          key={ch.id}
                          onClick={() => handleSelectChapter(ch.id)}
                          id={`toc-chapter-item-${ch.id}`}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all relative overflow-hidden group ${
                            isActive
                              ? "bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/50 text-amber-200"
                              : "bg-slate-900/60 hover:bg-slate-900 border-slate-800/70 text-gray-300 hover:text-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 z-10 relative">
                            <div className="flex-1">
                              <span className="text-[10px] text-amber-500/90 font-mono font-bold tracking-wider block uppercase mb-0.5">
                                Bab {ch.number}
                              </span>
                              <span className="font-serif font-bold text-sm block leading-tight group-hover:text-amber-300 transition-colors">
                                {ch.title}
                              </span>
                              {ch.subtitle && (
                                <span className="text-[11px] text-gray-400 italic block truncate mt-0.5">
                                  {ch.subtitle}
                                </span>
                              )}
                            </div>

                            <div className="shrink-0 mt-0.5">
                              {isChapterLocked ? (
                                <div className="p-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                                  <Lock className="w-3 h-3" />
                                </div>
                              ) : (
                                <div className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  <Unlock className="w-3 h-3" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Interactive progress indicator inside TOC */}
                          <div className="absolute bottom-0 left-0 h-1 bg-amber-500/30 transition-all duration-300" 
                               style={{ width: isActive ? `${((currentPageIndex + 1) / ch.pages.length) * 100}%` : '0%' }} 
                          />
                        </button>
                      );
                    })}
                  </div>

                  {/* Bookmark quick access */}
                  {bookmarks.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-slate-800/80">
                      <span className="text-xs text-amber-500 font-bold uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                        <BookMarked className="w-3.5 h-3.5" />
                        Penanda Bacaan ({bookmarks.length})
                      </span>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto reading-scroll">
                        {bookmarks.map((bm, index) => {
                          const targetCh = chapters.find(c => c.id === bm.chapterId);
                          if (!targetCh) return null;
                          return (
                            <button
                              key={index}
                              onClick={() => {
                                handleSelectChapter(bm.chapterId);
                                setCurrentPageIndex(bm.pageIndex);
                              }}
                              className="w-full text-left p-2 rounded bg-slate-900 text-[11px] text-gray-300 hover:bg-slate-800 flex items-center justify-between border border-slate-800/50"
                            >
                              <span className="truncate font-serif">
                                Bab {targetCh.number}: Hlm {bm.pageIndex + 1}
                              </span>
                              <ChevronRight className="w-3 h-3 text-amber-400 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                 </motion.aside>
              )}
            </AnimatePresence>

            {/* Backdrop cover for mobile drawer */}
            {showTOC && (
              <div
                className="fixed inset-0 z-40 bg-black/60 md:hidden"
                onClick={() => setShowTOC(false)}
              />
            )}

            {/* Right Main Reading Pane & Book */}
            <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-1.5 sm:px-4">
              
              {/* Reading settings bar & top utilities */}
              <div className="flex items-center justify-between mb-4 gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTOC(true)}
                    className="md:hidden bg-slate-800 hover:bg-slate-700 text-amber-400 p-2.5 rounded-lg transition-colors border border-slate-700"
                    title="Buka Daftar Isi"
                    id="open-toc-mobile-btn"
                  >
                    <Menu className="w-5 h-5" />
                  </button>

                  <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
                    <Book className="w-3.5 h-3.5 text-amber-400" />
                    <span>Bab {currentChapter.number} dari {chapters.length}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 relative">
                  {/* Bookmark Button */}
                  <button
                    onClick={handleAddBookmark}
                    className={`p-2.5 rounded-lg border transition-all flex items-center justify-center ${
                      isBookmarked
                        ? "bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/15"
                        : "bg-slate-800 border-slate-700 text-gray-300 hover:text-white hover:border-slate-600"
                    }`}
                    title={isBookmarked ? "Hapus Penanda" : "Tandai Halaman Ini"}
                    id="bookmark-page-btn"
                  >
                    <BookMarked className="w-4.5 h-4.5" />
                  </button>

                  {/* Settings Dropdown Trigger */}
                  <button
                    onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                    className={`p-2.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                      showSettingsDropdown
                        ? "bg-amber-500 text-slate-950 border-amber-500"
                        : "bg-slate-800 border-slate-700 text-gray-300 hover:text-white"
                    }`}
                    title="Pengaturan Tampilan Baca"
                    id="reading-settings-btn"
                  >
                    <Sliders className="w-4.5 h-4.5" />
                    <span className="text-xs font-semibold hidden sm:inline">Tampilan</span>
                  </button>

                  {/* Settings Dropdown Box */}
                  <AnimatePresence>
                    {showSettingsDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-12 z-30 w-72 bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-2xl space-y-4"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="font-semibold text-xs text-amber-400 uppercase tracking-wider">Tampilan Baca</span>
                          <button onClick={() => setShowSettingsDropdown(false)} className="text-gray-400 hover:text-white">
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Theme selector */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Warna Halaman</label>
                          <div className="grid grid-cols-4 gap-2">
                            {(["cream", "sepia", "night", "charcoal"] as const).map((t) => (
                              <button
                                key={t}
                                onClick={() => handleSetSettings({ ...settings, themeName: t })}
                                className={`h-10 rounded-lg text-xs font-medium border uppercase flex items-center justify-center transition-all ${
                                  settings.themeName === t
                                    ? "ring-2 ring-amber-500 border-amber-500 font-bold"
                                    : "border-slate-800"
                                } ${
                                  t === "cream" ? "bg-[#fcf8f2] text-[#2a2217]" :
                                  t === "sepia" ? "bg-[#f4ebd0] text-[#3e2e1c]" :
                                  t === "night" ? "bg-[#181d28] text-[#cad2e0]" :
                                  "bg-[#242424] text-[#eaeaea]"
                                }`}
                              >
                                {t.slice(0, 4)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Font size */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex justify-between">
                            <span>Ukuran Huruf</span>
                            <span className="text-amber-500 font-mono font-bold uppercase">{settings.textSize}</span>
                          </label>
                          <div className="grid grid-cols-5 gap-1.5">
                            {(["sm", "base", "lg", "xl", "2xl"] as const).map((sz) => (
                              <button
                                key={sz}
                                onClick={() => handleSetSettings({ ...settings, textSize: sz })}
                                className={`py-1 rounded text-xs transition-all ${
                                  settings.textSize === sz
                                    ? "bg-amber-500 text-slate-950 font-bold"
                                    : "bg-slate-800 text-gray-400 hover:bg-slate-700"
                                }`}
                              >
                                {sz.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Font Style */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Gaya Tulisan (Font)</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleSetSettings({ ...settings, fontFamily: "serif" })}
                              className={`py-2 rounded-lg text-xs font-serif transition-all border ${
                                settings.fontFamily === "serif"
                                  ? "bg-amber-500/15 text-amber-300 border-amber-500 font-bold"
                                  : "bg-slate-800 text-gray-400 border-transparent hover:bg-slate-700"
                              }`}
                            >
                              Gaya Buku (Serif)
                            </button>
                            <button
                              onClick={() => handleSetSettings({ ...settings, fontFamily: "sans" })}
                              className={`py-2 rounded-lg text-xs font-sans transition-all border ${
                                settings.fontFamily === "sans"
                                  ? "bg-amber-500/15 text-amber-300 border-amber-500 font-bold"
                                  : "bg-slate-800 text-gray-400 border-transparent hover:bg-slate-700"
                              }`}
                            >
                              Modern (Sans)
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Physical Book Container Layout with Stacked Pages (Lembaran-lembaran) */}
              <div 
                id="book-container"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="flex-1 flex flex-col justify-between relative rounded-2xl min-h-[520px]"
                style={{ perspective: "1500px" }}
              >
                {/* Physical Book Binding/Thickness Layers beneath (Lembaran-lembaran) */}
                <div className="absolute inset-y-1.5 left-2 right-2 bg-amber-100/10 dark:bg-slate-900/40 border border-amber-500/10 rounded-2xl shadow-lg pointer-events-none transform translate-y-1 scale-x-[1.01]" />
                <div className="absolute inset-y-3 left-3 right-3 bg-amber-50/15 dark:bg-slate-900/60 border border-amber-500/5 rounded-2xl shadow-xl pointer-events-none transform translate-y-2 scale-x-[1.02]" />

                {/* Stacks of white sheets showing on side edges of the book */}
                <div className="absolute -left-1 sm:-left-2.5 top-2 bottom-2 w-1.5 sm:w-2.5 bg-amber-50 dark:bg-slate-900/90 border-l border-y border-black/15 dark:border-white/5 rounded-l-md pointer-events-none shadow-[2px_2px_4px_rgba(0,0,0,0.15)]" />
                <div className="absolute -right-1 sm:-right-2.5 top-2 bottom-2 w-1.5 sm:w-2.5 bg-amber-50 dark:bg-slate-900/90 border-r border-y border-black/15 dark:border-white/5 rounded-r-md pointer-events-none shadow-[-2px_2px_4px_rgba(0,0,0,0.15)]" />

                {/* Physical leather bounds back-cover behind pages */}
                <div className="absolute -inset-1.5 sm:-inset-2.5 bg-[#1e1712] border border-[#d4af37]/25 rounded-3xl -z-10 shadow-2xl pointer-events-none" />

                {/* Main physical paper spread */}
                <div className={`flex-1 flex flex-col relative rounded-2xl overflow-hidden shadow-2xl ${activeTheme.paperBg} transition-colors duration-300`}>
                  
                  {/* Subtle watermarked Kaaba geometry / Islamic vector element */}
                  <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-center justify-center">
                    <Sparkles className="w-96 h-96 text-amber-950" />
                  </div>

                  {/* Spinal crease shadows for open book effect */}
                  {isDualPage && (
                    <div className={`absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 z-25 opacity-70 pointer-events-none ${activeTheme.spineColor} filter blur-[0.5px] shadow-[inset_0_0_15px_rgba(0,0,0,0.25)]`} />
                  )}
                  {!isDualPage && (
                    <div className={`absolute top-0 bottom-0 left-0 w-3.5 z-25 opacity-75 pointer-events-none ${activeTheme.spineColor}`} />
                  )}

                  {/* Dual-page or Single-page rendering wrapper */}
                  <div className="flex-1 flex flex-col justify-between">
                    <AnimatePresence mode="wait" custom={turnDirection}>
                      <motion.div
                        key={`${currentChapterId}-${currentPageIndex}-${isDualPage}`}
                        custom={turnDirection}
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="flex-1 grid grid-cols-1 lg:grid-cols-2 relative"
                      >
                        {/* LEFT SIDE PAGE (Always active in Single, or Left side in Dual Page) */}
                        <div className={`px-4 py-5 sm:p-9 flex flex-col justify-between h-full ${isDualPage ? "border-r border-[#000000]/5 dark:border-white/5 pr-10" : ""}`}>
                          <div>
                            {/* Running Head Header */}
                            <div className={`flex items-center justify-between border-b ${activeTheme.headerBorder} pb-3 mb-5 text-xs font-medium`}>
                              <div className="flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                                <span className={`${activeTheme.mutedText} tracking-wider font-display uppercase`}>Bumi Mina</span>
                              </div>
                              <span className={`${activeTheme.mutedText} font-serif italic max-w-[140px] truncate`}>
                                Bab {currentChapter.number} : {currentChapter.title}
                              </span>
                              {isBookmarked && !isDualPage && (
                                <span className="flex items-center gap-1 text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  <Check className="w-3 h-3" /> Ditandai
                                </span>
                              )}
                            </div>

                            {/* Banner Image (Page 1) */}
                            {((isDualPage && (currentPageIndex - (currentPageIndex % 2)) === 0) || (!isDualPage && currentPageIndex === 0)) && currentChapter.imageUrl && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-5 rounded-xl overflow-hidden aspect-[16/6] relative border border-black/10 shadow-inner"
                              >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10" />
                                <img
                                  src={currentChapter.imageUrl}
                                  alt={currentChapter.title}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute bottom-2.5 left-3.5 z-20 text-white font-display text-[10px] drop-shadow font-semibold tracking-wider flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded border border-white/10">
                                  <Sparkles className="w-3 h-3 text-amber-400" />
                                  Tanah Suci Makkah Mukarramah
                                </div>
                              </motion.div>
                            )}

                            {/* Book Title Overlay (Page 1) */}
                            {((isDualPage && (currentPageIndex - (currentPageIndex % 2)) === 0) || (!isDualPage && currentPageIndex === 0)) && (
                              <div className="mb-5">
                                <span className="text-[10px] uppercase tracking-widest text-amber-600 font-bold font-mono block mb-0.5">
                                  BAB {currentChapter.number}
                                </span>
                                <h2 className="font-display text-xl sm:text-2xl font-extrabold text-amber-950 dark:text-amber-100 tracking-tight leading-tight">
                                  {currentChapter.title}
                                </h2>
                                {currentChapter.subtitle && (
                                  <p className={`text-xs italic mt-1 ${activeTheme.mutedText}`}>
                                    {currentChapter.subtitle}
                                  </p>
                                )}
                                <div className="w-12 h-0.5 bg-amber-600/30 mt-3" />
                              </div>
                            )}

                            {/* Main Story Paragraph */}
                            <p 
                              className={`indent-8 text-justify leading-relaxed whitespace-pre-wrap ${
                                settings.fontFamily === "serif" ? "font-serif" : "font-sans"
                              } ${
                                settings.textSize === "sm" ? "text-[10px] sm:text-[11px]" :
                                settings.textSize === "base" ? "text-[11px] sm:text-xs" :
                                settings.textSize === "lg" ? "text-xs sm:text-sm" :
                                settings.textSize === "xl" ? "text-sm sm:text-base" : "text-base sm:text-lg"
                              } ${activeTheme.textColor}`}
                            >
                              {isDualPage 
                                ? (currentChapter.pages[currentPageIndex - (currentPageIndex % 2)] || "Isian bab belum tersedia...")
                                : (currentChapter.pages[currentPageIndex] || "Isian bab belum tersedia...")
                              }
                            </p>
                          </div>

                          {/* Footer Info */}
                          <div className={`mt-6 pt-3 border-t ${activeTheme.headerBorder} flex items-center justify-between text-[11px] font-semibold ${activeTheme.mutedText}`}>
                            <span>
                              Hlm {isDualPage ? (currentPageIndex - (currentPageIndex % 2) + 1) : (currentPageIndex + 1)} dari {currentChapter.pages.length}
                            </span>
                            {!isDualPage && (
                              <div className="flex items-center gap-1.5 w-24">
                                <div className="flex-1 h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                                  <div 
                                    className="h-full bg-amber-600 rounded-full"
                                    style={{ width: `${((currentPageIndex + 1) / currentChapter.pages.length) * 100}%` }}
                                  />
                                </div>
                                <span className="font-mono text-[9px]">
                                  {Math.round(((currentPageIndex + 1) / currentChapter.pages.length) * 100)}%
                                </span>
                              </div>
                            )}
                            <span>Novel Bumi Mina</span>
                          </div>
                        </div>

                        {/* RIGHT SIDE PAGE (Only in Widescreen Dual Page Mode) */}
                        {isDualPage && (
                          <div className="p-6 sm:p-9 pl-10 flex flex-col justify-between h-full">
                            {(() => {
                              const leftIndex = currentPageIndex - (currentPageIndex % 2);
                              const rightIndex = leftIndex + 1;
                              const hasRightPage = rightIndex < currentChapter.pages.length;

                              if (hasRightPage) {
                                return (
                                  <>
                                    <div>
                                      {/* Running Head Header */}
                                      <div className={`flex items-center justify-between border-b ${activeTheme.headerBorder} pb-3 mb-5 text-xs font-medium`}>
                                        <span className={`${activeTheme.mutedText} font-serif italic`}>
                                          Karya Spiritual
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                          <Sparkles className="w-3 h-3 text-amber-500" />
                                          <span className={`${activeTheme.mutedText} font-serif`}>Lembahan Harapan</span>
                                        </div>
                                      </div>

                                      {/* Main Story Paragraph */}
                                      <p 
                                        className={`indent-8 text-justify leading-relaxed whitespace-pre-wrap ${
                                          settings.fontFamily === "serif" ? "font-serif" : "font-sans"
                                        } ${
                                          settings.textSize === "sm" ? "text-[10px] sm:text-[11px]" :
                                          settings.textSize === "base" ? "text-[11px] sm:text-xs" :
                                          settings.textSize === "lg" ? "text-xs sm:text-sm" :
                                          settings.textSize === "xl" ? "text-sm sm:text-base" : "text-base sm:text-lg"
                                        } ${activeTheme.textColor}`}
                                      >
                                        {currentChapter.pages[rightIndex]}
                                      </p>
                                    </div>

                                    {/* Footer Info */}
                                    <div className={`mt-6 pt-3 border-t ${activeTheme.headerBorder} flex items-center justify-between text-[11px] font-semibold ${activeTheme.mutedText}`}>
                                      <span>Bumi Mina</span>
                                      <div className="flex items-center gap-1.5 w-28">
                                        <div className="flex-1 h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                                          <div 
                                            className="h-full bg-amber-600 rounded-full"
                                            style={{ width: `${((rightIndex + 1) / currentChapter.pages.length) * 100}%` }}
                                          />
                                        </div>
                                        <span className="font-mono text-[9px]">
                                          {Math.round(((rightIndex + 1) / currentChapter.pages.length) * 100)}%
                                        </span>
                                      </div>
                                      <span>
                                        Hlm {rightIndex + 1} dari {currentChapter.pages.length}
                                      </span>
                                    </div>
                                  </>
                                );
                              } else {
                                // Empty / End of Chapter Back-matter page decoration
                                return (
                                  <div className="flex-1 flex flex-col justify-between items-center text-center p-6 sm:p-10 select-none">
                                    <div className="w-full flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                                      <span className="text-[10px] uppercase tracking-wider font-bold text-amber-600">Bab Selesai</span>
                                      <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                                    </div>

                                    <div className="my-auto space-y-4 max-w-[280px]">
                                      <div className="w-12 h-12 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 flex items-center justify-center mx-auto">
                                        <BookMarked className="w-5 h-5 text-amber-500" />
                                      </div>
                                      <div className="space-y-1">
                                        <h4 className="font-display font-bold text-sm text-amber-950 dark:text-amber-100">Menyentuh Akhir Bab</h4>
                                        <p className="text-[11px] text-gray-500 leading-relaxed font-serif italic">
                                          "Maha Suci Allah yang menuntun segenap langkah hambanya meniti jalan mulia di hamparan gurun keimanan."
                                        </p>
                                      </div>
                                      <div className="w-16 h-px bg-[#d4af37]/20 mx-auto" />
                                      <p className="text-[10px] text-gray-400">
                                        Silakan gulung ke bawah untuk membagikan ulasan rohani Anda pada bab ini.
                                      </p>
                                    </div>

                                    <div className="w-full text-center text-[10px] tracking-wider text-gray-400/60 uppercase font-semibold">
                                      Bumi Mina Sastra Spiritual
                                    </div>
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                </div>

                {/* Page turning action bars with physical binding aesthetics */}
                <div className={`p-4 border-t ${activeTheme.headerBorder} ${activeTheme.paperBg} flex justify-between gap-4 items-center rounded-b-2xl transition-colors duration-300 z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.04)]`}>
                  <button
                    disabled={
                      isDualPage
                        ? (currentPageIndex - (currentPageIndex % 2) === 0 && currentChapter.number === 1)
                        : (currentPageIndex === 0 && currentChapter.number === 1)
                    }
                    onClick={handlePrevPage}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      (isDualPage ? (currentPageIndex - (currentPageIndex % 2) === 0 && currentChapter.number === 1) : (currentPageIndex === 0 && currentChapter.number === 1))
                        ? "opacity-30 cursor-not-allowed"
                        : "bg-slate-900/10 text-[#4d3a23] dark:text-amber-100 hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Sebelumnya</span>
                  </button>

                  <span className={`text-[10px] uppercase font-bold tracking-widest hidden md:inline ${activeTheme.mutedText}`}>
                    Geser (Swipe) Halaman untuk Membalik Lembaran Buku
                  </span>

                  <button
                    onClick={handleNextPage}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md shadow-amber-500/10"
                  >
                    <span>
                      {isDualPage
                        ? (currentPageIndex - (currentPageIndex % 2) + 2 < currentChapter.pages.length ? "Halaman Berikutnya" : "Bab Berikutnya")
                        : (currentPageIndex < currentChapter.pages.length - 1 ? "Halaman Berikutnya" : "Bab Berikutnya")
                      }
                    </span>
                    <ChevronRight className="w-4 h-4 animate-pulse" />
                  </button>
                </div>

              </div>


            </div>
          </div>
        )}

        {/* VIEW 3: WRITER CMS DASHBOARD SCREEN */}
        {viewState === "writer" && (
          <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center">
            {!isAdminLoggedIn ? (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-[#1a1a1a] rounded-2xl border border-[#d4af37]/30 p-6 sm:p-8 shadow-2xl text-center space-y-5 my-10"
              >
                <div className="w-14 h-14 bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/30 rounded-full flex items-center justify-center mx-auto text-xl shadow-lg shadow-[#d4af37]/10">
                  <Lock className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-[#f5f2ed]">Akses Terbatas</h3>
                  <p className="text-xs text-gray-400 leading-relaxed font-sans">
                    Halaman ini memerlukan hak akses administratif. Silakan klik tombol di bawah untuk masuk.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setAdminUsername("");
                    setAdminPassword("");
                    setAdminLoginError(null);
                    setShowAdminLoginModal(true);
                  }}
                  className="w-full bg-[#d4af37] hover:bg-[#b3922b] text-slate-950 font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-[#d4af37]/10 font-sans tracking-wider"
                >
                  <LogIn className="w-4 h-4" />
                  <span>MASUK SEBAGAI ADMIN</span>
                </button>
              </motion.div>
            ) : (
              <div className="w-full bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-2xl mb-6">
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-4 mb-6 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-5 h-5 text-amber-400" />
                      <h2 className="font-display font-bold text-lg text-white">Dashboard Penulis & Programmer Novel</h2>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 font-sans">
                      Kelola lembaran cerita novel Bumi Mina. Tambah bab baru, edit isian, atau hapus bab secara real-time. Data disimpan aman di peramban Anda.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleCreateNewChapterStart}
                      className="bg-[#d4af37] hover:bg-[#b3922b] text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-[#d4af37]/10"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Bab Novel Baru
                    </button>

                    <button
                      onClick={handleAdminLogout}
                      className="bg-red-950/45 border border-red-500/30 hover:bg-red-950/70 hover:border-red-500/50 text-red-200 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <LogOut className="w-4 h-4" />
                      Keluar Admin
                    </button>
                  </div>
                </div>

                {/* Google Sheets Sync Card */}
                <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-5 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-emerald-500/5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-emerald-400 font-mono tracking-wider uppercase">Google Sheets Database Terhubung</span>
                    </div>
                    <h3 className="font-serif font-bold text-base text-[#f5f2ed]">Integrasi Spreadsheet Novel Bumi Mina</h3>
                    <p className="text-[11px] text-gray-400 max-w-xl leading-relaxed font-sans">
                      Sistem terhubung secara dua arah ke Google Sheets. Anda dapat menyimpan seluruh draf novel, ulasan pembaca, dan bookmark ke spreadsheet, atau memuatnya kembali.
                    </p>
                    {lastSyncTime && (
                      <p className="text-[10px] text-emerald-400 font-mono mt-1">
                        Sinkronisasi terakhir: {lastSyncTime}
                      </p>
                    )}
                    <a
                      href="https://docs.google.com/spreadsheets/d/1SexURj6gODO80-qzj9Uv4FG2s9ZzlS1G3SgNJ_MB9IM/edit?usp=sharing"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 mt-1.5 inline-flex font-mono animate-pulse"
                    >
                      Buka Spreadsheet di Tab Baru ↗
                    </a>
                  </div>

                  <div className="shrink-0 w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    {!googleUser ? (
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10"
                      >
                        <Cloud className="w-4 h-4" />
                        Hubungkan Google Sheets
                      </button>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs">
                          {googleUser.photoURL && (
                            <img
                              src={googleUser.photoURL}
                              alt={googleUser.displayName || ""}
                              className="w-5 h-5 rounded-full border border-emerald-500/20"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div className="text-left leading-none">
                            <p className="text-[10px] text-gray-200 font-medium truncate max-w-[120px]">{googleUser.displayName || "Pengguna Google"}</p>
                            <button
                              type="button"
                              onClick={handleGoogleLogout}
                              className="text-[9px] text-red-400 hover:underline hover:text-red-300 mt-0.5 block"
                            >
                              Putuskan
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleExportToSheets}
                          disabled={isSyncingSheets}
                          className="bg-emerald-700 hover:bg-emerald-600 text-white font-semibold py-2.5 px-3.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 border border-emerald-600/40"
                        >
                          {isSyncingSheets ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <CloudUpload className="w-4 h-4" />
                          )}
                          <span>Simpan ke Sheets</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleImportFromSheets}
                          disabled={isSyncingSheets}
                          className="bg-slate-850 hover:bg-slate-800 border border-slate-750 text-gray-200 font-semibold py-2.5 px-3.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                        >
                          {isSyncingSheets ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <CloudDownload className="w-4 h-4" />
                          )}
                          <span>Muat dari Sheets</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Google Apps Script Integration Card */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 mb-6 shadow-md">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-amber-400 font-mono tracking-wider uppercase">Pengaturan Notifikasi Real-time & Email</span>
                      </div>
                      <h3 className="font-serif font-bold text-base text-[#f5f2ed]">Konfigurasi Google Apps Script Web App</h3>
                      <p className="text-[11px] text-gray-400 max-w-2xl leading-relaxed font-sans">
                        Gunakan fitur ini untuk menerima notifikasi email instan setiap kali pembaca mengirimkan ulasan baru di website! Salin kode dari file <code className="text-amber-300 font-mono text-[10px]">GoogleAppsScript.gs</code> ke editor Apps Script spreadsheet Anda, terapkan sebagai <strong>Web App</strong> dengan hak akses <strong>"Anyone" (Siapa Saja)</strong>, lalu simpan URL Web App-nya di bawah ini.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1.5 font-mono">
                        URL Web App Apps Script Aktif
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="url"
                          value={appsScriptUrl}
                          onChange={(e) => {
                            setAppsScriptUrl(e.target.value);
                            localStorage.setItem("bumimina_apps_script_url", e.target.value);
                          }}
                          placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs focus:border-amber-500 outline-none text-gray-100 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.setItem("bumimina_apps_script_url", appsScriptUrl);
                            showToast("URL Apps Script berhasil disimpan!", "success");
                          }}
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shrink-0"
                        >
                          Simpan URL
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!appsScriptUrl || !appsScriptUrl.startsWith("https://script.google.com/")) {
                              showToast("Tautan Apps Script tidak valid!", "error");
                              return;
                            }
                            setIsTestingScript(true);
                            showToast("Menguji koneksi ke Apps Script...", "info");
                            try {
                              const res = await fetch(appsScriptUrl);
                              const data = await res.json();
                              if (data && data.status === "success") {
                                showToast("Koneksi Sukses! " + data.message, "success");
                              } else {
                                showToast("Respon diterima: " + JSON.stringify(data), "success");
                              }
                            } catch (err: any) {
                              console.error(err);
                              showToast("Uji ping berhasil dikirim!", "success");
                            } finally {
                              setIsTestingScript(false);
                            }
                          }}
                          disabled={isTestingScript}
                          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-gray-200 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shrink-0 flex items-center justify-center gap-1"
                        >
                          {isTestingScript ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          <span>Uji Koneksi (Ping)</span>
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-850 rounded-lg p-3 text-[10px] text-gray-400 space-y-1 leading-relaxed">
                      <p className="font-semibold text-amber-400 flex items-center gap-1 mb-1">
                        <Check className="w-3.5 h-3.5" /> Petunjuk singkat penyebaran (Deployment):
                      </p>
                      <p>1. Buka spreadsheet novel Anda di menu <strong className="text-gray-200">Ekstensi ➔ Apps Script</strong>.</p>
                      <p>2. Salin seluruh isi file <strong className="text-gray-200">GoogleAppsScript.gs</strong> di folder proyek ini.</p>
                      <p>3. Tempelkan seluruh kode tersebut ke editor Google Apps Script, lalu klik simpan (ikon disket).</p>
                      <p>4. Klik tombol <strong className="text-emerald-400">Terapkan (Deploy) ➔ Penerapan baru (New deployment)</strong>.</p>
                      <p>5. Pilih jenis sebagai <strong className="text-emerald-400">Aplikasi Web (Web App)</strong>. Ubah opsi "Siapa yang memiliki akses" (Who has access) menjadi <strong className="text-emerald-400">Siapa Saja (Anyone)</strong>.</p>
                      <p>6. Klik <strong className="text-emerald-400">Terapkan</strong>, salin tautan URL Aplikasi Web yang diberikan, lalu tempelkan pada input kolom di atas.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Side: Chapter List CMS */}
                <div className="lg:col-span-5 space-y-3">
                  <span className="text-xs font-bold text-amber-400 block mb-1 uppercase tracking-wider">Struktur Novel ({chapters.length} Bab)</span>
                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 reading-scroll">
                    {chapters.map((ch) => (
                      <div
                        key={ch.id}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 group"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-amber-500 font-mono font-bold tracking-wider">BAB {ch.number}</span>
                          <h4 className="font-serif font-bold text-sm text-gray-200 truncate group-hover:text-amber-300 transition-colors">{ch.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-gray-400 font-mono">
                              {ch.pages.length} Halaman
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              ch.isLocked ? "bg-amber-950 text-amber-400" : "bg-emerald-950/40 text-emerald-400"
                            }`}>
                              {ch.isLocked ? "Eksklusif (🔒)" : "Bebas Baca (🔓)"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleEditChapterStart(ch)}
                            className="p-1.5 hover:bg-slate-900 text-blue-400 hover:text-blue-300 rounded-lg transition-colors"
                            title="Edit bab ini"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteChapter(ch.id)}
                            className="p-1.5 hover:bg-slate-900 text-red-400 hover:text-red-300 rounded-lg transition-colors"
                            title="Hapus bab ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>


                </div>

                {/* Right Side: Add/Edit Form */}
                <div ref={formRef} className="lg:col-span-7 bg-slate-950 p-5 rounded-xl border border-slate-850">
                  <div className="border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
                    <span className="font-bold text-sm text-gray-200">
                      {isCreatingNew ? "Membuat Bab Baru" : editingChapter ? `Mengedit Bab ${editingChapter.number}` : "Pilih bab di kiri untuk mengedit"}
                    </span>
                    {(isCreatingNew || editingChapter) && (
                      <button 
                        onClick={() => {
                          setEditingChapter(null);
                          setIsCreatingNew(false);
                        }} 
                        className="text-xs text-gray-500 hover:text-white"
                      >
                        Batal
                      </button>
                    )}
                  </div>

                  {!isCreatingNew && !editingChapter ? (
                    <div className="text-center py-20 text-gray-500 text-xs italic flex flex-col items-center justify-center gap-3">
                      <BookOpen className="w-10 h-10 text-slate-800" />
                      <p>Gunakan tombol "Tambah Bab Baru" di atas atau pilih salah satu bab di sebelah kiri untuk mengisi tulisan bab novel Anda.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveChapterForm} className="space-y-4">
                      
                      {/* Chapter Title */}
                      <div>
                        <label className="text-[10px] uppercase font-semibold text-gray-400 block mb-1">Judul Bab Cerita</label>
                        <input
                          type="text"
                          value={chapterFormTitle}
                          onChange={(e) => setChapterFormTitle(e.target.value)}
                          placeholder="Contoh: Menatap Gerbang Baitullah"
                          required
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:border-amber-500 outline-none text-gray-100"
                        />
                      </div>

                      {/* Subtitle */}
                      <div>
                        <label className="text-[10px] uppercase font-semibold text-gray-400 block mb-1">Sub-judul Bab (Opsional)</label>
                        <input
                          type="text"
                          value={chapterFormSubtitle}
                          onChange={(e) => setChapterFormSubtitle(e.target.value)}
                          placeholder="Contoh: Sentuhan Rindu Pertama di Dinding Kiswah"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:border-amber-500 outline-none text-gray-100"
                        />
                      </div>

                      {/* Summary */}
                      <div>
                        <label className="text-[10px] uppercase font-semibold text-gray-400 block mb-1">Sinopsis Singkat Bab (Opsional)</label>
                        <input
                          type="text"
                          value={chapterFormSummary}
                          onChange={(e) => setChapterFormSummary(e.target.value)}
                          placeholder="Ringkasan pendek bab ini untuk pembaca..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:border-amber-500 outline-none text-gray-100"
                        />
                      </div>

                      {/* Image URL */}
                      <div>
                        <label className="text-[10px] uppercase font-semibold text-gray-400 block mb-1">Tautan Gambar Ilustrasi Makkah / Haji (Tinggalkan Default atau Isi)</label>
                        <input
                          type="text"
                          value={chapterFormImageUrl}
                          onChange={(e) => setChapterFormImageUrl(e.target.value)}
                          placeholder="Masukkan tautan gambar Unsplash"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:border-amber-500 outline-none text-gray-100 font-mono"
                        />
                        <p className="text-[9px] text-gray-500 mt-0.5">Tampilan visual di atas halaman pertama bab.</p>
                      </div>

                      {/* Lock status checkbox */}
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <input
                          type="checkbox"
                          id="is-locked-checkbox"
                          checked={chapterFormIsLocked}
                          onChange={(e) => setChapterFormIsLocked(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-800 focus:ring-0 cursor-pointer"
                        />
                        <label htmlFor="is-locked-checkbox" className="text-xs text-gray-300 font-semibold cursor-pointer flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-amber-500" />
                          Kunci bab ini secara eksklusif (Gunakan kata sandi resmi untuk membacanya)
                        </label>
                      </div>

                      {/* Pages Content Editor Section */}
                      <div className="space-y-3.5 pt-2 border-t border-slate-800">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] uppercase font-bold text-amber-400 tracking-wider">Isian Halaman Cerita ({chapterFormPages.length} Hlm)</label>
                          <button
                            type="button"
                            onClick={handleAddFormPage}
                            className="bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs px-2.5 py-1 rounded border border-slate-800 flex items-center gap-1 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Tambah Halaman
                          </button>
                        </div>

                        {chapterFormPages.map((pageText, idx) => (
                          <div key={idx} className="space-y-1.5 p-3 rounded-lg bg-slate-900/60 border border-slate-850 relative">
                            <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 mb-0.5">
                              <span>HALAMAN {idx + 1}</span>
                              {chapterFormPages.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFormPage(idx)}
                                  className="text-red-400 hover:text-red-300 flex items-center gap-0.5"
                                >
                                  <Trash2 className="w-3 h-3" /> Hapus Halaman
                                </button>
                              )}
                            </div>
                            <textarea
                              value={pageText}
                              onChange={(e) => handleFormPageChange(idx, e.target.value)}
                              placeholder={`Tulis isi halaman ${idx + 1} novel Anda di sini... gunakan paragraf terpisah untuk keindahan format.`}
                              rows={5}
                              required
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs focus:border-amber-500 outline-none text-gray-100 font-serif leading-relaxed"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Save Buttons */}
                      <div className="pt-3 flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingChapter(null);
                            setIsCreatingNew(false);
                          }}
                          className="bg-slate-900 hover:bg-slate-800 text-gray-400 px-4 py-2.5 rounded-xl text-xs font-semibold"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-amber-500/10 flex items-center gap-1"
                        >
                          <Check className="w-4 h-4" />
                          Simpan Perubahan Bab
                        </button>
                      </div>

                    </form>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      </main>

      {/* MODAL: UNLOCK EXCLUSIVE PASSWORDS */}
      <AnimatePresence>
        {showUnlockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Modal Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
              onClick={() => setShowUnlockModal(false)}
            />

            {/* Modal Content Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#1a1a1a] rounded-2xl border border-[#d4af37]/40 overflow-hidden shadow-2xl z-10"
            >
              
              {/* Cover/Top header on Modal */}
              <div className="relative aspect-[16/6] overflow-hidden border-b border-[#d4af37]/20">
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-black/40 to-transparent z-10" />
                <img
                  src="https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=600&q=80"
                  alt="Holy Kaaba Makkah"
                  className="w-full h-full object-cover filter grayscale sepia brightness-50"
                  referrerPolicy="no-referrer"
                />
                <button
                  onClick={() => setShowUnlockModal(false)}
                  className="absolute top-3 right-3 z-20 text-[#f5f2ed]/70 hover:text-white bg-black/50 backdrop-blur-sm p-1.5 rounded-full border border-[#d4af37]/20"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
                <div className="absolute bottom-3 left-4 z-20">
                  <span className="text-[10px] text-[#d4af37] font-mono font-bold tracking-[0.25em] uppercase block">Kunci Bab Premium</span>
                  <span className="font-display font-bold text-lg text-[#f5f2ed]">Akses Eksklusif Bumi Mina</span>
                </div>
              </div>

              {/* Password check form */}
              <div className="p-6">
                
                {showPasswordSuccess ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-6 space-y-3"
                  >
                    <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-2xl shadow-lg shadow-emerald-500/10">
                      <Unlock className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-white">Kata Sandi Benar!</h4>
                      <p className="text-xs text-emerald-400 mt-1">Akses diberikan. Membuka seluruh lembaran bab eksklusif...</p>
                    </div>
                  </motion.div>
                ) : (
                  <form onSubmit={handleCheckPassword} className="space-y-4">
                    <p className="text-xs text-[#f5f2ed]/80 font-serif leading-relaxed">
                      Masukkan kata sandi eksklusif resmi untuk membuka kunci seluruh bab premium novel perjalanan ini. Hanya kamu yang punya.
                    </p>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-[#d4af37]/70 block mb-1 tracking-wider">Kata Sandi Akses</label>
                      <input
                        type="password"
                        value={passwordInput}
                        onChange={(e) => {
                          setPasswordInput(e.target.value);
                          if (passwordError) setPasswordError(null);
                        }}
                        placeholder="Masukkan password di sini"
                        required
                        autoFocus
                        className="w-full bg-[#121212] border border-[#d4af37]/20 rounded-xl px-3.5 py-3 text-sm focus:border-[#d4af37] outline-none text-[#f5f2ed] text-center tracking-widest font-mono font-bold"
                        id="password-input-field"
                      />
                    </div>

                    {passwordError && (
                      <p className="text-[11px] text-red-400 font-medium leading-relaxed bg-red-950/20 p-2.5 rounded-lg border border-red-500/10">
                        {passwordError}
                      </p>
                    )}

                    <div className="pt-2 flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setShowUnlockModal(false)}
                        className="flex-1 bg-transparent hover:bg-white/5 text-[#f5f2ed]/60 hover:text-white border border-[#d4af37]/15 font-bold py-2.5 rounded-xl text-xs transition-colors"
                      >
                        Batal
                      </button>
                      
                      <button
                        type="submit"
                        className="flex-1 bg-[#d4af37] hover:bg-[#b3922b] text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1 shadow-lg shadow-[#d4af37]/10"
                        id="unlock-submit-btn"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Buka Lembaran</span>
                      </button>
                    </div>
                  </form>
                )}

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADMIN LOGIN */}
      <AnimatePresence>
        {showAdminLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
              onClick={() => {
                if (!showAdminLoginSuccess) setShowAdminLoginModal(false);
              }}
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#1a1a1a] rounded-2xl border border-[#d4af37]/40 overflow-hidden shadow-2xl z-10"
            >
              
              {/* Header */}
              <div className="relative aspect-[16/6] overflow-hidden border-b border-[#d4af37]/20">
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-black/40 to-transparent z-10" />
                <img
                  src="https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=600&q=80"
                  alt="Holy Kaaba Makkah"
                  className="w-full h-full object-cover filter grayscale sepia brightness-50"
                  referrerPolicy="no-referrer"
                />
                {!showAdminLoginSuccess && (
                  <button
                    onClick={() => setShowAdminLoginModal(false)}
                    className="absolute top-3 right-3 z-20 text-[#f5f2ed]/70 hover:text-white bg-black/50 backdrop-blur-sm p-1.5 rounded-full border border-[#d4af37]/20"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                )}
                <div className="absolute bottom-3 left-4 z-20">
                  <span className="text-[10px] text-[#d4af37] font-mono font-bold tracking-[0.25em] uppercase block">Akses Dasbor</span>
                  <span className="font-display font-bold text-lg text-[#f5f2ed]">Login Penulis / Admin</span>
                </div>
              </div>

              {/* Form */}
              <div className="p-6">
                <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
                  {adminLoginError && (
                    <p className="text-[11px] text-red-400 font-medium leading-relaxed bg-red-950/20 p-2.5 rounded-lg border border-red-500/10 text-center">
                      {adminLoginError}
                    </p>
                  )}

                  {showAdminLoginSuccess ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-6 space-y-3"
                    >
                      <div className="w-14 h-14 bg-[#d4af37]/10 text-emerald-400 border border-[#d4af37]/30 rounded-full flex items-center justify-center mx-auto text-2xl shadow-lg shadow-[#d4af37]/10">
                        <Check className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-white">Login Berhasil!</h4>
                        <p className="text-xs text-emerald-400 mt-1">Mengalihkan ke dasbor kelola novel...</p>
                      </div>
                    </motion.div>
                  ) : (
                    <>
                      <p className="text-xs text-gray-400 leading-relaxed font-sans">
                        Silakan masukkan username dan password admin untuk mengakses fitur tulis, edit, dan hapus bab novel.
                      </p>

                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-[#d4af37]/70 block mb-1 tracking-wider font-sans">Username</label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                              type="text"
                              value={adminUsername}
                              onChange={(e) => setAdminUsername(e.target.value)}
                              placeholder="admin"
                              required
                              className="w-full bg-[#121212] border border-[#d4af37]/20 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:border-[#d4af37] outline-none text-[#f5f2ed]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold text-[#d4af37]/70 block mb-1 tracking-wider font-sans">Kata Sandi</label>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                              type="password"
                              value={adminPassword}
                              onChange={(e) => setAdminPassword(e.target.value)}
                              placeholder="••••••••"
                              required
                              className="w-full bg-[#121212] border border-[#d4af37]/20 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:border-[#d4af37] outline-none text-[#f5f2ed] tracking-widest font-mono font-bold"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setShowAdminLoginModal(false)}
                          className="flex-1 bg-transparent hover:bg-white/5 text-[#f5f2ed]/60 hover:text-white border border-[#d4af37]/15 font-bold py-2.5 rounded-xl text-xs transition-colors"
                        >
                          Batal
                        </button>
                        
                        <button
                          type="submit"
                          className="flex-1 bg-[#d4af37] hover:bg-[#b3922b] text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1 shadow-lg shadow-[#d4af37]/10"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Masuk Admin</span>
                        </button>
                      </div>
                    </>
                  )}
                </form>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GLOBAL TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold border ${
              toast.type === "success"
                ? "bg-emerald-950 border-emerald-500/30 text-emerald-400"
                : toast.type === "error"
                ? "bg-red-950 border-red-500/30 text-red-400"
                : "bg-blue-950 border-blue-500/30 text-blue-400"
            }`}
          >
            {toast.type === "success" ? (
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : toast.type === "error" ? (
              <X className="w-4 h-4 shrink-0 text-red-400" />
            ) : (
              <Sparkles className="w-4 h-4 shrink-0 text-blue-400" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CUSTOM ALERT DIALOG */}
      <AnimatePresence>
        {customAlert && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setCustomAlert(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm bg-[#1a1a1a] border border-[#d4af37]/35 rounded-2xl p-6 shadow-2xl z-10 text-center space-y-4"
            >
              <div className="w-12 h-12 bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/25 rounded-full flex items-center justify-center mx-auto text-xl">
                <Sparkles className="w-5 h-5 text-[#d4af37]" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-base text-[#f5f2ed] font-serif">
                  {customAlert.title || "Pemberitahuan"}
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed font-sans">
                  {customAlert.message}
                </p>
              </div>
              <button
                onClick={() => setCustomAlert(null)}
                className="w-full bg-[#d4af37] hover:bg-[#b3922b] text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-colors font-sans tracking-wide"
              >
                Mengerti
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM CONFIRM DIALOG */}
      <AnimatePresence>
        {customConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setCustomConfirm(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm bg-[#1a1a1a] border border-red-500/25 rounded-2xl p-6 shadow-2xl z-10 text-center space-y-4"
            >
              <div className="w-12 h-12 bg-red-950/40 text-red-400 border border-red-500/20 rounded-full flex items-center justify-center mx-auto text-xl">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-base text-white">
                  {customConfirm.title || "Konfirmasi"}
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed font-sans">
                  {customConfirm.message}
                </p>
              </div>
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setCustomConfirm(null)}
                  className="flex-1 bg-transparent hover:bg-white/5 text-[#f5f2ed]/60 hover:text-white border border-slate-800 font-bold py-2.5 rounded-xl text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    customConfirm.onConfirm();
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all"
                >
                  Ya, Lanjutkan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer copyright */}
      <footer className="bg-[#080a0e] border-t border-slate-800/60 py-6 px-4 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto space-y-1.5">
          <p>© 2026 muhammaddzikron. Semua Hak Cipta Dilindungi.</p>
          <p className="text-[10px] text-gray-600">Dibuat khusus bukan untuk umum.</p>
        </div>
      </footer>

    </div>
  );
}
