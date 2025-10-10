import { useState, useRef, useCallback } from 'react';
import { Upload, X, Video, FileVideo, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface UploadedVideo {
  file: File;
  preview: string;
  id: string;
  duration?: number;
  size: number;
}

interface VideoUploadProps {
  onVideosChange: (videos: File[]) => void;
  maxVideos?: number;
  maxSizeBytes?: number;
  acceptedTypes?: string[];
  className?: string;
}

export function VideoUpload({
  onVideosChange,
  maxVideos = 5,
  maxSizeBytes = 100 * 1024 * 1024, // 100MB
  acceptedTypes = ['video/mp4', 'video/webm', 'video/quicktime'],
  className,
}: VideoUploadProps) {
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const validFiles: File[] = [];
      const newVideos: UploadedVideo[] = [];

      fileArray.forEach((file) => {
        // Check file type
        if (!acceptedTypes.includes(file.type)) {
          console.warn(`File ${file.name} is not a supported video type`);
          return;
        }

        // Check file size
        if (file.size > maxSizeBytes) {
          console.warn(`File ${file.name} is too large (max ${maxSizeBytes / 1024 / 1024}MB)`);
          return;
        }

        // Check if we're under the max videos limit
        if (uploadedVideos.length + validFiles.length >= maxVideos) {
          console.warn(`Maximum ${maxVideos} videos allowed`);
          return;
        }

        validFiles.push(file);

        // Create preview URL
        const preview = URL.createObjectURL(file);
        const id = Math.random().toString(36).substr(2, 9);

        // Try to get video duration
        const video = document.createElement('video');
        video.src = preview;
        video.onloadedmetadata = () => {
          const duration = video.duration;
          setUploadedVideos((prev) => 
            prev.map(v => v.id === id ? { ...v, duration } : v)
          );
        };

        newVideos.push({
          file,
          preview,
          id,
          size: file.size,
        });
      });

      if (newVideos.length > 0) {
        setUploadedVideos((prev) => [...prev, ...newVideos]);
        const allFiles = [...uploadedVideos.map(vid => vid.file), ...validFiles];
        onVideosChange(allFiles);
      }
    },
    [uploadedVideos, maxVideos, maxSizeBytes, acceptedTypes, onVideosChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        processFiles(files);
      }
    },
    [processFiles]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        processFiles(files);
      }
      // Reset the input value so the same file can be selected again
      e.target.value = '';
    },
    [processFiles]
  );

  const removeVideo = useCallback(
    (videoId: string) => {
      setUploadedVideos((prev) => {
        const updated = prev.filter((vid) => vid.id !== videoId);
        const updatedFiles = updated.map(vid => vid.file);
        onVideosChange(updatedFiles);
        return updated;
      });
    },
    [onVideosChange]
  );

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragOver
            ? "border-primary bg-primary/5 text-primary"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
          uploadedVideos.length >= maxVideos && "opacity-50 cursor-not-allowed"
        )}
        data-testid="video-drop-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={uploadedVideos.length >= maxVideos}
          data-testid="video-file-input"
        />

        <div className="space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Upload className="w-6 h-6 text-muted-foreground" />
          </div>
          
          <div>
            <p className="text-sm font-medium">
              {isDragOver
                ? "Drop videos here"
                : "Drag and drop videos here, or click to select"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports MP4, WebM, MOV up to {maxSizeBytes / 1024 / 1024}MB each
              {uploadedVideos.length > 0 && ` (${uploadedVideos.length}/${maxVideos})`}
            </p>
          </div>

          {uploadedVideos.length < maxVideos && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={(e) => {
                e.stopPropagation();
                openFileDialog();
              }}
              data-testid="button-select-videos"
            >
              <Video className="w-4 h-4 mr-2" />
              Select Videos
            </Button>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Uploading videos...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} />
        </div>
      )}

      {/* Video Previews */}
      {uploadedVideos.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Selected Videos ({uploadedVideos.length})</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {uploadedVideos.map((video) => (
              <div
                key={video.id}
                className="relative group rounded-lg border bg-muted/30 overflow-hidden"
                data-testid={`video-preview-${video.id}`}
              >
                <div className="relative aspect-video bg-black/10">
                  <video
                    src={video.preview}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                      <Play className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
                
                <div className="p-2 space-y-1">
                  <p className="text-xs font-medium truncate" title={video.file.name}>
                    {video.file.name}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatFileSize(video.size)}</span>
                    {video.duration && <span>{formatDuration(video.duration)}</span>}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeVideo(video.id)}
                  data-testid={`button-remove-video-${video.id}`}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Messages */}
      {uploadedVideos.length >= maxVideos && (
        <p className="text-xs text-amber-600">
          Maximum {maxVideos} videos allowed. Remove some videos to add more.
        </p>
      )}
    </div>
  );
}
