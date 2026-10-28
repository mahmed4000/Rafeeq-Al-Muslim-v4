import { Platform } from 'react-native';
import { StorageService } from './storage';

let FileSystem: any = null;
try {
  FileSystem = require('expo-file-system');
} catch (e) {
  FileSystem = null;
}

const DOWNLOAD_STORAGE_KEY = 'almosala_downloaded_lessons';
const RESUME_STORAGE_KEY = 'almosala_lessons_resume_v1';
const MARKERS_STORAGE_KEY = 'almosala_lesson_markers_v1';

export interface DownloadedLessonRecord {
  lessonId: string;
  courseId: string;
  titleAr: string;
  scholarAr: string;
  audioUrl: string;
  localUri?: string;
  sizeMB: string;
  downloadedAt: string;
}

export interface LessonResumeRecord {
  courseId: string;
  lessonId: string;
  lessonNumber: number;
  lessonTitle: string;
  currentSecs: number;
  totalSecs: number;
  updatedAt: number;
}

export interface LessonMarker {
  id: string;
  courseId: string;
  lessonId: string;
  seconds: number;
  note: string;
  createdAt: number;
}

export const AudioService = {
  async getDownloadedLessons(): Promise<Record<string, DownloadedLessonRecord>> {
    return await StorageService.getObject<Record<string, DownloadedLessonRecord>>(DOWNLOAD_STORAGE_KEY, {});
  },

  async isLessonDownloaded(lessonId: string): Promise<boolean> {
    const list = await this.getDownloadedLessons();
    return !!list[lessonId];
  },

  async downloadLesson(
    course: any,
    lesson: any,
    onProgress?: (progressPct: number) => void
  ): Promise<DownloadedLessonRecord | null> {
    if (!lesson) return null;
    const lessonId = lesson.id;
    const url = lesson.audioUrl || course.audioStreamUrl;
    if (!url) return null;

    let localFileUri = url;
    const estSize = `${(14 + ((lesson.number * 3) % 9)).toFixed(1)} ميجابايت`;

    try {
      if (Platform.OS !== 'web' && FileSystem && FileSystem.documentDirectory) {
        const dir = `${FileSystem.documentDirectory}almosala_audio/`;
        const dirInfo = await FileSystem.getInfoAsync(dir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        }

        const targetFile = `${dir}${lessonId}.mp3`;
        const downloadResumable = FileSystem.createDownloadResumable(
          url,
          targetFile,
          {},
          (downloadProgress: any) => {
            const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            if (onProgress && !isNaN(progress)) {
              onProgress(Math.round(progress * 100));
            }
          }
        );

        const result = await downloadResumable.downloadAsync();
        if (result && result.uri) {
          localFileUri = result.uri;
        }
      } else {
        // Web fallback simulation
        if (onProgress) {
          onProgress(50);
          await new Promise((r) => setTimeout(r, 400));
          onProgress(100);
        }
      }

      const existing = await this.getDownloadedLessons();
      const record: DownloadedLessonRecord = {
        lessonId,
        courseId: course.id || 'course',
        titleAr: lesson.titleAr,
        scholarAr: course.scholarAr || 'المدرس بالحرم الشريف',
        audioUrl: url,
        localUri: localFileUri,
        sizeMB: estSize,
        downloadedAt: 'اليوم'
      };

      existing[lessonId] = record;
      await StorageService.setObject(DOWNLOAD_STORAGE_KEY, existing);
      return record;
    } catch (e) {
      console.warn('AudioService.downloadLesson error:', e);
      return null;
    }
  },

  async deleteDownloadedLesson(lessonId: string): Promise<void> {
    try {
      const existing = await this.getDownloadedLessons();
      const item = existing[lessonId];
      if (item && item.localUri && Platform.OS !== 'web' && FileSystem) {
        try {
          await FileSystem.deleteAsync(item.localUri, { idempotent: true });
        } catch (delErr) {}
      }
      delete existing[lessonId];
      await StorageService.setObject(DOWNLOAD_STORAGE_KEY, existing);
    } catch (e) {
      console.warn('AudioService.deleteDownloadedLesson error:', e);
    }
  },

  async getResumeRecords(): Promise<Record<string, LessonResumeRecord>> {
    return await StorageService.getObject<Record<string, LessonResumeRecord>>(RESUME_STORAGE_KEY, {});
  },

  async saveResumeProgress(
    courseId: string,
    lessonId: string,
    lessonNumber: number,
    lessonTitle: string,
    currentSecs: number,
    totalSecs: number
  ): Promise<void> {
    if (!courseId || !lessonId || currentSecs < 0) return;
    try {
      const existing = await this.getResumeRecords();
      existing[lessonId] = {
        courseId,
        lessonId,
        lessonNumber,
        lessonTitle,
        currentSecs,
        totalSecs,
        updatedAt: Date.now()
      };
      await StorageService.setObject(RESUME_STORAGE_KEY, existing);
    } catch (e) {
      console.warn('AudioService.saveResumeProgress error:', e);
    }
  },
  async getLessonResume(lessonId: string, courseId?: string): Promise<LessonResumeRecord | null> {
    const records = await this.getResumeRecords();
    return records[lessonId] || (courseId ? records[courseId] : null) || null;
  },
  async getLessonMarkers(courseId: string, lessonId: string): Promise<LessonMarker[]> {
    const records = await StorageService.getObject<Record<string, LessonMarker[]>>(MARKERS_STORAGE_KEY, {});
    return records[lessonId] || [];
  },
  async saveLessonMarker(marker: LessonMarker): Promise<void> {
    const records = await StorageService.getObject<Record<string, LessonMarker[]>>(MARKERS_STORAGE_KEY, {});
    records[marker.lessonId] = [marker, ...(records[marker.lessonId] || [])];
    await StorageService.setObject(MARKERS_STORAGE_KEY, records);
  },
  async deleteLessonMarker(lessonId: string, markerId: string): Promise<void> {
    const records = await StorageService.getObject<Record<string, LessonMarker[]>>(MARKERS_STORAGE_KEY, {});
    records[lessonId] = (records[lessonId] || []).filter((item) => item.id !== markerId);
    await StorageService.setObject(MARKERS_STORAGE_KEY, records);
  }
};
